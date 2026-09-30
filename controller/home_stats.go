package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/model"
	perfmetrics "github.com/QuantumNous/new-api/pkg/perf_metrics"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

// homeStatsAvailabilityWindows are tried in order, and the first window that
// recorded traffic supplies the published success rate. A quiet day therefore
// never reports an availability of zero.
var homeStatsAvailabilityWindows = []int{24, 24 * 7, 24 * 30}

// HomeStats is the public aggregate rendered by the landing page statistics.
type HomeStats struct {
	ModelCount       int     `json:"model_count"`
	TotalRequests    int64   `json:"total_requests"`
	SuccessRate      float64 `json:"success_rate"`
	SuccessRateHours int     `json:"success_rate_hours"`
}

func GetHomeStats(c *gin.Context) {
	totalRequests, err := model.GetTotalRequestCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	activeGroups := append(lo.Keys(ratio_setting.GetGroupRatioCopy()), "auto")
	successRate := 0.0
	successRateHours := 0
	for _, hours := range homeStatsAvailabilityWindows {
		result, err := perfmetrics.QuerySummaryAll(hours, activeGroups)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		if result.Summary == nil {
			continue
		}
		successRate = result.Summary.SuccessRate
		successRateHours = hours
		break
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": HomeStats{
			ModelCount:       len(model.GetPricing()),
			TotalRequests:    totalRequests,
			SuccessRate:      successRate,
			SuccessRateHours: successRateHours,
		},
	})
}
