package model

import (
	"errors"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// StudioShareKind identifies the media type of a published studio work.
const (
	StudioShareKindImage = "image"
	StudioShareKindVideo = "video"
)

// Studio share lifecycle states, mirroring the reference site's flow: a work is
// submitted for review first and only becomes public once its author approves
// it from the discover gallery.
const (
	StudioShareStatusPending  = 1
	StudioShareStatusApproved = 2
)

// StudioShareSource tells whether a gallery item is a visitor submission or a
// Midjourney work that predates the sharing flow.
const (
	StudioShareSourceShare      = "share"
	StudioShareSourceMidjourney = "midjourney"
)

// studioSharePendingLimit is how many works one visitor may keep waiting for
// review at the same time.
const studioSharePendingLimit = 20

// StudioShareDataMaxBytes caps the serialized artwork stored with a submission.
const StudioShareDataMaxBytes = 256 << 10

// ErrStudioSharePendingLimit reports that a visitor already has the maximum
// number of works waiting for review.
var ErrStudioSharePendingLimit = errors.New("pending studio shares reached the limit")

// StudioShareArtwork is the artwork snapshot stored with a submission. Cookie
// level fields mirror the browser record so the gallery can render a submitted
// work without the author's IndexedDB.
type StudioShareArtwork struct {
	Kind      string         `json:"kind"`
	Status    string         `json:"status"`
	Url       string         `json:"url"`
	CoverUrl  string         `json:"coverUrl,omitempty"`
	Width     int            `json:"width"`
	Height    int            `json:"height"`
	Prompt    string         `json:"prompt"`
	Model     string         `json:"model"`
	Provider  string         `json:"provider,omitempty"`
	SchemaId  string         `json:"schemaId,omitempty"`
	Params    map[string]any `json:"params"`
	Values    map[string]any `json:"values"`
	RefImages []string       `json:"refImages,omitempty"`
	CreatedAt int64          `json:"createdAt"`
}

// StudioShare is one submitted work waiting for review or already published.
type StudioShare struct {
	Id          int    `json:"id" gorm:"primaryKey"`
	UserId      int    `json:"user_id" gorm:"index"`
	Kind        string `json:"kind" gorm:"type:varchar(16);index"`
	Status      int    `json:"status" gorm:"index"`
	Data        string `json:"-" gorm:"type:text"`
	CreatedAt   int64  `json:"created_at" gorm:"index"`
	UpdatedAt   int64  `json:"updated_at"`
	PublishedAt int64  `json:"published_at"`
}

// StudioShareDetail is the API payload of one work in the studio gallery.
type StudioShareDetail struct {
	Id          int                `json:"id"`
	Source      string             `json:"source"`
	Kind        string             `json:"kind"`
	Status      int                `json:"status"`
	Data        StudioShareArtwork `json:"data"`
	CreatedAt   int64              `json:"created_at"`
	PublishedAt int64              `json:"published_at"`
	// Owner is true when the viewer submitted the work, so the gallery may
	// expose the review and delete actions.
	Owner bool `json:"owner"`
}

// StudioFeedCursor is the position of one item inside the merged gallery feed.
// Rank separates the two sources that share the timeline.
type StudioFeedCursor struct {
	Timestamp int64
	Rank      int
	Id        int
}

const (
	studioFeedRankShare      = 0
	studioFeedRankMidjourney = 1
)

// ParseStudioFeedCursor reads the opaque cursor returned by a previous page.
func ParseStudioFeedCursor(raw string) *StudioFeedCursor {
	parts := strings.Split(raw, ":")
	if len(parts) != 3 {
		return nil
	}
	timestamp, timestampErr := strconv.ParseInt(parts[0], 10, 64)
	rank, rankErr := strconv.Atoi(parts[1])
	id, idErr := strconv.Atoi(parts[2])
	if timestampErr != nil || rankErr != nil || idErr != nil {
		return nil
	}
	return &StudioFeedCursor{Timestamp: timestamp, Rank: rank, Id: id}
}

func (cursor *StudioFeedCursor) String() string {
	if cursor == nil {
		return ""
	}
	return strconv.FormatInt(cursor.Timestamp, 10) + ":" + strconv.Itoa(cursor.Rank) + ":" + strconv.Itoa(cursor.Id)
}

// studioFeedRank orders items that share a timestamp; submissions come first.
func studioFeedRank(source string) int {
	if source == StudioShareSourceMidjourney {
		return studioFeedRankMidjourney
	}
	return studioFeedRankShare
}

// applyStudioFeedCursor keeps only the rows that come after the cursor.
func applyStudioFeedCursor(query *gorm.DB, column string, rank int, cursor *StudioFeedCursor) *gorm.DB {
	if cursor == nil {
		return query
	}
	switch {
	case rank > cursor.Rank:
		return query.Where(column+" <= ?", cursor.Timestamp)
	case rank == cursor.Rank:
		return query.Where(column+" < ? OR ("+column+" = ? AND id < ?)", cursor.Timestamp, cursor.Timestamp, cursor.Id)
	default:
		return query.Where(column+" < ?", cursor.Timestamp)
	}
}

// Detail decodes the stored artwork of one submission. The viewer id drives
// the ownership flag the gallery uses to expose management actions.
func (share *StudioShare) Detail(viewerId int) (StudioShareDetail, error) {
	artwork := StudioShareArtwork{}
	if err := common.UnmarshalJsonStr(share.Data, &artwork); err != nil {
		return StudioShareDetail{}, err
	}
	if artwork.Params == nil {
		artwork.Params = map[string]any{}
	}
	if artwork.Values == nil {
		artwork.Values = map[string]any{}
	}
	return StudioShareDetail{
		Id:          share.Id,
		Source:      StudioShareSourceShare,
		Kind:        share.Kind,
		Status:      share.Status,
		Data:        artwork,
		CreatedAt:   share.CreatedAt,
		PublishedAt: share.PublishedAt,
		Owner:       viewerId > 0 && viewerId == share.UserId,
	}, nil
}

// CreateStudioShare stores one submission and returns its pending record.
func CreateStudioShare(userId int, kind string, artwork StudioShareArtwork) (*StudioShare, error) {
	var pending int64
	if err := DB.Model(&StudioShare{}).
		Where("user_id = ? AND status = ?", userId, StudioShareStatusPending).
		Count(&pending).Error; err != nil {
		return nil, err
	}
	if pending >= studioSharePendingLimit {
		return nil, ErrStudioSharePendingLimit
	}

	payload, err := common.Marshal(artwork)
	if err != nil {
		return nil, err
	}
	now := time.Now().UnixMilli()
	share := &StudioShare{
		UserId:    userId,
		Kind:      kind,
		Status:    StudioShareStatusPending,
		Data:      string(payload),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := DB.Create(share).Error; err != nil {
		return nil, err
	}
	return share, nil
}

// GetStudioShareById loads one submission; it returns nil when it is missing.
func GetStudioShareById(id int) (*StudioShare, error) {
	share := &StudioShare{}
	err := DB.Where("id = ?", id).First(share).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return share, nil
}

// DeleteStudioShare removes one submission owned by the caller.
func DeleteStudioShare(id int, userId int) (bool, error) {
	result := DB.Where("id = ? AND user_id = ?", id, userId).Delete(&StudioShare{})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

// ApproveStudioShare publishes a pending submission of the caller.
func ApproveStudioShare(id int, userId int) (*StudioShare, error) {
	share, err := GetStudioShareById(id)
	if err != nil || share == nil {
		return nil, err
	}
	if share.UserId != userId {
		return nil, nil
	}
	if share.Status != StudioShareStatusApproved {
		now := time.Now().UnixMilli()
		if err := DB.Model(&StudioShare{}).
			Where("id = ? AND user_id = ?", id, userId).
			Updates(map[string]any{
				"status":       StudioShareStatusApproved,
				"published_at": now,
				"updated_at":   now,
			}).Error; err != nil {
			return nil, err
		}
		share.Status = StudioShareStatusApproved
		share.PublishedAt = now
		share.UpdatedAt = now
	}
	return share, nil
}

// listStudioShareRows lists published submissions of the discover feed.
func listStudioShareRows(kind string, cursor *StudioFeedCursor, limit int, viewerId int, includePending bool) ([]StudioShareDetail, error) {
	query := DB.Model(&StudioShare{})
	if kind != "" {
		query = query.Where("kind = ?", kind)
	}
	if includePending && viewerId > 0 {
		query = query.Where("status = ? OR (user_id = ? AND status = ?)", StudioShareStatusApproved, viewerId, StudioShareStatusPending)
	} else {
		query = query.Where("status = ?", StudioShareStatusApproved)
	}
	query = applyStudioFeedCursor(query, "created_at", studioFeedRankShare, cursor)

	var rows []*StudioShare
	if err := query.Order("created_at desc, id desc").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]StudioShareDetail, 0, len(rows))
	for _, row := range rows {
		detail, err := row.Detail(viewerId)
		if err != nil {
			return nil, err
		}
		items = append(items, detail)
	}
	return items, nil
}

// listMidjourneyWorks lists Midjourney works that predate the sharing flow so
// existing installations keep showing their finished works.
func listMidjourneyWorks(kind string, cursor *StudioFeedCursor, limit int) ([]StudioShareDetail, error) {
	query := DB.Model(&Midjourney{}).
		Where("status = ?", "SUCCESS").
		Where("(image_url <> '' OR video_url <> '')")
	switch kind {
	case StudioShareKindVideo:
		query = query.Where("video_url <> ''")
	case StudioShareKindImage:
		query = query.Where("image_url <> ''")
	}
	query = applyStudioFeedCursor(query, midjourneyFeedTimeExpr, studioFeedRankMidjourney, cursor)

	var rows []*Midjourney
	if err := query.Order(midjourneyFeedTimeExpr + " desc, id desc").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]StudioShareDetail, 0, len(rows))
	for _, row := range rows {
		items = append(items, midjourneyShareDetail(row))
	}
	return items, nil
}

