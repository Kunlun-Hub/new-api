package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// Content item statuses.
const (
	ContentStatusPublished = "published"
	ContentStatusDraft     = "draft"
)

// ContentKinds are the publishable content collections rendered by the website.
// doc and blog back the documentation and blog pages; faq and tutorial back the
// help center.
var ContentKinds = []string{"doc", "blog", "faq", "tutorial"}

// ContentKindModules maps a content kind to the header-nav module that
// switches it on or off.
var ContentKindModules = map[string]string{
	"doc":      "docs",
	"blog":     "blog",
	"faq":      "help",
	"tutorial": "help",
}

func IsContentKind(kind string) bool {
	for _, item := range ContentKinds {
		if item == kind {
			return true
		}
	}
	return false
}

// ContentItem is one published document (a doc article, a blog post, an FAQ
// entry or a tutorial lesson). Data carries the kind-specific JSON payload the
// frontend renders, so new fields can be added without a schema change.
type ContentItem struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Kind        string `json:"kind" gorm:"type:varchar(32);not null;uniqueIndex:idx_content_kind_locale_slug,priority:1"`
	Locale      string `json:"locale" gorm:"type:varchar(16);not null;default:'';uniqueIndex:idx_content_kind_locale_slug,priority:2"`
	Slug        string `json:"slug" gorm:"type:varchar(160);not null;uniqueIndex:idx_content_kind_locale_slug,priority:3"`
	Title       string `json:"title" gorm:"type:varchar(255);not null"`
	Description string `json:"description" gorm:"type:text"`
	Category    string `json:"category" gorm:"type:varchar(64);not null;default:''"`
	Status      string `json:"status" gorm:"type:varchar(16);not null;default:'published';index:idx_content_kind_status,priority:2"`
	SortOrder   int    `json:"sort_order" gorm:"not null;default:0"`
	Data        string `json:"data" gorm:"type:text"`
	PublishedAt int64  `json:"published_at" gorm:"bigint"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
}

func (ContentItem) TableName() string {
	return "content_items"
}

// NormalizeContentItem trims and defaults the fields every write path shares.
func NormalizeContentItem(item *ContentItem) {
	item.Kind = strings.TrimSpace(item.Kind)
	item.Slug = strings.TrimSpace(item.Slug)
	item.Locale = strings.TrimSpace(item.Locale)
	item.Title = strings.TrimSpace(item.Title)
	item.Description = strings.TrimSpace(item.Description)
	item.Category = strings.TrimSpace(item.Category)
	item.Status = strings.TrimSpace(item.Status)
	if item.Status != ContentStatusDraft {
		item.Status = ContentStatusPublished
	}
	if item.Data == "" {
		item.Data = "{}"
	}
}

func ListContentItems(kind, status, keyword string, pageInfo *common.PageInfo) ([]ContentItem, int64, error) {
	query := DB.Model(&ContentItem{}).Where("kind = ?", kind)
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	keyword = strings.TrimSpace(keyword)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("title LIKE ? OR slug LIKE ? OR category LIKE ?", like, like, like)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []ContentItem
	err := query.Order("sort_order DESC, id DESC").
		Offset(pageInfo.GetStartIdx()).
		Limit(pageInfo.GetPageSize()).
		Find(&items).Error
	return items, total, err
}

// ListPublishedContent returns every published item of a kind. When locale is
// set, an item written for that locale wins over the locale-neutral variant of
// the same slug.
func ListPublishedContent(kind, locale string) ([]ContentItem, error) {
	var items []ContentItem
	if err := DB.Where("kind = ? AND status = ?", kind, ContentStatusPublished).
		Order("sort_order DESC, id DESC").
		Find(&items).Error; err != nil {
		return nil, err
	}
	seen := make(map[string]int, len(items))
	result := make([]ContentItem, 0, len(items))
	for _, item := range items {
		index, exists := seen[item.Slug]
		if !exists {
			seen[item.Slug] = len(result)
			result = append(result, item)
			continue
		}
		if rankContentLocale(item.Locale, locale) < rankContentLocale(result[index].Locale, locale) {
			result[index] = item
		}
	}
	return result, nil
}

// rankContentLocale orders locale variants: an exact match first, then the
// locale-neutral content, then everything else.
func rankContentLocale(itemLocale, requested string) int {
	if requested != "" && itemLocale == requested {
		return 0
	}
	if itemLocale == "" {
		return 1
	}
	return 2
}

func GetContentItemById(id int) (*ContentItem, error) {
	item := &ContentItem{}
	if err := DB.Where("id = ?", id).First(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

func GetPublishedContentBySlug(kind, slug, locale string) (*ContentItem, error) {
	query := DB.Where("kind = ? AND slug = ? AND status = ?", kind, slug, ContentStatusPublished)
	if locale != "" {
		query = query.Order(gorm.Expr("CASE WHEN locale = ? THEN 0 WHEN locale = '' THEN 1 ELSE 2 END", locale))
	}
	item := &ContentItem{}
	if err := query.First(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

// UpsertContentItem inserts or updates one item identified by kind, locale and
// slug, which is what the admin editor and the built-in content import both use.
func UpsertContentItem(item *ContentItem) (*ContentItem, error) {
	NormalizeContentItem(item)
	now := nowUnix()
	existing := &ContentItem{}
	err := DB.Where("kind = ? AND locale = ? AND slug = ?", item.Kind, item.Locale, item.Slug).First(existing).Error
	if err == nil {
		item.Id = existing.Id
		item.CreatedAt = existing.CreatedAt
		item.UpdatedAt = now
		if item.PublishedAt == 0 {
			item.PublishedAt = existing.PublishedAt
		}
		if item.PublishedAt == 0 {
			item.PublishedAt = now
		}
		err = DB.Model(existing).Select("*").Omit("id", "created_at").Updates(item).Error
		if err != nil {
			return nil, err
		}
		return GetContentItemById(existing.Id)
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	item.CreatedAt = now
	item.UpdatedAt = now
	if item.PublishedAt == 0 {
		item.PublishedAt = now
	}
	if err := DB.Create(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

func DeleteContentItem(id int) error {
	return DB.Delete(&ContentItem{}, id).Error
}
