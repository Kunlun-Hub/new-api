package service

import (
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// studioUploadRoutePrefix is the public route that serves studio attachments
// kept by the gateway when the caller has no personal bucket configured.
const studioUploadRoutePrefix = "/api/studio/oss/file/"

// studioUploadObjectPattern matches gateway generated attachment keys such as
// `studio_chat/1790830736824_786ab12c.txt`. The extension is optional because
// uploaded files may have none.
var studioUploadObjectPattern = regexp.MustCompile(`^[a-z0-9_-]{1,32}/[0-9]{10,16}_[a-f0-9]{8}(?:\.[a-z0-9]{1,8})?$`)

// studioUploadRoot is the directory holding gateway attachments.
func studioUploadRoot() string {
	if root := os.Getenv("STUDIO_UPLOAD_DIR"); root != "" {
		return root
	}
	return filepath.Join("data", "studio-uploads")
}

// StudioUploadDir returns the directory holding attachments that stay on the
// gateway, creating it when needed.
func StudioUploadDir() (string, error) {
	root := studioUploadRoot()
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", err
	}
	return root, nil
}

// IsStudioUploadKey reports whether key is a gateway generated attachment name.
func IsStudioUploadKey(key string) bool {
	return studioUploadObjectPattern.MatchString(key)
}

// StudioUploadLocalPath resolves a gateway attachment URL to the file on disk.
// Relay requests must not fetch these URLs over the network: the gateway is
// usually reachable only on a private address or a non-standard port, and the
// content is already local.
func StudioUploadLocalPath(rawURL string) (string, bool) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", false
	}
	key, ok := strings.CutPrefix(parsed.Path, studioUploadRoutePrefix)
	if !ok || !IsStudioUploadKey(key) {
		return "", false
	}
	fullPath := filepath.Join(studioUploadRoot(), filepath.FromSlash(key))
	info, err := os.Stat(fullPath)
	if err != nil || info.IsDir() {
		return "", false
	}
	return fullPath, true
}