// midjourneyFeedTimeExpr normalizes the work timestamp to milliseconds so it
// shares one timeline with submitted works.
const midjourneyFeedTimeExpr = "COALESCE(NULLIF(finish_time, 0), submit_time) * 1000"

func midjourneyShareDetail(row *Midjourney) StudioShareDetail {
	createdAt := row.FinishTime
	if createdAt == 0 {
		createdAt = row.SubmitTime
	}
	createdAt *= 1000

	prompt := row.Prompt
	if prompt == "" {
		prompt = row.PromptEn
	}

	kind := StudioShareKindImage
	url := row.ImageUrl
	if row.VideoUrl != "" {
		kind = StudioShareKindVideo
		url = row.VideoUrl
	}

	// The prompt carries the requested aspect ratio, which is all the masonry
	// layout needs to reserve the right cell.
	ratio := midjourneyAspectRatio(row.Prompt + " " + row.PromptEn)
	params := map[string]any{}
	if row.Action != "" {
		params["operation"] = row.Action
	}

	return StudioShareDetail{
		Id:          row.Id,
		Source:      StudioShareSourceMidjourney,
		Kind:        kind,
		Status:      StudioShareStatusApproved,
		CreatedAt:   createdAt,
		PublishedAt: createdAt,
		Data: StudioShareArtwork{
			Kind:      kind,
			Status:    "done",
			Url:       url,
			Width:     int(math.Round(ratio * 1000)),
			Height:    1000,
			Prompt:    prompt,
			Model:     "Midjourney",
			Params:    params,
			Values:    map[string]any{},
			CreatedAt: createdAt,
		},
	}
}

