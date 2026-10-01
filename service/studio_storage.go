package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/service/objstore"
)

// StudioMediaTarget describes where one studio media object is written. A nil
// bucket config keeps the object on the gateway, which is the fallback when the
// caller has no personal bucket.
type StudioMediaTarget struct {
	Config       *objstore.Config
	Scene        string
	Ext          string
	ContentType  string
	Size         int64
	LocalURLBase string
}

// StudioObjectKey builds the random object name shared by every studio upload:
// `<scene>/<unixMilli>_<8 hex><ext>`.
func StudioObjectKey(scene string, ext string) (string, error) {
	seed := make([]byte, 4)
	if _, err := rand.Read(seed); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s/%d_%s%s", scene, time.Now().UnixMilli(), hex.EncodeToString(seed), ext), nil
}

// StoreStudioMedia persists one studio media object and returns its public URL
// together with the storage key.
func StoreStudioMedia(ctx context.Context, target StudioMediaTarget, data io.Reader) (string, string, error) {
	key, err := StudioObjectKey(target.Scene, target.Ext)
	if err != nil {
		return "", "", err
	}

	if target.Config != nil {
		if _, err := objstore.Put(ctx, *target.Config, key, target.ContentType, data, target.Size); err != nil {
			return "", "", err
		}
		return objstore.PublicURL(*target.Config, key), key, nil
	}

	dir, err := StudioUploadDir()
	if err != nil {
		return "", "", err
	}
	fullPath := filepath.Join(dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return "", "", err
	}
	file, err := os.Create(fullPath)
	if err != nil {
		return "", "", err
	}
	if _, err := io.Copy(file, data); err != nil {
		file.Close()
		return "", "", err
	}
	if err := file.Close(); err != nil {
		return "", "", err
	}
	return strings.TrimSuffix(target.LocalURLBase, "/") + studioUploadRoutePrefix + key, key, nil
}
