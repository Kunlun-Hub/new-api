package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetAffiliateRewards 返回当前用户的邀请奖励明细
func GetAffiliateRewards(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	rewards, total, err := model.GetAffiliateRewards(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(rewards)
	common.ApiSuccess(c, pageInfo)
}

// GetAffiliateTransfers 返回当前用户的邀请额度提现明细
func GetAffiliateTransfers(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	transfers, total, err := model.GetAffiliateTransfers(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(transfers)
	common.ApiSuccess(c, pageInfo)
}
