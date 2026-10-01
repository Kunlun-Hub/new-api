package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ErrStudioVideoCoverUnavailable reports that no ffmpeg executable was found,
// so the gateway cannot render poster frames itself.
var ErrStudioVideoCoverUnavailable = errors.New("ffmpeg is not installed")

// studioVideoCoverFilter picks a representative frame of the first hundred
// ones and scales it into a 640px box.
const studioVideoCoverFilter = "thumbnail=100,scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2"

// studioVideoCoverMinBytes rejects empty renders; a blank frame compresses to
// a few hundred bytes.
const studioVideoCoverMinBytes = 512

// StudioVideoCover is one poster frame rendered by the gateway.
type StudioVideoCover struct {
	Data        []byte
	Ext         string
	ContentType string
}

type studioVideoCoverEncoder struct {
	ext         string
	contentType string
	args        []string
}

var studioVideoCoverEncoders = []studioVideoCoverEncoder{
	{".webp", "image/webp", []string{"-c:v", "libwebp", "-quality", "80", "-f", "webp"}},
	{".jpg", "image/jpeg", []string{"-c:v", "mjpeg", "-q:v", "4", "-f", "mjpeg"}},
}

// ffmpegBinary resolves the ffmpeg executable, honouring STUDIO_FFMPEG_PATH
// for deployments that ship it outside PATH.
func ffmpegBinary() (string, error) {
	if configured := strings.TrimSpace(os.Getenv("STUDIO_FFMPEG_PATH")); configured != "" {
		info, err := os.Stat(configured)
		if err != nil || info.IsDir() {
			return "", fmt.Errorf("%w: %s", ErrStudioVideoCoverUnavailable, configured)
		}
		return configured, nil
	}
	binary, err := exec.LookPath("ffmpeg")
	if err != nil {
		return "", ErrStudioVideoCoverUnavailable
	}
	return binary, nil
}

// GenerateStudioVideoCover renders a poster frame from a local video file.
// The browser cannot decode every codec it plays, so the gateway renders the
// frame with ffmpeg instead. WebP is preferred, JPEG covers builds without
// libwebp, and a one second seek retries sources whose opening frames are
// unusable.
func GenerateStudioVideoCover(ctx context.Context, videoPath string) (*StudioVideoCover, error) {
	binary, err := ffmpegBinary()
	if err != nil {
		return nil, err
	}
	dir, err := os.MkdirTemp("", "studio-video-cover-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	for _, seek := range []string{"", "1"} {
		for _, encoder := range studioVideoCoverEncoders {
			outPath := filepath.Join(dir, "cover"+encoder.ext)
			args := []string{"-hide_banner", "-loglevel", "error", "-nostdin", "-y"}
			if seek != "" {
				args = append(args, "-ss", seek)
			}
			args = append(args,
				"-i", videoPath,
				"-map", "0:v:0",
				"-vf", studioVideoCoverFilter,
				"-frames:v", "1",
				"-an", "-sn",
			)
			args = append(args, encoder.args...)
			args = append(args, outPath)

			command := exec.CommandContext(ctx, binary, args...)
			var stderr bytes.Buffer
			command.Stderr = &stderr
			if err := command.Run(); err != nil {
				continue
			}
			data, err := os.ReadFile(outPath)
			if err != nil || len(data) < studioVideoCoverMinBytes {
				continue
			}
			return &StudioVideoCover{
				Data:        data,
				Ext:         encoder.ext,
				ContentType: encoder.contentType,
			}, nil
		}
	}
	return nil, errors.New("ffmpeg could not render a video frame")
}
