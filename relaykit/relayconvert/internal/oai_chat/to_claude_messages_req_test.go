package oaichat

import (
	"context"
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOpenAIChatRequestToClaudeMessagesNormalizesToolInputSchema(t *testing.T) {
	tests := []struct {
		name       string
		parameters any
		wantSchema map[string]any
	}{
		{
			name:       "omitted parameters",
			parameters: nil,
			wantSchema: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
		},
		{
			name: "missing type and properties",
			parameters: map[string]any{
				"additionalProperties": false,
			},
			wantSchema: map[string]any{
				"type":                 "object",
				"properties":           map[string]any{},
				"additionalProperties": false,
			},
		},
		{
			name: "non-string type",
			parameters: map[string]any{
				"type":       123,
				"properties": map[string]any{},
			},
			wantSchema: map[string]any{
				"type":       123,
				"properties": map[string]any{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			maxTokens := uint(1024)
			got, err := OpenAIChatRequestToClaudeMessages(context.Background(), nil, dto.GeneralOpenAIRequest{
				Model:     "claude-test",
				MaxTokens: &maxTokens,
				Messages: []dto.Message{
					{Role: "user", Content: "Call the tool."},
				},
				Tools: []dto.ToolCallRequest{
					{
						Type: "function",
						Function: dto.FunctionRequest{
							Name:        "get_current_time",
							Description: "Get the current time",
							Parameters:  tt.parameters,
						},
					},
				},
			})

			require.NoError(t, err)
			tools, ok := got.Tools.([]any)
			require.True(t, ok)
			require.Len(t, tools, 1)
			tool, ok := tools[0].(*dto.Tool)
			require.True(t, ok)
			assert.Equal(t, "get_current_time", tool.Name)
			assert.Equal(t, tt.wantSchema, tool.InputSchema)
		})
	}
}

func TestOpenAIChatRequestToClaudeMessagesForwardsFileURLsAsURLSources(t *testing.T) {
	tests := []struct {
		name      string
		fileName  string
		wantType  string
		urlInData bool
	}{
		{name: "document", fileName: "report.pdf", wantType: "document"},
		{name: "plain text", fileName: "notes.txt", wantType: "document"},
		{name: "image", fileName: "shot.png", wantType: "image"},
		{name: "studio file_data url", fileName: "notes.txt", wantType: "document", urlInData: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			maxTokens := uint(1024)
			file := map[string]any{"filename": tt.fileName}
			if tt.urlInData {
				file["file_data"] = "https://files.example.com/a/b"
			} else {
				file["file_url"] = "https://files.example.com/a/b"
			}
			got, err := OpenAIChatRequestToClaudeMessages(context.Background(), nil, dto.GeneralOpenAIRequest{
				Model:     "claude-test",
				MaxTokens: &maxTokens,
				Messages: []dto.Message{
					{
						Role: "user",
						Content: []any{
							map[string]any{"type": "text", "text": "read this"},
							map[string]any{
								"type": "file",
								"file": file,
							},
						},
					},
				},
			})

			require.NoError(t, err)
			require.Len(t, got.Messages, 1)
			blocks, ok := got.Messages[0].Content.([]dto.ClaudeMediaMessage)
			require.True(t, ok)
			require.Len(t, blocks, 2)
			assert.Equal(t, tt.wantType, blocks[1].Type)
			require.NotNil(t, blocks[1].Source)
			assert.Equal(t, "url", blocks[1].Source.Type)
			assert.Equal(t, "https://files.example.com/a/b", blocks[1].Source.Url)
		})
	}
}
