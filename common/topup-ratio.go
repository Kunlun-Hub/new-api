package common

import (
	"encoding/json"
	"maps"
	"sync"
)

var topupGroupRatio = map[string]float64{
	"default": 1,
	"vip":     1,
	"svip":    1,
}
var topupGroupRatioMutex sync.RWMutex

func TopupGroupRatio2JSONString() string {
	topupGroupRatioMutex.RLock()
	defer topupGroupRatioMutex.RUnlock()
	jsonBytes, err := json.Marshal(topupGroupRatio)
	if err != nil {
		SysError(LogText("error marshalling topup group ratio: %s", err.Error()))
	}
	return string(jsonBytes)
}

func UpdateTopupGroupRatioByJSONString(jsonStr string) error {
	topupGroupRatioMutex.Lock()
	defer topupGroupRatioMutex.Unlock()
	topupGroupRatio = make(map[string]float64)
	return json.Unmarshal([]byte(jsonStr), &topupGroupRatio)
}

// GetTopupGroupRatiosCopy 返回充值分组折扣配置的副本。
func GetTopupGroupRatiosCopy() map[string]float64 {
	topupGroupRatioMutex.RLock()
	defer topupGroupRatioMutex.RUnlock()

	ratios := make(map[string]float64)
	maps.Copy(ratios, topupGroupRatio)
	return ratios
}

func GetTopupGroupRatio(name string) float64 {
	topupGroupRatioMutex.RLock()
	defer topupGroupRatioMutex.RUnlock()
	ratio, ok := topupGroupRatio[name]
	if !ok {
		SysError(LogText("topup group ratio not found: %s", name))
		return 1
	}
	return ratio
}