// mergeStudioFeed orders both sources into one newest-first timeline.
func mergeStudioFeed(groups ...[]StudioShareDetail) []StudioShareDetail {
	size := 0
	for _, group := range groups {
		size += len(group)
	}
	merged := make([]StudioShareDetail, 0, size)
	for _, group := range groups {
		merged = append(merged, group...)
	}
	sort.SliceStable(merged, func(i int, j int) bool {
		left, right := merged[i], merged[j]
		if left.CreatedAt != right.CreatedAt {
			return left.CreatedAt > right.CreatedAt
		}
		leftRank, rightRank := studioFeedRank(left.Source), studioFeedRank(right.Source)
		if leftRank != rightRank {
			return leftRank < rightRank
		}
		return left.Id > right.Id
	})
	return merged
}

// pageStudioFeed trims a merged slice to one page and returns the next cursor.
func pageStudioFeed(items []StudioShareDetail, limit int) ([]StudioShareDetail, string) {
	if len(items) <= limit {
		return items, ""
	}
	items = items[:limit]
	last := items[len(items)-1]
	cursor := &StudioFeedCursor{
		Timestamp: last.CreatedAt,
		Rank:      studioFeedRank(last.Source),
		Id:        last.Id,
	}
	return items, cursor.String()
}

// GetStudioShareFeed lists published works for the discover gallery. Signed in
// authors also see their own pending submissions when includePending is set.
func GetStudioShareFeed(kind string, cursorRaw string, limit int, viewerId int, includePending bool) ([]StudioShareDetail, string, error) {
	shares, err := listStudioShareRows(kind, ParseStudioFeedCursor(cursorRaw), limit+1, viewerId, includePending)
	if err != nil {
		return nil, "", err
	}
	works, err := listMidjourneyWorks(kind, ParseStudioFeedCursor(cursorRaw), limit+1)
	if err != nil {
		return nil, "", err
	}
	items, next := pageStudioFeed(mergeStudioFeed(shares, works), limit)
	return items, next, nil
}

