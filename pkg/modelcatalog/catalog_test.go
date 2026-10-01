package modelcatalog

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const catalogFixture = `{
  "openai": {
    "models": {
      "gpt-6-sol": {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol",
        "attachment": true,
        "reasoning": true,
        "tool_call": true,
        "open_weights": false,
        "knowledge": "2026-04-20",
        "release_date": "2026-09-22",
        "modalities": {"input": ["text", "image", "pdf"], "output": ["text"]},
        "limit": {"context": 1050000, "output": 128000}
      }
    }
  },
  "lab": {
    "models": {
      "image-1": {
        "id": "image-1",
        "name": "Image One",
        "modalities": {"input": ["text"], "output": ["image"]},
        "limit": {"context": 32000, "output": 0}
      },
      "web-search-pro": {
        "id": "web-search-pro",
        "name": "Web Search Pro",
        "modalities": {"input": ["text"], "output": ["text"]},
        "limit": {"context": 128000, "output": 8192}
      }
    }
  }
}`

func TestParseCatalogNormalizesMetadata(t *testing.T) {
	entries, err := parseCatalog([]byte(catalogFixture))
	require.NoError(t, err)

	entry, ok := firstEntry(entries, "gpt-6-sol")
	require.True(t, ok)
	assert.Equal(t, 1050000, entry.ContextLength)
	assert.Equal(t, 128000, entry.MaxOutputTokens)
	assert.Equal(t, "2026-09-22", entry.ReleaseDate)
	assert.Equal(t, "2026-04-20", entry.KnowledgeCutoff)
	assert.Equal(t, []string{"file", "image", "text"}, entry.InputModalities)
	assert.Equal(t, []string{"text"}, entry.OutputModalities)
	assert.ElementsMatch(t, []string{"file_analysis", "reasoning", "tools", "vision"}, entry.Capabilities)
}

func TestParseCatalogDerivesOutputAndSearchCapabilities(t *testing.T) {
	entries, err := parseCatalog([]byte(catalogFixture))
	require.NoError(t, err)

	image, ok := firstEntry(entries, "image-1")
	require.True(t, ok)
	assert.Equal(t, []string{"image"}, image.OutputModalities)
	assert.Equal(t, []string{"image_generation"}, image.Capabilities)

	search, ok := firstEntry(entries, "web-search-pro")
	require.True(t, ok)
	assert.Equal(t, []string{"web_search"}, search.Capabilities)
}

func TestParseCatalogIndexesDisplayNames(t *testing.T) {
	entries, err := parseCatalog([]byte(catalogFixture))
	require.NoError(t, err)

	entry, ok := firstEntry(entries, normalizeKey("GPT-6 Sol"))
	require.True(t, ok)
	assert.Equal(t, "gpt-6-sol", entry.ID)

	_, err = parseCatalog([]byte("not-json"))
	require.Error(t, err)
}

func TestLookupPrefersVendorProvider(t *testing.T) {
	entries, err := parseCatalog([]byte(`{
  "openai": {"models": {"gpt-6-sol": {"id": "gpt-6-sol", "name": "GPT-6 Sol", "limit": {"context": 1000000, "output": 128000}}}},
  "reseller": {"models": {"gpt-6-sol": {"id": "gpt-6-sol", "name": "GPT-6 Sol", "limit": {"context": 400000, "output": 64000}}}}
}`))
	require.NoError(t, err)

	mu.Lock()
	index = entries
	mu.Unlock()
	t.Cleanup(func() {
		mu.Lock()
		index = nil
		mu.Unlock()
	})

	entry, ok := Lookup("gpt-6-sol", "OpenAI")
	require.True(t, ok)
	assert.Equal(t, 1000000, entry.ContextLength)

	entry, ok = Lookup("gpt-6-sol", "Reseller")
	require.True(t, ok)
	assert.Equal(t, 400000, entry.ContextLength)

	entry, ok = Lookup("GPT 6 Sol", "")
	require.True(t, ok)
	assert.Equal(t, "gpt-6-sol", entry.ID)
}

func firstEntry(index map[string][]Entry, key string) (Entry, bool) {
	entries, ok := index[key]
	if !ok || len(entries) == 0 {
		return Entry{}, false
	}
	return entries[0], true
}
