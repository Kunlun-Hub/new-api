// Package objstore talks to S3-compatible object storage (Cloudflare R2,
// Alibaba Cloud OSS, Tencent COS, AWS S3, MinIO, ...).
package objstore

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"

	"github.com/QuantumNous/new-api/relaykit/dto"
)

// DefaultRegion is used when the bucket configuration leaves the region empty.
// Cloudflare R2 uses "auto"; most other providers accept an explicit region.
const DefaultRegion = "auto"

const requestTimeout = 20 * time.Second

// ErrNotFound reports that the requested object does not exist in the bucket.
var ErrNotFound = errors.New("object not found")

var (
	bucketPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$`)
	regionPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)
)

// Config is a validated S3-compatible bucket configuration.
type Config struct {
	Endpoint      string
	Bucket        string
	Region        string
	AccessKeyID   string
	SecretKey     string
	PublicBaseURL string
}

// FromDTO converts a stored user setting into a storage configuration.
func FromDTO(config *dto.UserStorageConfig) Config {
	if config == nil {
		return Config{}
	}
	return Config{
		Endpoint:      config.Endpoint,
		Bucket:        config.Bucket,
		Region:        config.Region,
		AccessKeyID:   config.AccessKeyID,
		SecretKey:     config.SecretKey,
		PublicBaseURL: config.PublicBaseURL,
	}
}

// Validate performs syntax checks only. It never resolves hosts or contacts an
// endpoint; use Verify for a live connectivity and permission check.
func (config Config) Validate() error {
	if err := validateEndpoint(config.Endpoint); err != nil {
		return err
	}
	if config.Bucket == "" {
		return errors.New("bucket is required")
	}
	if !bucketPattern.MatchString(config.Bucket) || strings.Contains(config.Bucket, "..") || net.ParseIP(config.Bucket) != nil {
		return errors.New("bucket syntax is invalid")
	}
	if config.Region != "" && !regionPattern.MatchString(config.Region) {
		return errors.New("region syntax is invalid")
	}
	if config.AccessKeyID == "" {
		return errors.New("access key id is required")
	}
	if config.AccessKeyID != strings.TrimSpace(config.AccessKeyID) {
		return errors.New("access key id must not contain surrounding whitespace")
	}
	if config.SecretKey == "" {
		return errors.New("secret access key is required")
	}
	if config.SecretKey != strings.TrimSpace(config.SecretKey) {
		return errors.New("secret access key must not contain surrounding whitespace")
	}
	if config.PublicBaseURL != "" {
		parsed, err := url.Parse(config.PublicBaseURL)
		if err != nil || parsed.Host == "" || parsed.User != nil {
			return errors.New("public base URL must be an absolute URL without userinfo")
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return errors.New("public base URL must use http or https")
		}
	}
	return nil
}

func validateEndpoint(endpoint string) error {
	if endpoint == "" {
		return errors.New("endpoint is required")
	}
	if endpoint != strings.TrimSpace(endpoint) {
		return errors.New("endpoint must not contain surrounding whitespace")
	}
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Host == "" || parsed.User != nil || parsed.Opaque != "" {
		return errors.New("endpoint must be an absolute URL without userinfo")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return errors.New("endpoint must use http or https")
	}
	if parsed.RawQuery != "" || parsed.ForceQuery || parsed.Fragment != "" {
		return errors.New("endpoint must not contain a query or fragment")
	}
	return nil
}

func (config Config) region() string {
	if config.Region == "" {
		return DefaultRegion
	}
	return config.Region
}

// NewClient builds an S3 client for the configuration. Path-style addressing is
// used because every supported provider accepts it.
func NewClient(config Config) *s3.Client {
	awsConfig := aws.Config{
		Region:      config.region(),
		Credentials: credentials.NewStaticCredentialsProvider(config.AccessKeyID, config.SecretKey, ""),
		HTTPClient:  &http.Client{Timeout: requestTimeout},
	}
	return s3.NewFromConfig(awsConfig, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(config.Endpoint)
		options.UsePathStyle = true
	})
}

// Verify writes a temporary object and deletes it again, which proves that the
// credentials work, the bucket exists and the key survives a round trip.
func Verify(ctx context.Context, config Config) error {
	if err := config.Validate(); err != nil {
		return err
	}
	client := NewClient(config)
	key := fmt.Sprintf(".new-api-verify-%d.txt", time.Now().UnixNano())
	body := strings.NewReader("new-api storage verification")
	putCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	if _, err := client.PutObject(putCtx, &s3.PutObjectInput{
		Bucket:      aws.String(config.Bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String("text/plain"),
	}); err != nil {
		return fmt.Errorf("write test object failed: %w", err)
	}
	deleteCtx, cancelDelete := context.WithTimeout(ctx, requestTimeout)
	defer cancelDelete()
	if _, err := client.DeleteObject(deleteCtx, &s3.DeleteObjectInput{
		Bucket: aws.String(config.Bucket),
		Key:    aws.String(key),
	}); err != nil {
		return fmt.Errorf("delete test object failed: %w", err)
	}
	return nil
}

// Put uploads an object and returns the URL clients should use to read it.
func Put(ctx context.Context, config Config, key string, contentType string, body io.Reader, size int64) (string, error) {
	if err := config.Validate(); err != nil {
		return "", err
	}
	client := NewClient(config)
	putCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	input := &s3.PutObjectInput{
		Bucket: aws.String(config.Bucket),
		Key:    aws.String(key),
		Body:   body,
	}
	if contentType != "" {
		input.ContentType = aws.String(contentType)
	}
	if size >= 0 {
		input.ContentLength = aws.Int64(size)
	}
	if _, err := client.PutObject(putCtx, input); err != nil {
		return "", err
	}
	return PublicURL(config, key), nil
}

// ObjectInfo describes a stored object without downloading it.
type ObjectInfo struct {
	Size         int64
	LastModified time.Time
}

func isMissingObject(err error) bool {
	if err == nil {
		return false
	}
	var apiError smithy.APIError
	if errors.As(err, &apiError) {
		switch apiError.ErrorCode() {
		case "NoSuchKey", "NotFound", "404":
			return true
		}
	}
	return false
}

// Head returns the metadata of an object, or ErrNotFound when it is absent.
func Head(ctx context.Context, config Config, key string) (ObjectInfo, error) {
	if err := config.Validate(); err != nil {
		return ObjectInfo{}, err
	}
	client := NewClient(config)
	headCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	output, err := client.HeadObject(headCtx, &s3.HeadObjectInput{
		Bucket: aws.String(config.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		if isMissingObject(err) {
			return ObjectInfo{}, ErrNotFound
		}
		return ObjectInfo{}, err
	}
	info := ObjectInfo{}
	if output.ContentLength != nil {
		info.Size = *output.ContentLength
	}
	if output.LastModified != nil {
		info.LastModified = *output.LastModified
	}
	return info, nil
}

// Get downloads an object, or returns ErrNotFound when it is absent.
func Get(ctx context.Context, config Config, key string) (io.ReadCloser, ObjectInfo, error) {
	if err := config.Validate(); err != nil {
		return nil, ObjectInfo{}, err
	}
	client := NewClient(config)
	getCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	output, err := client.GetObject(getCtx, &s3.GetObjectInput{
		Bucket: aws.String(config.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		cancel()
		if isMissingObject(err) {
			return nil, ObjectInfo{}, ErrNotFound
		}
		return nil, ObjectInfo{}, err
	}
	info := ObjectInfo{}
	if output.ContentLength != nil {
		info.Size = *output.ContentLength
	}
	if output.LastModified != nil {
		info.LastModified = *output.LastModified
	}
	return readCloserWithCancel{ReadCloser: output.Body, cancel: cancel}, info, nil
}

// readCloserWithCancel releases the request timeout when the body is closed.
type readCloserWithCancel struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (reader readCloserWithCancel) Close() error {
	err := reader.ReadCloser.Close()
	reader.cancel()
	return err
}

// PublicURL resolves the readable URL of an object, preferring the configured
// public base URL (custom domain or CDN) over the bucket endpoint.
func PublicURL(config Config, key string) string {
	if config.PublicBaseURL != "" {
		return strings.TrimSuffix(config.PublicBaseURL, "/") + "/" + escapeKey(key)
	}
	base := strings.TrimSuffix(config.Endpoint, "/")
	return base + "/" + config.Bucket + "/" + escapeKey(key)
}

func escapeKey(key string) string {
	segments := strings.Split(path.Clean("/"+key), "/")
	escaped := make([]string, 0, len(segments))
	for _, segment := range segments {
		if segment == "" {
			continue
		}
		escaped = append(escaped, url.PathEscape(segment))
	}
	return strings.Join(escaped, "/")
}