// GetUserStudioShares lists every submission of one author, newest first.
func GetUserStudioShares(userId int, kind string, cursorRaw string, limit int) ([]StudioShareDetail, string, error) {
	query := DB.Model(&StudioShare{}).Where("user_id = ?", userId)
	if kind != "" {
		query = query.Where("kind = ?", kind)
	}
	query = applyStudioFeedCursor(query, "created_at", studioFeedRankShare, ParseStudioFeedCursor(cursorRaw))

	var rows []*StudioShare
	if err := query.Order("created_at desc, id desc").Limit(limit + 1).Find(&rows).Error; err != nil {
		return nil, "", err
	}
	items := make([]StudioShareDetail, 0, len(rows))
	for _, row := range rows {
		detail, err := row.Detail(userId)
		if err != nil {
			return nil, "", err
		}
		items = append(items, detail)
	}
	items, next := pageStudioFeed(items, limit)
	return items, next, nil
}

// midjourneyAspectRatio reads the "--ar" flag of a Midjourney prompt.
// Square is Midjourney's default, so prompts without the flag map to 1:1.
func midjourneyAspectRatio(prompt string) float64 {
	fields := strings.Fields(prompt)
	for i, field := range fields {
		if (field != "--ar" && field != "--aspect") || i+1 >= len(fields) {
			continue
		}
		width, height, found := strings.Cut(fields[i+1], ":")
		if !found {
			continue
		}
		parsedWidth, widthErr := strconv.ParseFloat(width, 64)
		parsedHeight, heightErr := strconv.ParseFloat(height, 64)
		if widthErr == nil && heightErr == nil && parsedWidth > 0 && parsedHeight > 0 {
			return parsedWidth / parsedHeight
		}
	}
	return 1
}
