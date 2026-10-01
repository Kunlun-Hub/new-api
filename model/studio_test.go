package model

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupStudioModelTest(t *testing.T) {
	t.Helper()
	originalDB := DB
	t.Cleanup(func() { DB = originalDB })
	var err error
	DB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, DB.AutoMigrate(&Midjourney{}, &StudioShare{}))
}

func TestStudioShareFeedMergesSourcesAndPaginates(t *testing.T) {
	setupStudioModelTest(t)

	works := []Midjourney{
		{Action: "IMAGINE", Status: "SUCCESS", Prompt: "wide --ar 16:9", ImageUrl: "https://example.com/a.png", FinishTime: 100},
		{Action: "IMAGINE", Status: "SUCCESS", PromptEn: "a video", VideoUrl: "https://example.com/b.mp4", SubmitTime: 50},
		{Action: "IMAGINE", Status: "FAILURE", Prompt: "failed", ImageUrl: "https://example.com/c.png", FinishTime: 300},
	}
	for i := range works {
		require.NoError(t, DB.Create(&works[i]).Error)
	}

	submitted, err := CreateStudioShare(7, StudioShareKindImage, StudioShareArtwork{
		Kind:   StudioShareKindImage,
		Status: "done",
		Url:    "https://example.com/share.png",
		Prompt: "shared artwork",
		Model:  "gpt-image",
	})
	require.NoError(t, err)

	// Anonymous visitors only see published works.
	anonymous, next, err := GetStudioShareFeed("", "", 10, 0, false)
	require.NoError(t, err)
	assert.Empty(t, next)
	require.Len(t, anonymous, 2)
	assert.Equal(t, StudioShareSourceMidjourney, anonymous[0].Source)
	assert.Equal(t, int64(100_000), anonymous[0].CreatedAt)
	assert.Equal(t, 1778, anonymous[0].Data.Width)
	assert.Equal(t, 1000, anonymous[0].Data.Height)

	// The author also sees the pending submission, newest first.
	owner, _, err := GetStudioShareFeed("", "", 10, 7, true)
	require.NoError(t, err)
	require.Len(t, owner, 3)
	assert.Equal(t, submitted.Id, owner[0].Id)
	assert.Equal(t, StudioShareStatusPending, owner[0].Status)

	// Midjourney works without a finish time fall back to the submit time and
	// the English prompt.
	videos, _, err := GetStudioShareFeed(StudioShareKindVideo, "", 10, 0, false)
	require.NoError(t, err)
	require.Len(t, videos, 1)
	assert.Equal(t, "a video", videos[0].Data.Prompt)
	assert.Equal(t, int64(50_000), videos[0].CreatedAt)

	// Paging walks the merged timeline without repeating or skipping items.
	first, cursor, err := GetStudioShareFeed("", "", 1, 0, false)
	require.NoError(t, err)
	require.Len(t, first, 1)
	require.NotEmpty(t, cursor)
	second, cursor, err := GetStudioShareFeed("", cursor, 1, 0, false)
	require.NoError(t, err)
	require.Len(t, second, 1)
	assert.NotEqual(t, first[0].Id, second[0].Id)
	assert.Empty(t, cursor)
}

func TestStudioShareReviewAndDelete(t *testing.T) {
	setupStudioModelTest(t)

	artwork := StudioShareArtwork{
		Kind:   StudioShareKindImage,
		Status: "done",
		Url:    "https://example.com/a.png",
		Prompt: "probe",
		Model:  "m",
	}
	share, err := CreateStudioShare(5, StudioShareKindImage, artwork)
	require.NoError(t, err)
	assert.Equal(t, StudioShareStatusPending, share.Status)

	mine, _, err := GetUserStudioShares(5, "", "", 10)
	require.NoError(t, err)
	require.Len(t, mine, 1)
	assert.Equal(t, share.Id, mine[0].Id)
	assert.Equal(t, "probe", mine[0].Data.Prompt)

	// Another author can neither publish nor delete the submission.
	foreign, err := ApproveStudioShare(share.Id, 6)
	require.NoError(t, err)
	assert.Nil(t, foreign)
	deleted, err := DeleteStudioShare(share.Id, 6)
	require.NoError(t, err)
	assert.False(t, deleted)

	approved, err := ApproveStudioShare(share.Id, 5)
	require.NoError(t, err)
	require.NotNil(t, approved)
	assert.Equal(t, StudioShareStatusApproved, approved.Status)
	assert.NotZero(t, approved.PublishedAt)

	deleted, err = DeleteStudioShare(share.Id, 5)
	require.NoError(t, err)
	assert.True(t, deleted)

	for range studioSharePendingLimit {
		_, err := CreateStudioShare(5, StudioShareKindImage, artwork)
		require.NoError(t, err)
	}
	_, err = CreateStudioShare(5, StudioShareKindImage, artwork)
	require.ErrorIs(t, err, ErrStudioSharePendingLimit)
}
