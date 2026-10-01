// Package modelcatalog fetches public model metadata (context window, output
// limit, release date, modalities, capabilities) from a models.dev compatible
// catalog and exposes it as a lookup table for pricing responses.
package modelcatalog

import (
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	defaultCatalogURL = "https://models.dev/api.json"
	// maxCatalogBytes bounds the response body so a broken or hostile endpoint
	// cannot exhaust memory.
	maxCatalogBytes = 64 << 20
	refreshInterval = 6 * time.Hour
	retryInterval   = 10 * time.Minute
	fetchTimeout    = 30 * time.Second
)

// Entry is the normalized metadata of a single model.
type Entry struct {
	Provider         string   `json:"-"`
	ID               string   `json:"id"`
	Name             string   `json:"name,omitempty"`
	ContextLength    int      `json:"context_length,omitempty"`
	MaxOutputTokens  int      `json:"max_output_tokens,omitempty"`
	ReleaseDate      string   `json:"release_date,omitempty"`
	KnowledgeCutoff  string   `json:"knowledge_cutoff,omitempty"`
	InputModalities  []string `json:"input_modalities,omitempty"`
	OutputModalities []string `json:"output_modalities,omitempty"`
	Capabilities     []string `json:"capabilities,omitempty"`
}

type catalogModel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ReleaseDate string `json:"release_date"`
	Knowledge   string `json:"knowledge"`
	Attachment  bool   `json:"attachment"`
	Reasoning   bool   `json:"reasoning"`
	ToolCall    bool   `json:"tool_call"`
	OpenWeights bool   `json:"open_weights"`
	Modalities  struct {
		Input  []string `json:"input"`
		Output []string `json:"output"`
	} `json:"modalities"`
	Limit struct {
		Context int `json:"context"`
		Output  int `json:"output"`
	} `json:"limit"`
}

type catalogProvider struct {
	Models map[string]catalogModel `json:"models"`
}

var (
	mu      sync.RWMutex
	index   map[string][]Entry
	attempt time.Time
	// inflight guards a single background refresh.
	inflight bool
)

// Start warms the catalog in the background. Safe to call once at startup.
func Start() {
	if !Enabled() {
		return
	}
	go func() {
		_ = Refresh()
	}()
}

// Enabled reports whether catalog lookups are configured for this instance.
func Enabled() bool {
	return !common.GetEnvOrDefaultBool("MODEL_CATALOG_DISABLED", false)
}

func catalogURL() string {
	return common.GetEnvOrDefaultString("MODEL_CATALOG_URL", defaultCatalogURL)
}

// Lookup returns the metadata of a model by name. When several providers
// publish the same model, the entry from the provider matching vendorName wins.
// The catalog is loaded lazily in the background; the first calls after startup
// may miss until it arrives.
func Lookup(modelName, vendorName string) (Entry, bool) {
	name := strings.TrimSpace(modelName)
	if name == "" || !Enabled() {
		return Entry{}, false
	}
	ensureFresh()
	mu.RLock()
	defer mu.RUnlock()
	if len(index) == 0 {
		return Entry{}, false
	}
	candidates, ok := index[strings.ToLower(name)]
	if !ok {
		candidates, ok = index[normalizeKey(name)]
	}
	if !ok || len(candidates) == 0 {
		return Entry{}, false
	}
	if len(candidates) > 1 && strings.TrimSpace(vendorName) != "" {
		vendor := normalizeKey(vendorName)
		for _, candidate := range candidates {
			if normalizeKey(candidate.Provider) == vendor {
				return candidate, true
			}
		}
	}
	return candidates[0], true
}

// Refresh forces a synchronous reload. It is used by tests and admin tooling.
func Refresh() error {
	return load()
}

func ensureFresh() {
	mu.Lock()
	stale := index == nil
	if !stale {
		if time.Since(attempt) > refreshInterval {
			stale = true
		} else if len(index) == 0 && time.Since(attempt) > retryInterval {
			stale = true
		}
	}
	if stale && !inflight {
		inflight = true
		go func() {
			_ = load()
			mu.Lock()
			inflight = false
			mu.Unlock()
		}()
	}
	mu.Unlock()
}

