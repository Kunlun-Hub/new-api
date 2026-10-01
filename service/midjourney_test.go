package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveMidjourneyMode(t *testing.T) {
	tests := []struct {
		name        string
		requestMode string
		prompt      string
		expected    string
	}{
		{name: "explicit request mode wins", requestMode: "relax", prompt: "a cat", expected: MjModeRelax},
		{name: "explicit mode beats prompt flag", requestMode: "turbo", prompt: "a cat --relax", expected: MjModeTurbo},
		{name: "relax prompt flag", prompt: "a cat --relax", expected: MjModeRelax},
		{name: "turbo prompt flag", prompt: "a cat --TURBO", expected: MjModeTurbo},
		{name: "fast prompt flag", prompt: "a cat --fast", expected: MjModeFast},
		{name: "midjourney default is fast", prompt: "a cat", expected: MjModeFast},
		{name: "blank prompt keeps the default", prompt: "", expected: MjModeFast},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			require.Equal(t, test.expected, ResolveMidjourneyMode(test.requestMode, test.prompt))
		})
	}
}
