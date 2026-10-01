package objstore

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validConfig() Config {
	return Config{
		Endpoint:    "https://account.r2.cloudflarestorage.com",
		Bucket:      "my-bucket",
		AccessKeyID: "AKIAEXAMPLE",
		SecretKey:   "secret",
	}
}

func TestConfigValidate(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(config *Config)
		wantErr string
	}{
		{name: "minimal configuration is valid"},
		{
			name:    "endpoint is required",
			mutate:  func(config *Config) { config.Endpoint = "" },
			wantErr: "endpoint is required",
		},
		{
			name:    "endpoint must be absolute",
			mutate:  func(config *Config) { config.Endpoint = "account.r2.cloudflarestorage.com" },
			wantErr: "endpoint must be an absolute URL without userinfo",
		},
		{
			name:    "endpoint must not carry credentials",
			mutate:  func(config *Config) { config.Endpoint = "https://user:pass@account.r2.cloudflarestorage.com" },
			wantErr: "endpoint must be an absolute URL without userinfo",
		},
		{
			name:    "endpoint must use http or https",
			mutate:  func(config *Config) { config.Endpoint = "ftp://account.r2.cloudflarestorage.com" },
			wantErr: "endpoint must use http or https",
		},
		{
			name:    "endpoint must not keep surrounding whitespace",
			mutate:  func(config *Config) { config.Endpoint = " https://account.r2.cloudflarestorage.com" },
			wantErr: "endpoint must not contain surrounding whitespace",
		},
		{
			name:    "bucket is required",
			mutate:  func(config *Config) { config.Bucket = "" },
			wantErr: "bucket is required",
		},
		{
			name:    "bucket syntax is enforced",
			mutate:  func(config *Config) { config.Bucket = "My_Bucket" },
			wantErr: "bucket syntax is invalid",
		},
		{
			name:    "bucket must not be an ip address",
			mutate:  func(config *Config) { config.Bucket = "192.168.0.1" },
			wantErr: "bucket syntax is invalid",
		},
		{
			name:    "region syntax is enforced",
			mutate:  func(config *Config) { config.Region = "bad region" },
			wantErr: "region syntax is invalid",
		},
		{
			name:    "access key id is required",
			mutate:  func(config *Config) { config.AccessKeyID = "" },
			wantErr: "access key id is required",
		},
		{
			name:    "secret key is required",
			mutate:  func(config *Config) { config.SecretKey = "" },
			wantErr: "secret access key is required",
		},
		{
			name:    "public base url must be absolute",
			mutate:  func(config *Config) { config.PublicBaseURL = "/cdn" },
			wantErr: "public base URL must be an absolute URL without userinfo",
		},
		{
			name:   "optional region and public base url are accepted",
			mutate: func(config *Config) { config.Region = "auto"; config.PublicBaseURL = "https://cdn.example.com" },
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			config := validConfig()
			if test.mutate != nil {
				test.mutate(&config)
			}
			err := config.Validate()
			if test.wantErr == "" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), test.wantErr)
		})
	}
}

func TestPublicURL(t *testing.T) {
	tests := []struct {
		name   string
		config Config
		key    string
		want   string
	}{
		{
			name:   "endpoint path style url is used by default",
			config: Config{Endpoint: "https://account.r2.cloudflarestorage.com", Bucket: "my-bucket"},
			key:    "images/2026/a b.png",
			want:   "https://account.r2.cloudflarestorage.com/my-bucket/images/2026/a%20b.png",
		},
		{
			name:   "public base url wins over the endpoint",
			config: Config{Endpoint: "https://account.r2.cloudflarestorage.com", Bucket: "my-bucket", PublicBaseURL: "https://cdn.example.com/"},
			key:    "images/a.png",
			want:   "https://cdn.example.com/images/a.png",
		},
		{
			name:   "relative segments cannot escape the bucket",
			config: Config{Endpoint: "https://s3.example.com", Bucket: "my-bucket"},
			key:    "../../etc/passwd",
			want:   "https://s3.example.com/my-bucket/etc/passwd",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, test.want, PublicURL(test.config, test.key))
		})
	}
}