func load() error {
	client := &http.Client{Timeout: fetchTimeout}
	resp, err := client.Get(catalogURL())
	if err != nil {
		recordAttempt(nil)
		return fmt.Errorf("fetch model catalog: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		recordAttempt(nil)
		return fmt.Errorf("fetch model catalog: unexpected status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxCatalogBytes))
	if err != nil {
		recordAttempt(nil)
		return fmt.Errorf("read model catalog: %w", err)
	}
	parsed, err := parseCatalog(body)
	if err != nil {
		recordAttempt(nil)
		return err
	}
	recordAttempt(parsed)
	return nil
}

func recordAttempt(parsed map[string][]Entry) {
	mu.Lock()
	defer mu.Unlock()
	attempt = time.Now()
	// Keep the previous snapshot when a refresh fails so pricing keeps serving
	// the last known metadata.
	if parsed != nil {
		index = parsed
	}
}

func parseCatalog(body []byte) (map[string][]Entry, error) {
	var providers map[string]catalogProvider
	if err := common.Unmarshal(body, &providers); err != nil {
		return nil, fmt.Errorf("decode model catalog: %w", err)
	}
	names := make([]string, 0, len(providers))
	for name := range providers {
		names = append(names, name)
	}
	sort.Strings(names)

	byID := make(map[string][]Entry)
	byKey := make(map[string][]Entry)
	add := func(target map[string][]Entry, key string, entry Entry) {
		if key == "" {
			return
		}
		for _, existing := range target[key] {
			if existing.Provider == entry.Provider {
				return
			}
		}
		target[key] = append(target[key], entry)
	}
	for _, providerName := range names {
		models := providers[providerName].Models
		modelIDs := make([]string, 0, len(models))
		for id := range models {
			modelIDs = append(modelIDs, id)
		}
		sort.Strings(modelIDs)
		for _, modelID := range modelIDs {
			entry := buildEntry(providerName, modelID, models[modelID])
			add(byID, entry.ID, entry)
			add(byKey, normalizeKey(entry.Name), entry)
		}
	}
	for key, candidates := range byKey {
		for _, candidate := range candidates {
			add(byID, key, candidate)
		}
	}
	return byID, nil
}

func buildEntry(providerName, modelID string, raw catalogModel) Entry {
	entry := Entry{
		Provider:         providerName,
		ID:               strings.ToLower(strings.TrimSpace(modelID)),
		Name:             strings.TrimSpace(raw.Name),
		ContextLength:    raw.Limit.Context,
		MaxOutputTokens:  raw.Limit.Output,
		ReleaseDate:      strings.TrimSpace(raw.ReleaseDate),
		KnowledgeCutoff:  strings.TrimSpace(raw.Knowledge),
		InputModalities:  normalizeModalities(raw.Modalities.Input),
		OutputModalities: normalizeModalities(raw.Modalities.Output),
	}
	entry.Capabilities = buildCapabilities(modelID, raw, entry.InputModalities, entry.OutputModalities)
	return entry
}

func normalizeModalities(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		modality := strings.ToLower(strings.TrimSpace(value))
		switch modality {
		case "pdf":
			modality = "file"
		case "text", "image", "audio", "video", "file":
		default:
			continue
		}
		if _, exists := seen[modality]; exists {
			continue
		}
		seen[modality] = struct{}{}
		out = append(out, modality)
	}
	sort.Strings(out)
	return out
}

func buildCapabilities(modelID string, raw catalogModel, input, output []string) []string {
	var capabilities []string
	appendCapability := func(name string) {
		for _, existing := range capabilities {
			if existing == name {
				return
			}
		}
		capabilities = append(capabilities, name)
	}
	if contains(input, "image") || contains(input, "video") {
		appendCapability("vision")
	}
	if raw.Attachment || contains(input, "file") {
		appendCapability("file_analysis")
	}
	if raw.Reasoning {
		appendCapability("reasoning")
	}
	if raw.ToolCall {
		appendCapability("tools")
	}
	if contains(output, "image") || contains(output, "video") {
		appendCapability("image_generation")
	}
	if strings.Contains(strings.ToLower(modelID), "search") {
		appendCapability("web_search")
	}
	if raw.OpenWeights {
		appendCapability("open_weights")
	}
	sort.Strings(capabilities)
	return capabilities
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func normalizeKey(value string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(value) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}
