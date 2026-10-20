package model

func GetModelEnableGroups(modelName string) []string {
	// 确保缓存最新
	GetPricing()

	if modelName == "" {
		return make([]string, 0)
	}

	modelEnableGroupsLock.RLock()
	groups, ok := modelEnableGroups[modelName]
	modelEnableGroupsLock.RUnlock()
	if !ok {
		return make([]string, 0)
	}
	return groups
}

// GetModelGiftQuotaEnabled 返回指定模型是否允许使用礼赠金（来自定价缓存）。
// 未配置元数据的模型默认不允许，避免礼赠金在未授权模型上被消费。
func GetModelGiftQuotaEnabled(modelName string) bool {
	if modelName == "" || DB == nil {
		return false
	}
	GetPricing()
	modelEnableGroupsLock.RLock()
	enabled := modelGiftQuotaMap[modelName]
	modelEnableGroupsLock.RUnlock()
	return enabled
}

// GetModelQuotaTypes 返回指定模型的计费类型集合（来自缓存）
func GetModelQuotaTypes(modelName string) []int {
	GetPricing()

	modelEnableGroupsLock.RLock()
	quota, ok := modelQuotaTypeMap[modelName]
	modelEnableGroupsLock.RUnlock()
	if !ok {
		return []int{}
	}
	return []int{quota}
}
