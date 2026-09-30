package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupHomeStatsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	// Resolves the dialect-quoted reserved columns (for example `group`) and
	// restores the globals it touches.
	initModelListColumnNames(t)

	gin.SetMode(gin.TestMode)
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	model.DB = db
	model.LOG_DB = db

	require.NoError(t, db.AutoMigrate(&model.User{}, &model.PerfMetric{}))

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func callHomeStats(t *testing.T) HomeStats {
	t.Helper()

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/home-stats", nil)
	GetHomeStats(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)

	var payload struct {
		Success bool      `json:"success"`
		Data    HomeStats `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	return payload.Data
}

func TestGetHomeStatsAggregatesLifetimeRequestsAndWindowSuccessRate(t *testing.T) {
	db := setupHomeStatsTestDB(t)
	require.NoError(t, db.Create(&model.User{Id: 1, Username: "home-stats-a", AffCode: "home-stats-aff-a", RequestCount: 1200}).Error)
	require.NoError(t, db.Create(&model.User{Id: 2, Username: "home-stats-b", AffCode: "home-stats-aff-b", RequestCount: 34}).Error)
	require.NoError(t, db.Create(&model.PerfMetric{
		ModelName:    "home-stats-model",
		Group:        "default",
		BucketTs:     time.Now().Unix() - 60,
		RequestCount: 4,
		SuccessCount: 3,
	}).Error)

	stats := callHomeStats(t)

	assert.EqualValues(t, 1234, stats.TotalRequests)
	assert.EqualValues(t, 24, stats.SuccessRateHours)
	assert.InDelta(t, 75, stats.SuccessRate, 0.01)
}

func TestGetHomeStatsOmitsSuccessRateWithoutTraffic(t *testing.T) {
	db := setupHomeStatsTestDB(t)
	require.NoError(t, db.Create(&model.User{Id: 1, Username: "home-stats-c", AffCode: "home-stats-aff-c", RequestCount: 5}).Error)

	stats := callHomeStats(t)

	assert.EqualValues(t, 5, stats.TotalRequests)
	assert.Zero(t, stats.SuccessRateHours)
	assert.Zero(t, stats.SuccessRate)
}
