package router

import (
	"embed"
	"html"
	"net/http"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

// WebAssets holds the embedded dashboard frontend assets.
type WebAssets struct {
	BuildFS   embed.FS
	IndexPage []byte
}

var (
	indexTitleTag  = regexp.MustCompile(`(?is)<title>.*?</title>`)
	indexMetaTitle = regexp.MustCompile(`(?is)<meta name="title" content="[^"]*"`)
)

// renderIndexPage stamps the configured system name into the SPA shell so the
// browser tab shows the site's own name from the first paint; otherwise a reload
// exposes the build-time default until the bundle finishes booting.
func renderIndexPage(page []byte, systemName string) []byte {
	name := strings.TrimSpace(systemName)
	if name == "" {
		return page
	}
	escaped := html.EscapeString(name)
	page = indexTitleTag.ReplaceAllLiteral(page, []byte("<title>"+escaped+"</title>"))
	return indexMetaTitle.ReplaceAllLiteral(page, []byte(`<meta name="title" content="`+escaped+`"`))
}

func SetWebRouter(router *gin.Engine, assets WebAssets, pluginDispatcher gin.HandlerFunc) {
	frontendFS := common.EmbedFolder(assets.BuildFS, "web/dist")
	compress := gzip.Gzip(gzip.DefaultCompression)

	router.NoRoute(
		pluginDispatcher,
		middleware.RouteTag("web"),
		func(c *gin.Context) {
			// ServeFrontendFiles sends build files already compressed.
			if !frontendFS.Exists("/", c.Request.URL.Path) {
				compress(c)
			}
		},
		middleware.AccessTokenAudit(),
		middleware.GlobalWebRateLimit(frontendFS),
		middleware.Cache(),
		middleware.ServeFrontendFiles(frontendFS),
		func(c *gin.Context) {
			if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
				controller.RelayNotFound(c)
				return
			}
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusOK, "text/html; charset=utf-8", renderIndexPage(assets.IndexPage, common.SystemName))
		},
	)
}
