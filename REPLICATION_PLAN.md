# gpt.ge 1:1 复刻计划与进度

- 参考站：https://gpt.ge （账号：674904341@qq.com）
- 目标：页面 / 样式 / 按钮 / 弹窗 / 功能 逐页 1:1 复刻；参考站有而我们没有的能力，自行开发后端接口补齐
- 状态含义：`✅ 完成` / `🟡 进行中` / `⬜ 未开始` / `➖ 不适用`
- 最后更新：2026-10-01（第四十一轮：模型详情页头部按钮 1:1 —— 「在线体验」「复制链接」改为参考站的独立胶囊按钮（复制链接按钮此前是 36px 圆形图标按钮却带可见文案，文字溢出到框外））
- 上一轮：2026-10-01（第四十轮：模型广场「列表视图」按参考站 1:1 重做（7 列 / 53px 行高 / 复制模型名 / 24 段可用率 / 加载更多），并修好后台「模型定价」编辑区不跟随滚轮滚动）
- 上一轮：2026-10-01（第三十九轮：清空内置模型价格 —— 代码默认表 / 内置计费表达式 / 数据库持久化条目全部置空）
- 上一轮：2026-10-01（第三十七轮：移除主页页脚署名行 + 控制台内容区不再被「居中钳制」（≥1600px 折叠侧边栏时的大间隙与分隔线错位））
- 再上一轮：2026-10-01（第三十六轮：服务端视频封面抽帧 `POST /api/user/oss/video-cover` — 浏览器解不了的编码交给网关 ffmpeg 出图，补齐第三十三轮遗留差异②）
- 上一轮：2026-10-01（第三十五轮：内容后端发布 + 工单 WebSocket 实时会话 + 功能开关 + 创作/登录态修复）
- 上一轮：2026-10-01（第三十四轮：视频封面重试队列 — 对齐参考站 `useVideoCoverRetry`：画廊变化时最多入队 4 条「已完成但缺封面」的视频，空闲时串行补封面，失败按错误分类退避（429 90s / 解码 2h 最多 3 次 / 404·413·无效 URL 直接停用 / 超时与 5xx 5m→24h）；新增 `use-video-cover-retry`、`video-cover-retry`、`generateStudioVideoCover`；生成与收藏转存见第三十三轮）
- 上一轮：2026-10-01（第三十三轮：创作中心媒体转存个人桶 + 视频封面 + 收藏转存 — 生成完成与收藏都会把图片/视频转存（个人桶优先、网关本地 `data/studio-uploads` 兜底）并抽取视频首帧封面；新增 `POST /api/user/oss/object`、`service/studio_storage.go`、`persistStudioMedia` / `persistStudioVideo` / `extractVideoCover`（参考站抽帧算法：多采样点 + 有意义帧判定 + 640px + WebP 优先）/ `useArtworkFavorite`）
- 再上一轮：2026-10-01（第三十二轮：创作中心 `/studio/chat` 附件链路打通 + chip 1:1（图片方形 80×80 / 消息内 112×112、无文件名，横向文件 chip `min-w-40`，X 常显 ghost icon-xs），前端上传 → 网关个人桶/本地兜底 → 转换前把私网附件内联成 data URL）

## 0. 环境速查（每次开工先看这里）

| 项目 | 命令 / 地址 |
| --- | --- |
| **当前部署（Docker Compose：new-api + PostgreSQL 15 + Redis 7，端口 3000）** | `docker build -t new-api:local .` → `docker compose -f docker-compose.local.yml up -d`（密钥在同目录 gitignored 的 `.env`）。三个容器 `new-api` / `new-api-postgres` / `new-api-redis` 均 healthy；PG 调优 shared_buffers=1GB、effective_cache_size=3GB、work_mem=16MB、max_connections=400、random_page_cost=1.1、max_wal_size=4GB、shm_size=1GB；应用侧 `SQL_MAX_OPEN_CONNS=200`/`SQL_MAX_IDLE_CONNS=50`、`REDIS_CONN_STRING`、`MEMORY_CACHE_ENABLED=true`、`BATCH_UPDATE_ENABLED=true`、`SYNC_FREQUENCY=60`、`GIN_MODE=release`、`TRUSTED_PROXIES=none`、`STREAMING_TIMEOUT=300`、`RELAY_IDLE_CONN_TIMEOUT=90`、nofile 65535、日志轮转。数据卷 `new-api-local_new-api-postgres` / `_new-api-redis` / `_new-api-logs`；PG/Redis 不对外发布端口。日志 `docker logs -f new-api`；旧 SQLite 卷 `new-api-data` 已闲置（开发库备份在 `/root/new-api-devdata-backup-20261001-161649`）；2026-10-01 迁移后数据为空，等待用户自行初始化 |
| 前端（联调临时热更新，默认关闭） | 需要改前端时临时起：`cd web && bun run dev --port 5173 --host 0.0.0.0`（**必须带 `--host 0.0.0.0`，否则 CDP 里的 127.0.0.1 标签页连不上**；日志 `/tmp/newapi-web-dev.log`）。验证完请停掉，日常以 3000 的 Docker 部署为准，改完必须 `docker build -t new-api:local .` 重建镜像才生效 |
| 后端（源码启动，默认关闭） | `/tmp/newapi-dev.sh start \| stop \| restart \| status \| logs` → http://localhost:3000 （日志 `/tmp/newapi-backend.log`；与 Docker 3000 冲突，不要同时开） |
| 真实浏览器（CDP 有头） | http://127.0.0.1:9223 ，常驻 gpt.ge 标签页（已登录）与 3000 的标签页（**勿用 9222，那是无头且 cookie 不同**）；探针账号用完即删，库里只保留用户自己的账号 |
| 截图脚本 | `/tmp/pw/one.mjs <our-url> <out.png>`；`/tmp/pw/pair.mjs <ge-url\|-> <our-url\|-> <name>` |
| 截图注意 | 必须走 CDP `Page.captureScreenshot({fromSurface:false})`；5173 用 `fromSurface:true` 会超时，gpt.ge 的 `page.screenshot()` 也常超时 |
| 数据库 | 默认 SQLite `data/new-api.db`（无 sqlite3 CLI，用 python3 sqlite3） |
| 前端测试 | `cd web && bunx vitest run <path>`；全量 `bunx vitest run` |
| 类型检查 | `cd web && bun run typecheck` |

## 1. 页面清单（从 gpt.ge 真实浏览器采集）

### 1.1 控制台（侧边栏）

| # | 页面 | gpt.ge 路由 | 本项目路由 | 状态 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 1 | 仪表盘 / 数据看板 | `/panel` | `/dashboard/overview` | 🟢 | 三大大卡 + 三小卡 + 模型用量统计 + 系统公告全部对齐：文案（今日 消耗/请求/Token、近 7 天消耗 $0.00，日均 $0.00、同步延迟：20 分钟）、金额固定 2 位小数、ButtonGroup 小时/天 + 刷新、PillTabs、订阅通知入口；公告列表内容取决于后台 `console_setting.announcements`（本机为空 → 暂无数据，与真实数据一致） |
| 2 | API 令牌 | `/panel/token` | `/keys` | 🟢 | 已 1:1：列顺序 = 选择/名称/ApiKey/分组/已用 / 剩余/创建时间/过期时间/操作/状态（模型限制移入分组单元格的 `模型限制` 徽章，IP 限制只在编辑抽屉里，与参考站一致）；名称右侧挂状态徽章（禁用/已过期/已耗尽/未知）；ApiKey 列 = `sk-xx***xxx` + 复制按钮（懒加载真实 key）；分组 = 圆点 + 名称 + tooltip(分组描述) + `自动` 徽章 + `模型限制` 徽章；创建/过期时间为 `YYYY-MM-DD HH:mm`；操作列 = 连接应用菜单 | 铅笔 | Popconfirm 删除；状态列 = 居中 Switch（右侧固定）；工具栏 = 默认排序/名称/ApiKey/查询（名称/ApiKey 为带 × 的 InputClear；小屏折叠为 `筛选查询` 按钮）+ 刷新 + 显示列(漏斗) + 创建令牌；勾选行后筛选区替换为内联批量条（`复制N 个` / `删除N 个` + Popconfirm / `取消`）；小屏不再是卡片列表，改为同一张横向滚动表格（状态列右侧固定）；BaseURL 卡 = hover 卡（可用API地址 + 线路说明 + 复制）+ 3 个统计块，主机名后固定显示灰色 `/v1`；连接应用弹窗（配置 CC Switch，含线路描述行）已按参考站重做
| 3 | 使用日志 | `/panel/log` | `/usage-logs/common` | 🟢 | 已 1:1：单行 sticky 筛选条（开始/结束/令牌名称/模型 + 查询）、右侧「全部日志 + 导出/重置/显示列(漏斗)」、区间消耗卡「查看/刷新」、详情列空表头、显示列面板标题；导出走新后端接口。分组筛选移入「更多筛选」；分组筛选仍保留（参考站无此筛选） |
| 4 | 绘图日志 | `/panel/midjourney` | `/usage-logs/drawing` | 🟢 | 已 1:1：列/单元格/行点击详情全部对齐（类型徽章为无色 outline、任务 ID 纯等宽文本 + 复制、状态徽章按参考站配色、`×N` 制品数、状态列右固定、进度条、耗时着色、待结算、任务详情弹窗重排）；仅多出「图片/失败原因/提交结果」三列（默认隐藏，可在显示列中开启）；剩余差异见第二十七轮记录 |
| 5 | 任务日志 | `/panel/task` | `/usage-logs/task` | 🟢 | 已 1:1：列 = 提交时间/（管理员：用户名/渠道）/平台/任务 ID/事件/进度/耗时/消耗/状态（右固定）；平台无色 outline 徽章、任务 ID 等宽截断 + 复制、事件 = 圆点 + 小写 action + 解析 `properties.input` 参数（`duration` 加 `s`）、进度 `h-1 w-16`（失败灰条）+ 百分比、耗时 150/100s 红/琥珀、消耗「待结算」、状态按参考站配色；行点击打开任务详情弹窗（实心平台 Badge + 大写 action + 可复制任务 ID + 状态/失败原因/提交/开始/完成时间 + 任务数据 JSON，快照按需拉取）；工具栏刷新按钮 = 参考站 `RefreshCw`（重置 + 重载 + loading spinner）+ 漏斗显示列；保留提示「媒体文件有时效性，请尽快保存到本地！」；参考站无「制品」列（本机保留但默认隐藏）；剩余差异见第二十八轮记录 |
| 6 | 充值 | `/panel/topup` | `/wallet` | 🟢 | 已 1:1：账户余额 + 额度卡（折扣胶囊 / 实付 / 节省）+ 待支付金额 + 支付方式按钮 + 支付提示（新后端字段 `epay_tip`，为空回退「最低充值金额」）+ 兑换码区块（`兑换余额` / `请输入充值兑换码` / 深色按钮，文案与参考站一致）+ 「无法在线充值？购买兑换码」（仅后台配置 `TopUpLink` 时显示）+ VIP 享折上折（分组名 + 额外折扣胶囊 + 后台分组描述 + 您已累计充值）+ 邀请卡 + 活动标题/倒计时/横幅（`promo_*` 配置，未配置不显示）；金额固定 2 位小数。环境差异：本机 `quota_display_type=USD`、`price=7.3`，支付方式与分组描述取后台真实配置 |
| 7 | 邀请计划 | `/panel/invite` | `/invitation` | 🟢 | 已 1:1：标题行（Gift + 邀请奖励 + 提取到余额/申请提现）、三统计卡（待使用收益/累计收益/奖励次数）、解锁 Alert（有效充值 + 累计使用额度勾选行）、行内邀请链接 + CopyBtn、推广文案（4 条随机 + 刷新/复制）、奖励规则（按真实配置渲染）、PillTabs 双表（奖励记录/提现记录）+ 提现弹窗。后端新增 `/api/user/invite/status`、`/api/afflog(+/self)`、`/api/withdrawal(+/self)`、充值返佣、提现预扣/驳回返还；差异：提现相关 UI 仅在后台开启「邀请收益提现」后显示（参考站默认开启），奖励规则只显示后台真实配置的条目 |
| 8 | 订单 / 发票 | `/panel/order` | `/orders` | 🟢 | 已 1:1（用户端 + 管理端）：卡片内胶囊 Tab（订单列表/开票记录）、订单工具栏（提示/已选 N 个合计/取消选择/批量标记已开票/清除无效订单/刷新/申请开票·全部开票）、订单表列（勾选/ID/用户ID/上级/商户订单编号+复制/支付方式/支付金额/充值额度 `$` 徽章/创建时间/开票状态徽章/状态圆点，右侧固定）、申请开票弹窗（绿/红 Alert + 可开票金额 + 完整 `InvoiceForm`）、开票记录表（发票类型/备注图标/发票金额/抬头类型/发票抬头/申请状态+驳回原因 tooltip/申请时间/操作菜单）、详情/编辑/驳回/管理员创建发票弹窗、删除申请确认；管理端工具栏（用户 ID 查询 + 开始/结束日期 + 查询总额 + 已开票 N 笔共 X + 复制待审 + 批量审核 + 创建发票）；后端新建 `invoices`/`invoice_orders` 表与全套接口；兑换码订单（`type=2`）在订单列表按「兑换码/已兑换」展示 |
| 9 | 个人中心 | `/panel/profile` | `/profile` | 🟢 | 5 个 Tab 全部 1:1（本轮完成）：页头渐变卡（`<h2>` 昵称 + 角色/分组徽章 + 可复制邮箱/ID chip + 3 统计 + 加入时间/最近登录/登录 IP）；PillTabs = `账号关联 / 订阅通知 / 修改资料 / 安全设置 / 存储设置`（激活态黑胶囊、未激活纯黑字，存储设置图标 `hard-drive`）；**账号关联** = 2 列扁平卡片，顺序 `绑定邮箱 / GitHub / Google / OIDC / WeChat / Passkey`（未启用 = 灰按钮 disabled），Google 卡在后台配置了名为 Google 的自定义 OAuth 提供者后可直接绑定/解绑；**订阅通知** = 订阅事件（账户额度不足通知锁定勾选、其余 4 项）+ 通知方式 6 radio + `接收所有已订阅通知`/`仅通知额度提醒…` 说明 + 通知邮箱（仅邮件方式）+ WebHook 通知地址 / Chat ID / Bot Token / Token（可选）+ 预警额度 InputGroup($) + 8 个 `$` 预设（xs outline）+ 保存；**修改资料** = 用户名（禁用）/昵称（maxlength 20）/密码（可选，`如需修改请输入新密码，最短 8 位`）+ 保存（填密码会走身份验证弹窗，符合本站重认证要求）；**安全设置** = 两步验证 (2FA) / 系统令牌（curl 示例 + 生成令牌）/ 删除账户（红色描边）3 卡 2 列；**存储设置** = 个人存储桶（HardDrive 图标、gap-6 双列、`验证并保存` 全宽按钮 + 解除绑定）——参考站所述「图片/视频自动转存到个人桶」尚未接入 relay/制品链路 |
| 10 | 工单 | `/panel/ticket` | `/tickets` | 🟢 | 已 1:1：页头（绿点 + 32px 刷新 + 创建工单）、PillTabs（等宽 + 红点计数）、搜索框、列表项（36px 头像 / 标题 / 状态胶囊 `text-[0.65rem]` / 邮箱 / 相对时间 / 选中态 `border-border/80 bg-muted/40`）、右侧空态、对话面板（工单号 TK 徽章 + 分类 + 邮箱、header 右侧「关闭工单」+ 确认弹窗、Markdown 消息气泡 + 已读勾、composer `</>`+📎+圆形发送）、创建弹窗（512×509 + `</>`+📎）。后端新增工单号、状态计数、真实附件上传 |
| — | 审计日志（本项目独有） | — | `/usage-logs/audit` | ➖ | 参考站无此菜单 |
| — | 模型监控（本项目独有，已公开） | — | `/monitoring` | ➖ | 参考站无此页，顶栏"模型监控"入口保留 |

### 1.2 顶栏 / 公共页

| # | 页面 | gpt.ge 路由 | 本项目路由 | 状态 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 11 | 首页 | `/` | `/` | 🟢 | 已 1:1：新模型轮播 pill（2.6s 上滑换词、宽度取最长名）、`仅需一个接口 / 连通全球最热门的模型`（72/60px）、副标题真实模型数加粗高亮、`立即开始/帮助文档` 圆角大按钮、栅格背景+光斑、`完善的服务体系` 6 卡、`几行代码，快速接入`（3 步 + 编程/应用教程入口 + Chat/Responses/Claude/Gemini 代码面板 + REQUEST/RESPONSE/POST 200 OK）、`一个平台，多种用途` 5 卡（首卡跨 2 列）、统计卡（真实数据）、页脚（栅格 5 列 + 虚线分隔版权行）。参考站无 CTA 区块，已从首页移除 |
| 12 | 模型广场 | `/models`、`/models/{model}` | `/pricing`、`/pricing/{model}` | 🟡 | 列表已 1:1（筛选栏、hero、工具栏、卡片 hover 换体验/复制、底部 `NEW`+计费+能力徽章+上下文徽章）；详情页已重排为参考站结构（面包屑/头部/5 项统计卡/模型描述/可用分组表/阶梯计费/支持端点/可用率监控）。阶梯计费表已对齐参考站（表头 `生效条件/输入价格/输出价格`、条件用词 `输入 Token > 200K`、价格自适应去零如 `$3.75/M`）；**第二十九轮已补齐**：卡头右侧 `w-40` 令牌分组下拉（模型可用分组 >1 时才渲染，切换后按分组倍率换算全部价格）、无 `分档价格表` 小标题、基准档只在可用分组表、阶梯行 = `输入 Token > 200K` / `> 32K, ≤ 256K`、补齐参考站 `缓存写入 (5m)` + `缓存写入 (1h)` 双列、表头 12px + 行高 45px + 单元格字重（分组名 500 / 其余 400）与参考站实测一致；**第三十一轮已补齐**：卡片与详情页头部的展示标签徽章 `弃用 / 别名 / 逆向 / 泛模型`（参考站同款 outline，排在 `NEW`+计费徽章+`联网` 之后、能力徽章之前）；剩余差异见第二十九/三十一轮记录；**第四十轮已把「列表视图」按参考站 1:1 重做**：7 列（模型名称＝复制按钮 / 标签 / 上下文 / 计费 / 输入输出价格 / 可用率 / 体验）、行高 53px、表头 44.5px、`td` padding 12/16、去掉分页器改为「加载更多...」+ IntersectionObserver 增量加载、可用率 24 段条形（无 24h 数据时 `—` 不造假），列宽常量与参考站实测一致 |
| 13 | 创作 → 发现作品 | `/studio` | `/studio` | 🟢 | 已 1:1：顶栏「创作」hover 下拉 + 4 个胶囊 Tab + 绝对定位瀑布流（最短列放置 / 视口窗口化 / 图片实测比例纠正）+ 滚动到底自动加载（无「加载更多」按钮，与参考站一致）+ 卡片左上收藏心形（IndexedDB `studio` 持久化，刷新保持）+ hover 蒙层/一键同款 + 点击进入全屏作品详情（左媒体 + 右信息栏：模型 / 相对时间 / 提示词+复制 / 参数设置徽章 / 底部一键同款 + 返回/关闭/上下件按钮 + 键盘 ←→/Esc）。数据来自 `GET /api/studio/share`：**已审核通过的分享作品 + MJ 作品表合并时间线**（cursor = `ts:rank:id` 分页），返回 `aspect_ratio`（解析 `--ar`）与 `parameters`（操作类型）；作者带 `include_pending=1` 时额外看到自己的待审作品（卡片上可点 `Pending review` 直接审核发布），非作者/未登录只看到已发布；无作品时显示空态。见第二十四轮记录 |
| 14 | 创作 → 聊天对话 | `/studio/chat` | `/studio/chat` | 🟡 | 会话侧栏已 1:1（新建聊天 / 清空历史 Popconfirm / 星标·今天·昨天·更早分组 / 条目悬浮菜单 星标·重命名·删除 / 空态 / 底部隐私卡 / `studio:sidebar-open` 记忆开关 + 移动端 Sheet）；会话与消息全部落浏览器 IndexedDB（库 `studio`：`conversations` / `messages` / `generations`），刷新后保留；右上角「备份与还原」备份到本人 S3 桶（后端中转，无需桶 CORS）：未配置桶给提示 + 去个人中心，已配置显示上次备份 / 立即备份 / 从备份还原（只补缺失，不覆盖）；聊天复用 Playground（真实可用）；**composer 已 1:1**（`px-4 md:pb-3` + `max-w-3xl` + `InputGroup rounded-2xl border-border/80 shadow-2xl/5`；textarea `max-h-60 min-h-20 px-4 pt-4 text-sm` 占位 `问点什么...`；左下 模型 chip → 分隔线 → 参数(sliders) → 思考级别(brain) → 回形针；右下 令牌分组(layers, ml-auto) + 圆形发送；有消息时多出 `+`新建聊天 与 橡皮擦清除上下文；空态时问候语 + composer 一起垂直居中）；**第三十二轮已补齐附件**：chip 尺寸/结构按参考站实测重做（输入框图片 `w-20` 80×80、无文件名；消息内 `w-28` 112×112；横向文件 chip `min-w-40`；X 常显），上传走网关 `POST /api/user/oss/upload`（个人桶优先，未配置则本地 `data/studio-uploads` 兜底），发送请求体与参考站同形（文件 `file_data=<URL>`、图片 `image_url.url`），转换前把私网可达的附件内联成 data URL，OpenAI 兼容上游内联 base64、Claude 上游转 `document.source.url`） |
| 15 | 创作 → 图片生成 | `/studio/image` | `/studio/image` | 🟡 | 已 1:1：`image-play` 问候语 + InputGroup composer（`rounded-2xl` / `max-h-50 min-h-16 px-4 pt-4`）+ 底部 7 按钮（厂商 chip / 版本 chip / 分隔线 / 比例方块 chip 网格 / 参数按钮 / 参考图按钮 / 令牌 chip + 圆形发送）+ 5 个 chip 提示词；弹窗实测与参考站同尺寸（版本 208×272、比例 320×80、参数 352×544、令牌 min-w-64）；参数面板 17 项（生成模式 / 画质 --q / 风格化 --s / 混沌 --c / 怪异 --weird / 风格 / 视角 / 人物镜头 / 灯光 / 艺术程度 / sref / cref / oref / 角色参考权重 --cw + 恢复默认）全部真实生效；提示词按参考站 `buildMjPrompt` 规则拼接（修饰词换行合并 + 仅非默认值追加 `--ar/--v/--niji/--q/--s/--c/--weird/--sref/--cref/--cw/--oref`）；提交走 `/mj/submit/imagine`（relax/turbo 走 `/mj-{mode}` 前缀）并轮询 `/mj/task/{id}/fetch`；参考图按钮上传后以 `base64Array` 提交。剩余差异见第二十一轮记录；**作品画廊已 1:1**（胶囊 Tab `My artwork / Favorites`、4 列瀑布流卡片含收藏/重新生成/用作参考图/下载/删除、悬浮 composer、全屏查看器 380px 右栏 + 键盘 ←→/Esc），见第二十三轮记录；**作品分享已打通**（Tab 增加 `My shares`：`Submit for sharing` → 提交审核 → `Pending review` 徽章 → 一键 `Published` → 删除），见第二十四轮记录；画廊卡片动作/占位卡见第二十五轮记录；**查看器 MJ 操作已复刻**（卡片 U1–V4 快捷按钮 + 右栏 `Image operations`：U/V 网格、Reroll/变化/变焦/平移/放大/扩展方图、`Custom zoom` Popover、真实 `/mj/submit/action` → `code 21` → `/mj/submit/modal` 链路），见第二十六轮记录 ；**生成结果自动转存**（MJ `SUCCESS` → `persistStudioMedia`，个人桶优先 / 网关本地兜底，失败保留原 URL），见第三十三轮记录；**收藏转存**（收藏时自动把上游媒体转入个人桶 / 网关本地，失败回滚收藏），见第三十三轮记录 |
| 16 | 创作 → 视频生成 | `/studio/video` | `/studio/video` | 🟡 | 已 1:1：问候语（`Clapperboard` 图标 + `what would you like to film?`）+ InputGroup composer（`rounded-2xl` / `max-h-50 min-h-16 px-4 pt-4`）+ 5 个 chip 提示词 + 底部 chip 行（厂商 → 模式 → 模型 → 比例 / 媒体 chip → 参数 → 令牌 → 圆形发送）；5 厂商 18 模式（Kling / Vidu / Dreamina / HappyHorse / 阿里万相）schema 与参考站逐项对齐，比例弹窗 320×150 / 格子 56×64 / 色块 18×18 等实测一致，参数面板高度 18/18 一致；提交走 `POST /v1/videos`（metadata 透传）→ `GET /v1/videos/{id}` 轮询 → `GET /v1/videos/{id}/content` 播放/下载。剩余差异见第二十二轮记录；**作品画廊已 1:1**（`My videos / Favorites` + 瀑布流 + 悬浮 composer + 视频查看器，视频记录存 `/v1/videos/{id}/content` 并在展示时用令牌重取），见第二十三轮记录；**作品分享已打通**（Tab 增加 `My shares`，交互同图片页），见第二十四轮记录；**卡片已 hover 自动播放**（进入播放 / 离开暂停并回到 0），见第二十五轮记录 ；**生成结果自动转存 + 视频首帧封面**（`persistStudioVideo` → 视频与 canvas 封面分别入库，无封面时降级），见第三十三轮记录；**收藏转存**（收藏时自动转存视频与封面，失败回滚收藏），见第三十三轮记录；**封面重试**（画廊渲染时自动为缺封面视频补封面，失败按错误类型退避/停用），见第三十四轮记录 |
| 17 | 博客 | `/blog` | `/blog`、`/blog/{slug}`、`/blog/category/{cat}` | 🟢 | 列表（轮播 + 精选推荐 + 分类胶囊 + 卡片栅格）与详情页已复刻；17 篇真实文章（标题/摘要/封面/正文，抓取自参考站）内置为静态内容，封面图直连参考站 CDN（已加 `referrerPolicy=no-referrer` 绕过防盗链） |
| 18 | 帮助中心 | `/help`、`/tutorials*`、`/doc*` | `/help`、`/tutorials`、`/tutorials/{cat}`、`/tutorials/{cat}/{slug}`、`/doc`、`/doc/{slug}` | 🟢 | Hero（点阵背景 + 搜索）+ 教程 3 卡 + 文档 4 卡 + FAQ 手风琴（9 条，含 Markdown 答案）；22 篇教程（9 编程 / 11 应用 / 2 OpenClaw）与 3 篇文档为参考站真实内容静态内置；搜索支持教程/文档/FAQ 过滤 |
| 19 | API 文档 | 外链 Apifox | — | ➖ | 外链，无需复刻 |
| 20 | 登录 / 注册 / 找回密码 | `/signin`、`/signup`、`/forgot-password` | `/(auth)/sign-in` 等 | 🟢 | 卡片宽度/内边距/圆角/徽章/标题/输入框与按钮尺寸/页脚链接已按参考站逐项对齐（几何值实测一致）；注册表单改为「邮箱 + 密码 + 条款勾选」（无用户名、无确认密码），后端已支持仅邮箱注册 |

### 1.3 本项目后台（参考站无，仅保持自身风格一致）

`/system-settings/*`、`/users`、`/channels`、`/models`、`/redemption-codes`、`/subscriptions`、`/task-plugins`、`/admin/tickets` 等。

## 2. 全局风格结论（已确认，勿重复踩坑）

- **内容宽度**：双方 `main` 均 `x=256 w=1174`，内容内边距 `lg:px-20 lg:py-8`（80px），内容宽 1014（窄屏）/1222。已居中。
- **控件尺寸（2026-10-01 已对齐）**：参考站设计系统比我们大一号，已按参考站改齐：
  - `Button` default `h-9`、`sm` `h-8`、`lg` `h-10`、`icon` `size-9`、`icon-sm` `size-8`、`icon-lg` `size-10`
  - `Input` 默认 `h-9`、`SelectTrigger` `data-[size=default]:h-9`
  - 页面标题 `text-2xl font-semibold tracking-tight`（原 `text-lg font-bold`）
  - 表格行内操作按钮 = `icon-sm`（32px），与参考站行内按钮 `h-8` 一致
- **顶栏固定**：参考站顶栏为 `div.sticky top-0 z-50 > header.relative w-full bg-background/50 backdrop-blur-2xl`（**占据 64px 文档流**、滚动时**不**滚走），页内面包屑行随内容滚走。本项目控制台 `AppHeader` 同为 sticky；公共页 `PublicHeader` 也已从 `fixed` 覆盖层改为同款 sticky-in-flow（此前记录的“参考站顶栏会滚走”为误判，已更正）。
- **滚动**：参考站**没有嵌套滚动容器**，整页跟随浏览器滚动条；页头会随页面滚走（不是 sticky 内层容器）。本项目已改为同样结构，仅剩 TanStack Router dev 角标（生产不显示）。
- **侧边栏折叠**：展开 256px（inner 239 / containerPad `0 8px`，item 34px，icon x=24）；折叠 48px（pad 0，item 32px，icon x=16）。几何值已与参考站逐项一致。
- **主题**：参考站是 亮/暗/系统 三按钮 + 内容宽度设置，本项目已改为同样按钮组。
- **i18n**：所有界面文案必须走 `t('英文键')`，同步 `web/src/i18n/locales/{en,zh,zh-TW,fr,ja,ru,vi}.json`。
- **数字/货币**：普通数字用 `@/lib/format`，金额用 `@/lib/currency`；Intl 语言码必须先过 `toIntlLocale`。
- **金额格式（第十二轮实测）**：参考站余额/消耗/收益/实付这类**金额一律固定 2 位小数**（`$0.00`、`$0.30`、`$1.00`、`实付 60.00 元`），用 `formatQuotaFixed(quota)` 或 `formatCurrencyFromUSD(usd, { fixedFractionDigits: 2 })` / `formatLocalCurrencyAmount(amount, { fixedFractionDigits: 2 })`。反例（保持变长精度、勿改）：模型价格（`$0.014`、`$0.1`）、日志表格金额（`formatLogQuota`，6 位小数）、今日小卡金额（参考站就是 `$0`，不补零）、令牌页「已用 / 剩余」（无货币符号，单位在列头/详情里）。

## 3. 变更记录（倒序）

### 2026-10-01（第四十一轮：模型详情页头部按钮 1:1）
- **用户反馈**：模型详情页右上角按钮样式不对（截图圈出「在线体验 / 复制链接」）。
- **根因**：`CopyButton` 默认 `size='icon'`（`size-9` = 36×36 的圆），详情页把文案作为 children 传进去，于是文案在 36px 圆框外溢出、和「在线体验」胶囊连成一片，看起来像一个带分隔线的组合框；「在线体验」本身也用了 `px-4 + text-sm`，比参考站宽（123px vs 95px）。
- **修复（按参考站实测类名）**：`model-details.tsx` 头部——「在线体验」改为 `h-9 gap-1.5 rounded-full border-border/60 px-2.5 text-[0.8rem]` + `Sparkles size-3.5`（12.8px 文案、10px 内边距，宽度 95px）；「复制链接」的 `CopyButton` 显式传 `size='default'`（得到 `h-9` 高度而非方形），类名 `border-border/60 gap-x-2 rounded-full px-4`（14px 文案、16px 内边距，宽度 114px）。两者仍是 `div.flex items-center gap-2` 里的两个独立胶囊，与参考站一致（参考站实测 95×36 / 114×36，字体 12.8px / 14px，圆角 full，边框 `border-border/60`）。
- **验证**：开发态（5173）与生产（3000，重建镜像后）用 CDP 实测：中文「在线体验」93×36 /「复制链接」114×36（参考站 95×36 / 114×36，差 2px 来自字体渲染），padding、字号、圆角、边框色逐项一致；截图 `/tmp/pw/ge/prod-detail-header-fixed.png`。`bun run typecheck` ✅、`oxlint`/`oxfmt --check` 干净、`bunx vitest run src/features/pricing src/features/models` 16 文件 / 311 例全绿。

### 2026-10-01（第四十轮：模型广场列表视图 1:1 + 模型定价编辑区滚动修复）
- **用户第 1 项（模型广场列表展示复刻）**：先把参考站 `https://gpt.ge/zh/models?view=table` 的真实几何量出来（表宽 1428、表头行 44.5px、数据行 53px、`td` padding `12px 16px`、外层 `overflow-hidden rounded-xl border border-border/40`、表头行 `bg-muted/30`、7 列宽 346.7/291.9/122.3/106/180/252.2/129、每页 30 行 + 底部 `加载更多...` + IntersectionObserver 自动加载、表头无可排序列），再按此重写：
  - `pricing-columns.tsx` 重写为 7 列（模型名＝`CopyButton`（ghost、`h-auto max-w-80 justify-start p-0`、点击只复制不跳转）/ 标签（outline 徽章最多 2 个 + `+N`）/ 上下文（ghost 徽章，无值 `-`）/ 计费（ghost 徽章 `按量`·`按次`）/ 输入输出价格（右对齐等宽 12px `¥1 / ¥4`，按次 `¥0.06/次`）/ 可用率（居中，`mx-auto w-36`）/ 体验按钮（outline `h-7` + sparkles）），列宽常量 `PRICING_COLUMN_SIZES` 取实测值；表头为 `Input/Output {{currency}}/{{unit}}`（货币符号走新增的 `getBillingCurrencySymbol()`）。
  - 新增 `model-table-price-cell.tsx`（单行价格，含动态表达式 / 任务单位 / `$/次` 分支）与 `model-availability-cell.tsx`（24 段 `h-2` 条形 + 11px 百分比，颜色复用 `getSuccessRateDotClass`/`getSuccessRateTextClass`；**无 24h 数据时显示 `—`，不造假数据**）。
  - 新增 `use-model-perf-map.ts`（`GET /api/perf-metrics/summary?hours=24` → `Map<model_name, …>`，卡片与表格共用）、`use-incremental-list.ts` + `load-more-sentinel.tsx`（30 条一页 + IntersectionObserver 自动加载 + `加载更多...`），`model-card-grid.tsx` 改用同一套 hooks。
  - `pricing-table.tsx` 去掉分页器，改用增量加载；行高固定 `53px`（覆盖 `TableBody` 的 `h-15`），每列单独的表头/单元格类名，行加 `role=link` + `aria-label="Details for …"`（整行可点进详情），`model-capability-badges.tsx` 增加 `size/leadingBadges/hideContext`。
  - i18n 新增 `call` / `Copy {{name}}` / `Input/Output {{currency}}/{{unit}}` 三键 × 7 语言（经 `add-missing-keys.mjs` + `bun run i18n:sync`，missingCount 全 0），临时脚本已删除。
  - 验证（CDP 实测）：本项目 7 列宽 356.6/295.2/128.8/111.9/189.3/266.1/90（与参考站同为 auto 布局，差异来自模型名与按钮文案长度）、行高 53、表头 44.5、单元格 12/14px 与徽章 h20 全部对齐；用 CDP 路由拦截伪造 70 个模型 + 24h 可用率验证「首屏 30 行 → 滚到底自动 60 行」「24 段条形 2px/8px/绿黄红」「上下文空值 `-`」「`+N` 徽章」；卡片视图同页对齐。
- **用户第 2 项（模型定价编辑区不能整体滑动）**：根因是第三十九轮之前的 `fillHeight` 只写了 `h-[calc(100svh-var(--app-header-height,0px))]`，而 `Main` 基类自带 `flex-1`（`flex-basis:0%`）——在父级高度为 auto 的纵向 flex 容器里 flex-basis 优先于 `height`，于是编辑面板被撑到内容高度（实测 2709px）、整页而不是面板在滚；又因为面板带 `overscroll-contain`，滚轮停在面板上时既不滚面板也不传给文档，表现就是「只能在空白处滑动」。修复：`section-page-layout.tsx` 的 `fillHeight` 分支加 `flex-none`，让显式高度生效。
  - 验证（开发态 5173 + 生产 3000 均实测）：文档高度＝视口高度（900 / 1000，页面不再出现滚动条），编辑面板 `clientHeight 478/578` 而 `scrollHeight 2709/2725`；用 CDP `Input.dispatchMouseEvent(type=mouseWheel)` 在面板中间滚轮，`scrollTop` 0→400→800→1200 连续增长、`document.scrollingElement.scrollTop` 始终为 0。
- **测试**：`src/features/models/__tests__/model-listing.test.tsx` 的 `CatalogPrice` 传参改用带 `QueryClientProvider` 的 `renderCatalogPrice`（`usePricingColumns` 现在依赖 react-query），并把「后台模型表价格 = 模型广场目录价格」的断言从整串文本相等改为按顺序比对价格数值（广场改为紧凑单行格式后文案本就不同，价格值必须一致这条契约保留）。全量 `bunx vitest run` 180 文件 / 2147 例全绿，`bun run typecheck` ✅，改动文件 `oxlint` / `oxfmt --check` 干净。
- **部署与验证**：`docker build -t new-api:local .` → `docker compose -f docker-compose.local.yml up -d`（new-api + PG15 + Redis 三容器 healthy）。生产 3000 用 CDP 复核：表头 7 列（模型名称/标签/上下文/计费/输入输出 ¥/M/可用率/空）、行高 53、无分页器、仅 2 个模型时不显示加载更多；后台 `/system-settings/billing/model-pricing` 滚动行为同开发态。探针账号 `uicheck37` 已还原 `role=1`（Redis 无其用户缓存）。

### 2026-10-01（第三十九轮：清空内置模型价格）
- **用户要求**：后台「系统设置 → Billing & Payment → Model Pricing」列表里自带的模型价格全部清空，用户会自行初始化。
- **代码（根因：快照会把代码默认表并入列表）**：`setting/ratio_setting/model_ratio.go` 的 `defaultModelRatio` / `defaultModelPrice` / `defaultCompletionRatio` / `defaultImageRatio` / `defaultAudioRatio` / `defaultAudioCompletionRatio` 与 `setting/ratio_setting/cache_ratio.go` 的 `defaultCacheRatio` / `defaultCreateCacheRatio` 全部置空；`setting/billing_setting/builtin_billing.go` 的 `builtinBillingExpr`（`gpt-image-2` / `gpt-image-2.5-sunburst` / `gpt-image-2.5-flare` / `gpt-6-astra` 四个内置表达式）置空。`GetDefaultPricingMaps()` → `defaultPricingMaps()` → `GetModelPricingSnapshot()` 因此在无配置时返回空列表；「重置价格」与模型定价首写建行也只写空表；`InitRatioSettings()` 启动不再预置任何倍率。
- **数据**：PostgreSQL `options` 表 11 个定价键（`ModelRatio` / `ModelPrice` / `CacheRatio` / `CreateCacheRatio` / `CompletionRatio` / `ImageRatio` / `AudioRatio` / `AudioCompletionRatio` / `billing_setting.billing_mode` / `billing_setting.billing_expr` / `billing_setting.plugin_billing_expr`）全部置 `{}`；本地开发库 `data/new-api.db`（SQLite）同样置空。
- **测试**：删除只覆盖内置表达式的 `setting/billing_setting/builtin_billing_test.go`，并移除 `controller/model_management_test.go` 中依赖内置表达式重置的子块。`go build ./...` ✅、`go test ./...`（root module 全量）✅、`gofmt` 干净。
- **验证**：`docker build -t new-api:local .` + `docker compose -f docker-compose.local.yml up -d` 重建重启后，DB 11 键仍为 `{}`（不被启动流程回填）；以临时探针 access token 调管理员接口 `GET /api/option/model_pricing` 返回 `entries: 0`（`options` 11 键均为 `{}`），随后 access token 已还原为 NULL；CDP 真实浏览器（临时把探针账号 `uicheck37` 提升 role=100，验证后已还原 role=1 并删除其 Redis 用户缓存）打开 `/system-settings/billing/model-pricing`，页面显示“No models configured. Use Add model to get started.”、表格 0 行，截图 `/tmp/pw/ge/model-pricing-cleared.png`。
- **行为变化**：未配置价格的模型不再套用内置倍率/单价，relay 会走 `modelPriceNotConfiguredError`（除非用户显式开启“接受未配置价格模型”）；管理员在模型定价页添加模型后即按其配置计费。`getHardcodedCompletionModelRatio`（gpt-*/claude-*/gemini-* 等家族的 completion ratio 兜底）保留未动 —— 它不产生列表条目，如需一并清空需另行确认。

### 2026-10-01（第三十八轮：标签标题始终等于后台系统名称）
- **现象**：刷新时浏览器标签短暂显示 `New API`。根因是 `web/index.html` 的 `<title>New API</title>` 是构建期默认值，页面外壳先到浏览器，`main.tsx` 的 `initSystemBranding()`（`readCachedStatus()` 优先、再用 `/api/status` 刷新）要等 JS 包执行完才改写标题，所以刷新瞬间必然暴露默认值。
- **修复（网关渲染外壳）**：`router/web-router.go` 新增 `renderIndexPage(page, systemName)`，在 SPA 兜底路由返回 `web/dist/index.html` 时把 `<title>` 与 `<meta name="title" content>` 换成 `common.SystemName`（`html.EscapeString` 转义、`ReplaceAllLiteral` 避免 `$` 展开），空名称时原样返回；HTML 仍是 `Cache-Control: no-cache`，改后台站名后下一次请求/刷新即刻生效。前端 `initSystemBranding()` 保留（负责改名后的即时更新与 favicon）。
- **验证**：`router/plugin_router_test.go` 新增 `TestWebIndexPageUsesConfiguredSystemName`（普通名称 + 含 `"`/`<` 的转义两例，走真实 `SetWebRouter` 请求断言，且不再含 `New API`）；`go build ./...` ✅、`go test ./router/... -count=1` ✅、`gofmt` 干净。重建镜像并部署后实测：`curl /` 与深链 `/system-settings/site/system-info` 的原始 HTML 均为 `<title>四维API</title>`、`<meta name="title" content="四维API" />`；CDP 真实浏览器在 `domcontentloaded`（早期）与启动完成后均为 `四维API`。
- **备注**：`web/index.html` 的静态标题保持构建期默认（仅在非 Go 托管/开发服务器下短暂出现），生产由网关每次请求注入。

### 2026-10-01（第三十七轮：移除主页页脚署名行 + 控制台内容区整宽）
- **用户第 1 项（移除页脚署名行）**：`web/src/components/layout/components/footer.tsx` 删除 `ProjectAttribution` 组件与 `NEW_API_FOOTER_ATTRIBUTION_KEY`，页脚不再渲染「© {年} New API. 版权所有，由项目贡献者设计与开发。」。自定义页脚 HTML 分支的右侧块改为只在有协议/隐私文档链接时渲染；默认分支底行改为参考站样式的一行居中：`© {年} {后台系统名称}. {copyright}` + 协议/隐私链接，参考站对应行为 `© 2023-2026 V-API, All rights reserved`。同一行里的「New API」取的是后台「系统设置 → 站点与品牌 → 系统信息」的站点名称，用户改站名后即随之变化。
- **用户第 2 项（1920 折叠后侧边栏与内容之间的间隙 / 分隔线错位）**：根因是 `web/src/styles/theme-presets.css` 里的 `@media (min-width: 1600px) { [data-theme-content-layout='centered'] [data-slot='sidebar-inset'] > * { max-width: 1600px; margin-inline: auto } }`。1600×900 时控制台可用宽度（展开 1344 / 折叠 1552）都小于 1600，钳制不生效所以「正常」；1920×1080 折叠后可用宽度 1872 → 被钳成 1600 并左右各留 136px 空白（展开时只有 32px），于是折叠瞬间出现「很大间隙」，竖线（侧边栏 `border-r`）也就悬在空白带左端。参考站 gpt.ge 控制台是整宽（`main` = 视口 − 侧边栏，内容只吃 `lg:px-20` 内边距），故删除该钳制块；公共页保持各自的 `mx-auto max-w-6xl` 居中容器不受影响（实测参考站首页也是 `max-w-6xl mx-auto`）。
- **实测（CDP 真实浏览器 + 真实账号）**
  - 修复前 1920×1080 折叠：`[data-slot=sidebar-inset]` x=48 w=1872，但内部内容容器被钳到 x=184 w=1600 margin 136px；修复后：内容容器 max-width=none、margin 0，首屏内容从 x=128 开始（和参考站 1920 折叠时的 128 完全一致）。
  - 1600×900 展开/折叠、1920×1080 展开 `[data-slot=sidebar-gap]`/`container` 宽度与参考站逐项比对一致（折叠 48px、展开 256px，容器 y=64 h=calc(100svh−4rem)，与参考站 `fixed inset-y-0 h-svh` 的可见部分等价）。
  - 首页 `/` 页脚实测只剩 `© 2026 New API. All rights reserved.`（英文界面）一行居中，署名行消失。
- **验证**：`bun run typecheck` ✅、`bunx oxlint`（改动文件仅剩既有 `no-danger` 警告）✅、`bunx oxfmt --check` ✅、`bunx vitest run` 180 文件 / 2147 例全过 ✅、`docker build -t new-api:local .` + `docker compose -f docker-compose.local.yml up -d` 三容器 healthy ✅（PG/Redis 数据保留）。
- **清理**：复现用的临时账号 `sidebarprobe`（含 `user_sessions`）已从 PostgreSQL 删除，库内只剩用户自己的 root 账号；本轮截图与脚本在 `/tmp/pw/r37-*`、`/tmp/pw/probe-collapse.mjs`。
- **待确认**：参考站侧边栏竖线会穿过顶栏带（其容器 `fixed inset-y-0 h-svh`，顶栏半透明），本项目竖线止于顶栏下沿（`top: var(--app-header-height)`）。若需要连这点也 1:1（竖线到顶），改 `web/src/components/ui/sidebar.tsx` 容器为 `fixed inset-y-0 h-svh` 即可。

### 2026-10-01（第三十五轮：内容后端发布 + 工单 WebSocket 实时会话 + 功能开关 + 创作/登录态修复）
- **用户第 1 项（补齐后端能力）**：
  - 订单/发票：`/api/user/topup/self`、`/api/invoice`、`/api/invoice/eligible` 用真实数据 curl 实测通过（本机 2 笔充值 / 1 张待审发票），前端调用路径已对齐（`/api/user/topup/invoice*`、`/api/user/topup/clear`）。
  - 文档 / 帮助中心 / 博客**后端发布**（新增）：`model/content_item.go`（`content_items` 表：kind × locale × slug 唯一、status=published/draft、sort_order、data JSON 载荷）+ `controller/content.go` + 路由：公开 `GET /api/content/:kind`、`GET /api/content/:kind/:slug`；管理 `GET|POST /api/content/admin/:kind`、`PUT|DELETE /api/content/admin/:kind/:id`、`POST /api/content/admin/:kind/import`（按 kind+slug 覆盖导入）。kind = `doc` / `blog` / `faq` / `tutorial` / `tutorial_category`，分别归属顶栏 `docs` / `blog` / `help` 开关（关闭时公开接口 403）。
  - 前端读取改为接口优先、内置内容兜底：`web/src/features/help/lib/content-api.ts` + `hooks/use-content.ts`（React Query，key `['site-content', kind]`；接口无已发布内容或不可用时回退 `content/*.json`），`blog-pages` / `doc-pages` / `help-center` / `tutorial-*` 全部改用 hooks。
  - 后台发布界面：系统设置 → 内容 → **内容发布**（`publishing-section.tsx`）：类型 Tab、标题/标识/分类/状态/排序/JSON 内容编辑弹窗、删除确认、分页、搜索、**导入内置内容**（把内置 docs/blog/faq/tutorial 一键写库，FAQ 用内容哈希生成稳定 slug）。
- **用户第 2 项（管理员工单改对话 + WS）**：
  - 后端：`service/ticket_hub.go`（进程内订阅中心，按「管理员广播 + 工单所有者定向」分发 `ticket.created` / `ticket.reply` / `ticket.updated`）+ `controller/ticket_ws.go`（`GET /api/ticket/ws`、`GET /api/ticket/admin/ws`，30s ping / 70s pong 超时 / 慢消费者丢帧）+ `middleware/ws_auth.go`（浏览器 WebSocket 不能带 Authorization 头，access token 走 `Sec-WebSocket-Protocol` 第二个子协议 `newapi.ws.v1` 传入，避免 token 进访问日志，仍复用原有鉴权/角色/审计链路）。工单创建、用户回复、客服回复、关闭、改状态/优先级全部触发广播。
  - 前端：`use-ticket-socket.ts`（断线指数退避重连）驱动缓存失效；`/admin/tickets` 改为**双栏会话工作台**（左列表 + 右对话面板，`admin-ticket-conversation.tsx`，含状态/优先级与回复框），新工单、新回复、状态变化自动刷新，无需手动刷新或跳转；`/admin/tickets/{id}` 复用同一工作台并预选该工单；用户端 `/tickets` 同样接入 WS，客服回复实时出现在会话里。开发代理补 `ws: true`（`rsbuild.config.ts`）。
- **用户第 3 项（模型广场）**：卡片点击改为挂在 Card 根 `onClick`（去掉标题按钮的 `before` 全卡伪元素与覆盖层重复点击），Try / 复制按钮 `stopPropagation`；CDP 实测点击卡片底部空白 → `/pricing/deepseek-flash`。筛选条自第三十六轮起已在工具栏卡片内部（与参考站一致：厂商行 + 筛选行 + 搜索）；参考站工具栏本身带网格/列表「展示方式」切换，本机保留该按钮（如需隐藏请说明）。
- **用户第 4 项（降级管理员）**：后端 `CountRootUsers()` + demote 分支（普通管理员与 Root 均可降级，仅剩最后一个 Root 时拒绝并报 `user.cannot_demote_last_root_user`），前端对 Root 也显示「降级」；curl/CDP 实测 promote→demote 往返正常，角色已还原（lhp/laoban=100，uicheck01=1）。
- **用户第 5 项（功能开关）**：`console_setting` 新增 `orders_enabled` / `invoices_enabled` / `tickets_enabled`（默认开），`/api/status` 暴露；新增 `middleware.RequireConsoleFeature`：工单（用户+管理员）、发票接口在关闭时直接 403；前端新增 `lib/console-features.ts`，侧边栏（`use-sidebar-config`）按开关隐藏「订单 / 发票」「工单」入口，`/tickets`、`/admin/tickets`、`/orders` 发票 Tab 与路由守卫同步生效；系统设置 → 内容 → **功能开关** 三个开关即时保存。文档/博客/帮助中心沿用既有 `HeaderNavModules` 开关（后端 `HeaderNavModuleEnabled` + 前端路由守卫）。
- **用户第 6 项（`crypto.randomUUID is not a function`）**：新增 `web/src/lib/uuid.ts`（`crypto.randomUUID` 不可用回退 `getRandomValues` / `Math.random`，注释说明非安全场景），`use-studio-chat.ts` 两处替换；CDP 实测登录后在 `/studio/chat` 发送「你好」→ `deepseek-flash` 真实回复，无报错。
- **用户第 7 项（已登录仍提示登录）**：`use-top-nav-links.ts` 里 Studio 聊天/生图/视频三个入口 `requiresAuth: true` → `!isAuthed`；CDP 实测登录态点「创作 → 聊天」直接进入 `/studio/chat`，不再弹登录框。
- **验证**：
  - 后端：`go build ./...`、`go vet ./model/... ./controller/... ./service/... ./middleware/...`、`go test ./model/... ./service/... ./middleware/... ./router/...` 全通过。
  - 三库验证（`content_items` 新表，按 AGENTS 要求）：SQLite（本机 `data/new-api.db`）、PostgreSQL 16.15（临时库 `newapi_verify`）、MariaDB 10.11.18（临时 datadir/3307）——三库均 AutoMigrate 建表成功（唯一索引 `(kind,locale,slug)` + `status` 索引），插入数据后公开接口可读，二次启动迁移幂等、数据保留、无 FATAL；验证用的库、datadir 与二进制已清理。
  - 前端：`bun run typecheck`、`bunx oxlint`（改动文件 0 报错）、`bunx vitest run` 180 文件 / 2140 用例全通过、`bun run build` 通过；i18n 走脚本新增 32 key × 7 语言并 `bun run i18n:sync`。
  - CDP 实证：内容发布（导入内置文档 → 公开 `/doc` 显示 3 篇真实文档）、工单 WS（新建工单/客服回复在管理端与用户端**不刷新即出现**）、功能开关（关闭工单 → 侧边栏入口消失 + `/tickets` 跳首页 + 接口 403；发票关闭 → `/api/invoice` 403，均已还原）。
  - 补充加固（本轮回归）：`/admin/tickets` 与 `/admin/tickets/$ticketId` 增加 `ROLE.ADMIN` 守卫（此前普通用户可直接打开管理员工作台外壳，数据接口虽 403 但页面结构暴露）；CDP 实测普通用户访问 → `/403`。
  - 回归复核：`go build ./...`、`go vet`、`go test ./model/... ./service/... ./middleware/... ./router/... ./controller/...` 全通过；`bun run typecheck`；`bunx vitest run` 180 文件 / 2140 例；`bun run build`；CDP 复核内容发布（3 篇已发布文档）、功能开关、管理员工单工作台（用户 API 回复不刷新即出现在会话中）、模型卡片点击 → `/pricing/deepseek-flash`。临时 i18n 脚本已删除；`uicheck01` 已通过 demote 接口实证降回普通用户；`orders_enabled`/`invoices_enabled`/`tickets_enabled` 均为 true。
  - 视频封面补全 E2E 复核（第三十四轮队列）：真实 MP4（991017B）上传 → IndexedDB 写入「无封面已完成视频」→ 真实浏览器打开 `/studio/video`，队列自动产出封面 `studio_video/*.webp`（58062B，与第三十三轮同源抽帧结果一致），落盘 + 画廊卡片 poster 正常显示；缺失源（404）路径按 `source_not_found` 一次即停用（`coverRetryDisabled=true`），无死循环重试。`bunx vitest run src/features/studio` 9 文件 / 54 例全过；探针记录与临时文件已清理。
  - 服务端封面抽帧（第三十六轮，补齐第三十三轮遗留差异②）：新增 `POST /api/user/oss/video-cover`（`controller/user_oss.go` + `service/studio_video_cover.go`）。真实浏览器无法解码的视频（实测 HEVC/hvc1，`canPlayType` 为空）由网关用 ffmpeg 抽帧：`thumbnail=100` 取代表帧 + 最长边 640（`force_divisible_by=2`），优先 WebP（libwebp quality 80），无 libwebp 的构建回退 JPEG，首帧不可用时补一次 `-ss 1`；结果写入调用方存储（场景 `studio_video`）并返回 `{url, cover_url}`。ffmpeg 缺失时返回 `user_oss.video_cover_unavailable`（前端按 24h 慢重试，便于管理员补装），下载/转码失败返回 `user_oss.video_cover_failed`（含 `download failed with HTTP status 404` 等可分类文本）；URL 走 `ValidateSSRFProtectedFetchURL`，网关本地附件按路径直读不联网，视频上限 32MB，单次转码 60s 超时，二进制路径可用 `STUDIO_FFMPEG_PATH` 覆盖。前端 `generateStudioVideoCover` 现在「浏览器抽帧 → 网关转存后再抽帧 → 服务端 ffmpeg 抽帧」三级回退，返回值改为 `{coverUrl, url?}`，重试队列会把服务端转存后的视频地址写回记录；分类器新增 `server_cover_unavailable`（24h 重试）。
  - 服务端封面 E2E 实证：本机安装静态 ffmpeg（`/usr/local/bin/ffmpeg`，验证用，生产需自行安装）后，① curl 真实 MP4（991017B）→ 70ms 产出 640×360 WebP（3350B，`view_image` 确认为真实画面）；② 缺失源 → `download failed with HTTP status 404`；③ 无 token → 401；④ 真实浏览器写入 HEVC 探针（122018B）→ 浏览器抽帧失败 → 自动回调 `/api/user/oss/video-cover` → 2s 内记录获得封面，画廊卡片 poster 正常。Go 侧新增 `controller/user_oss_video_cover_test.go`（stub ffmpeg 写帧、缺 ffmpeg、非法源 3 例）；前端新增 7 例（studio-upload 4 + classifier 2 + 队列写回 1），`bunx vitest run src/features/studio` 9 文件 / 61 例全过；探针记录与临时文件已清理。
- **剩余差异 / 待确认**：① 内容发布目前以「JSON 载荷 + 结构化字段」存储，没有富文本/Markdown 可视化编辑器（参考站的发布能力未知，按最小可用实现）；② 关停某内容类型后，若接口返回空则前端回退内置内容，只有显式关闭顶栏模块才会隐藏页面；③ 模型广场「展示方式按钮不显示」如指真的隐藏视图切换，请确认后处理。

### 2026-10-01（第三十四轮：视频封面重试队列 1:1）
- **参考站采集**（反编译 `0ga9zl2pcvx15.js`（视频页）/ `19j53enicez41.js` / `0twgo4efwtifa.js` 的模块 100608 / 63925）：
  - 入队：`useEffect(artworks)` 里遍历作品，`attempts + queue.size >= 4` 即停止；只收 `kind==='video' && status==='done' && url && !coverUrl && !coverRetryDisabled` 且未到 `videoCoverNextAttemptAt` 的记录。
  - 执行：worker `Z()` 用 `requestIdleCallback({timeout:3000})`（无该 API 时 `setTimeout 750`）串行处理；每条先重读记录并校验 `status/url` 未变，写 `coverAttemptedAt/coverAttemptCount`，生成成功后写 `coverUrl` + 清空重试状态（`clearedVideoCoverRetryState`）。
  - 失败分类 `videoCoverRetryDecision(error, attempt, random)`：429/限流 → 90s±20%（下限 60s）；413/源文件过大 → `source_too_large` 停用；非法 URL/协议 → `invalid_source_url` 停用；404/410 → `source_not_found` 停用；401/403 文本 → `source_forbidden` 停用；`no video stream` → 停用；HTTP 401/403 → `authorization` 1h；400/415/不支持媒体 → `unsupported_source` 停用；解码/ffmpeg/`封面生成失败` → 前两次 2h、第 3 次 `decode_failed` 停用；OSS/桶/签名/上传失败 → `storage_unavailable` 24h；超时/408/504 → `[5m,30m,2h,24h]`；≥500 → `service_unavailable` 同阶梯；其它 → `transient_failure` 同阶梯。
  - `videoCoverNextAttemptAt = coverNextAttemptAt ?? coverAttemptedAt + 24h`；生成完成时写入的初始状态为「30 分钟后可重试」。
- **本机实现**：
  - `web/src/features/studio/lib/video-cover-retry.ts`（新）：`videoCoverNextAttemptAt` / `videoCoverRetryDecision` / `initialVideoCoverRetryState` / `clearedVideoCoverRetryState`；HTTP 状态同时从 `status`、`response.status` 与 `HTTP status N` 文本解析；解码类正则额外匹配本机英文文案 `cover generation failed`。
  - `web/src/features/studio/hooks/use-video-cover-retry.ts`（新）：`useGenerations()` 变化时入队（每会话上限 4 次尝试），空闲调度串行执行，`getGeneration(id)` 重读校验，成功后 `updateGeneration({coverUrl, ...cleared})`，失败按决策写 `coverNextAttemptAt/coverRetryDisabled/coverLastErrorCode`。
  - `web/src/features/studio/lib/studio-upload.ts`：新增 `generateStudioVideoCover(url,{headers})`（fetch → `extractVideoCover` → 上传 `studio_video`；浏览器读不到源时先经 `POST /api/user/oss/object` 转存再抽帧；失败抛错驱动重试）与 `studioVideoHeaders(url,tokenId)`（从收藏 hook 提到共享位置，`/v1/videos/*` 记录带令牌）；`transferStudioObject` 抽出复用。
  - `web/src/features/studio/lib/generations.ts`：`StudioGeneration` 增加 `coverAttemptedAt/coverAttemptCount/coverNextAttemptAt/coverRetryDisabled/coverLastErrorCode`，新增 `getGeneration(id)`。
  - `web/src/features/studio/video/index.tsx` 挂载 `useVideoCoverRetry()`；`use-artwork-favorite.ts` 改用共享 `studioVideoHeaders`。
- **测试**：`lib/__tests__/video-cover-retry.test.ts`（新，9 例：下次重试时刻、初始/清空状态、429/413/404/非法协议/无视频流/解码/超时/存储/授权/5xx/未知分类）；`hooks/__tests__/use-video-cover-retry.test.tsx`（新，3 例：补齐封面并清状态、失败写退避、已有封面/已停用/未到时间/运行中跳过）。
- **CDP 实证**：注入真实 MP4 记录（`/api/studio/oss/file/studio_video/…mp4`，无封面）→ 打开 `/studio/video` 后自动补封面 `…_07239a2b.webp`（HTTP 200 / `image/webp` / 640×360 / 58062B），重试字段全部清空；再注入指向不存在 key 的记录 → 一次尝试后 `coverLastErrorCode=source_not_found`、`coverRetryDisabled=true`（不再重试）；两条探针记录与文件已删除，`data/studio-uploads` 已清空。
- **剩余差异 / 未做**：① 参考站卡片的「封面重试中/失败」可视状态（`coverAttemptCount`/`coverRetryDisabled` 在卡片上的提示）未复刻，当前只在数据层重试；② 参考站在生成完成时也会预置 30 分钟重试状态（`initialVideoCoverRetryState`），本机已实现该状态写法但仅在画廊渲染时兜底触发；③ 会话内尝试上限（4 次/挂载周期）与参考站一致，但参考站的 `attempts` 是会话级全局计数，本机为每次挂载重置。

### 2026-10-01（第三十三轮：创作中心媒体转存个人桶 + 视频封面 + 收藏转存）
- **参考站采集**（反编译 chunk `/tmp/pw/ge-chunks-r33/`，主要 `0rrwbsnpw4z2a.js`；未再重复抓包）：
  - 参考站上传三接口：`GET /api/user/oss/url?fileName&contentType&contentLength[&contentHash][&scope=own][&scene]` → `{request_url,oss_url,exists,headers}` 后浏览器 `PUT` 直传；`POST /api/user/oss/object {url,scene,allow_platform}` → `{url,cover_url}`（服务端把上游媒体转存）；`POST /api/user/oss/video-cover {url,allow_platform,transfer_video}` → `{url,cover_url}`。
  - `uploadPreferOwn`：有个人桶时优先 `own:true`，否则平台桶；`isAllowedFile` = `/\.(png|jpe?g|gif|webp|bmp|avif|pdf|docx?)$/i` 且 MIME 属于 image/pdf/word；附件 accept = `.png,.jpg,.jpeg,.gif,.webp,.bmp,.avif,.pdf,.doc,.docx`。
  - 生成完成后调用 `transferArtworkMediaToOwnOss`（scene `studio_image` / `studio_video`）；视频额外 `generateVideoCover`（客户端 canvas 抽帧，失败才回退 `video-cover` 接口）。
- **后端**：
  - `service/studio_storage.go`（新）：`StudioMediaTarget`（`Config/Scene/Ext/ContentType/Size/LocalURLBase`）、`StudioObjectKey(scene,ext)` = `<scene>/<unixMilli>_<8hex><ext>`、`StoreStudioMedia(ctx,target,reader)`（有桶 `objstore.Put` 返回公网 URL，无桶写 `data/studio-uploads` 返回 `<LocalURLBase>/api/studio/oss/file/<key>`）。
  - `controller/user_oss.go`：`UploadUserOss` 改用 `storeUserOssMedia`（与转存共享 key 生成与本地兜底）；新增 `TransferUserOssObject`（`POST /api/user/oss/object`，JSON `{url,scene}`）——本站网关 URL / 个人桶 URL 原样复用；否则 `openUserOssTransferSource`（本地附件直接 `os.Open`，远程走 `service.DoDownloadRequest` 受 SSRF 保护）→ `StoreStudioMedia`；32MB 上限，失败返回 `i18n.MsgUserOssTransferFailed`。
  - `router/api-router.go`：selfRoute 注册 `POST /oss/object`（`UserCriticalRateLimit("user-oss-transfer")`）。
  - i18n：新增 `MsgUserOssTransferFailed`（`en` / `zh-CN` / `zh-TW` = `Media transfer failed: {{.Error}}` / `媒体转存失败：{{.Error}}` / `媒體轉存失敗：{{.Error}}`）。
- **前端（收藏转存）**：参考站 `toggleArtworkFavorite` 在收藏时若媒体还不在自有 OSS 就 `transferToOwnOss(url, scene)`（失败回滚收藏 + toast）；`0twgo4efwtifa.js`/`19j53enicez41.js` 实测 `getUserOssCached() → configured` 判定 + `isOwnOssUrl()` 跳过。本机实现 `web/src/features/studio/hooks/use-artwork-favorite.ts`（新）：收藏时先落库，未存储的媒体走 `persistStudioMedia` / `persistStudioVideo`（视频会带 `item.tokenId` 取真实 key，供 `/v1/videos/{id}/content` 直读），转存后写回 `url`/`coverUrl`；全部路径失败则回滚收藏并 toast `Failed to update favorites. Please try again later.`。差别：参考站在**未配置个人桶**时直接弹「需要配置存储」对话框并拒绝收藏，我们用网关本地兜底（与第三十二轮上传策略一致），因此不弹该对话框。图片页 / 视频页的卡片与查看器收藏按钮已统一改走该 hook。
- **前端**：
  - `web/src/features/studio/lib/studio-upload.ts`：新增 `persistStudioMedia(url,scene,{headers,fileName})`（已在本站存储 → 原样返回；否则浏览器 `fetch` 拿 blob → `uploadStudioFile`（个人桶优先）；跨域失败 → `POST /api/user/oss/object`；再失败返回原 URL）与 `persistStudioVideo(url,{headers,fileName})`（fetch 流 → 上传 `studio_video` → `extractVideoCover` → 封面同样上传；失败回退 `oss/object` 的 `cover_url`；最后回退原 URL）；`isStoredStudioMedia` 同时识别相对与绝对（含 `ServerAddress` 端口）的 `/api/studio/oss/file/` URL，避免重复转存。
  - `web/src/features/studio/lib/video-cover.ts`（新）：`extractVideoCover(blob)` 按参考站算法抽帧 —— 依次 seek 到 `0.002s / 5% / 15%`（短片段下限 0.1s / 0.5s，间隔 <0.01s 去重），每帧用 32×32 缩略图做「有意义帧」判定（可见像素 ≥90% 且 `亮度极差 ≥10` 或 `方差 ≥9`，跳过黑帧/透明帧/纯色帧），输出最长边 ≤640px（`imageSmoothingQuality: high`）、优先 `image/webp` 回退 `image/jpeg`（质量 0.8），元数据 12s / 单次 seek 1.5s 超时；`coverSeekTimes` 与 `isMeaningfulFrameData` 导出以便单测。
  - `image/index.tsx`：MJ `SUCCESS` 分支先 `await persistStudioMedia(data.imageUrl,'studio_image')` 再写入作品 URL；`video/index.tsx`：`completed` 分支 `await persistStudioVideo('/v1/videos/{taskId}/content',{headers:{Authorization:Bearer key}})`，写入 `url` + `coverUrl`。
- **测试**：`web/src/features/studio/lib/__tests__/studio-upload.test.ts`（新，8 例）：网关相对/绝对 URL 复用（零请求）、个人桶 URL 复用、浏览器直传、服务端转存回退、全失败保 URL、视频无封面降级、视频已存复用；`web/src/features/studio/hooks/__tests__/use-artwork-favorite.test.tsx`（新，5 例）：取消收藏不动媒体、已存储媒体跳过转存、图片收藏转存并写回 URL、视频转存带 token 与封面、全失败回滚收藏。；`web/src/features/studio/lib/__tests__/video-cover.test.ts`（新，8 例）：抽帧时间点（未知时长/长片/短片/去重）+ 帧有效判定（空/全透明/纯黑/纯灰/半透明拒绝，有对比接受）。
- **验证**：`go build ./...` ✅；`go test ./controller/... ./service/... ./relay/helper/...` ✅；`cd relaykit && GOWORK=off go build ./... && GOWORK=off go test ./relayconvert/...` ✅；`gofmt -l`（改动文件）无输出；`bun run typecheck` ✅；`bunx oxlint` / `bunx oxfmt --check`（改动文件）✅；`bunx vitest run` 178 文件 / 2128 例全通过 ✅；`bun run build` ✅。
- **CDP 实证（视频封面）**：真实 MP4（`sample_640x360.mp4` 991017B / `sample_1280x720.mp4` 17436118B）经 5173 取回后 `extractVideoCover` 分别产出 `video_cover_*.webp` 640×360（58062B / 58642B，平均亮度 98 / 104，非黑帧），1280×720 源被压到 640×360 验证了最长边上限；耗时 77~85ms；探针与临时视频文件已删除。
- **CDP 实证（收藏）**：向 5173 的真实 IndexedDB 写入一条真实记录（`url=https://www.gstatic.com/webp/gallery/1.jpg`）→ 点卡片收藏（`button[aria-label="收藏"]`）→ 记录变为 `http://10.10.10.100:5173/api/studio/oss/file/studio_image/1790833150902_022b8a61.jpg` / `favorite=true`，网络为真实 `POST /api/user/oss/object`，落盘文件下载 200 / `image/jpeg` / 44891B；探针记录已删除、`data/studio-uploads` 已清空。
- **CDP 实证**（真实浏览器 + 真实后端，探针用后即删）：`persistStudioMedia('<origin>/api/studio/oss/file/...')` 与 `persistStudioVideo(...)` 命中「已存储」时网络请求 0 次（`elapsed 0ms`）；`https://www.gstatic.com/webp/gallery/1.jpg` → 转存为 `http://10.10.10.100:5173/api/studio/oss/file/studio_image/...jpg`，下载 HTTP 200 / `image/jpeg` / 44891B；上一轮已用真 MP4（991017B）验证 `persistStudioVideo` 返回视频 + 640×360 JPEG 首帧封面（62448B，`view_image` 确认为 Big Buck Bunny 首帧）。测试文件已从 `data/studio-uploads` 清理。
- **剩余差异 / 未做**：① 参考站的 `GET /api/user/oss/url` + 浏览器 `PUT` 直传（签名 URL）未实现 —— 本站个人桶写入统一走 multipart 上传到网关再 `objstore.Put`；`scope=own` / `contentHash` 秒传去重、`allow_platform` 平台桶回退参数未实现；② 客户端抽帧已按参考站算法对齐（多采样点 + 有意义帧判定 + 640px + WebP 优先，第三十三轮；失败退避重试第三十四轮已补齐）；`POST /api/user/oss/video-cover` 服务端抽帧接口未实现（参考站仅在客户端抽帧失败时回退它，本站用「转存后再由浏览器抽帧」替代）；③ 分享链路的 `uploadLocalMedia` → `uploadStudioShareMedia` 仍只写本地 capability 存储（收藏已在本轮改为转存自有存储）；参考站的「未配置桶则弹框并拒绝收藏」未复刻（我们用本地兜底）；④ 参考站还会在画廊展示时对「已有记录但媒体未转存」做一次补转存（`transferArtworkMediaToOwnOss`，含视频封面补生成与失败退避），我们只在生成完成与收藏两个时机转存。

### 2026-10-01（第三十二轮：创作中心 `/studio/chat` 附件链路打通 + chip 1:1）
- **参考站采集**（CDP 真实浏览器；几何脚本 `/tmp/pw/r32-ge-chip-measure*.mjs`，抓包 `/tmp/pw/r32-ge-openai-attach.mjs`）：
  - composer chip：图片为纵向 `w-20`（80×80，media 62×62 = `p-2` + `aspect-square w-full`，**不渲染文件名**）；其它文件为横向 `min-w-40 items-center gap-2.5 p-1.5 px-2 text-xs`（media `size-8`）；同一行时横向 chip 会被拉伸到行高（与图片 chip 同排实测 170×80）。
  - chip DOM：`[data-slot=attachment][data-state=done|uploading|error][data-size=sm|default][data-orientation=horizontal|vertical]` → `[data-slot=attachment-media][data-variant=icon|image]` + `[data-slot=attachment-content]>[data-slot=attachment-title]`（纵向无 content）+ `[data-slot=attachment-actions]>button[data-slot=attachment-action][data-variant=ghost][data-size=icon-xs]`（`size-6` 圆角按钮，**常显**；纵向时 `absolute top-3 right-3`）。
  - 附件行：composer = `flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain py-1`（横向滚动、不换行）；消息气泡 = `max-w-[85%] justify-end gap-3 overflow-x-auto overscroll-x-contain py-1`，消息内图片 chip `w-28`（112×112）。
  - 参考站请求体（`/api/play/chat/completions`）：文件 = `{"type":"file","file":{"filename":"x.txt","file_data":"https://oss.../x.txt"}}`（**URL 放在 `file_data`**），图片 = `{"type":"image_url","image_url":{"url":"https://oss.../x.png"}}`；Claude 模型另走 `/v1/messages` 的 `document.source.url`。
  - 参考站自身也会因上游取不到附件而失败（实测 txt 附件在 `claude-sonnet-5-5` 报 `The file format is invalid or unsupported`，在 `gpt-5-mini` 报 `error counting image token`），说明该链路依赖「上游能下载到的公开 URL」。
- **后端**：
  - `controller/user_oss.go`（新）：`GET /api/user/oss`（是否配置个人桶）、`POST /api/user/oss/upload`（multipart `file`+`scene`，32MB 上限，scene/扩展名正则；有个人桶 → `objstore.Put` 返回公网 URL，无桶 → 落 `data/studio-uploads/<scene>/<ms>_<8hex><ext>` 并返回 `<ServerAddress>/api/studio/oss/file/<key>`）、公开 `GET /api/studio/oss/file/*key`（随机对象名即能力、`nosniff` + `Cache-Control: public, max-age=86400`）。`router/api-router.go` 注册，上传挂 `UserCriticalRateLimit`。
  - `service/studio_upload.go`（新）：网关附件目录（`STUDIO_UPLOAD_DIR` 可覆盖）、key 校验（扩展名可缺省）、`StudioUploadLocalPath()`；`service/file_service.go` 抽出 `readFileBytes`/`buildCachedFileData`/`sniffMimeType`，`URLSource` 命中网关自身附件时**直接读盘**，不再回访自己的私网地址/非标准端口（此前会被 SSRF 端口策略拒绝：`port 5173 is not allowed`）。
  - `relay/helper/attachment_content.go`（新）：`MaterializeLocalAttachments`（转换前把「只有本机可达」的附件 URL 内联成 data URL，文件与图片都处理，远程 URL 原样保留）+ `InlineFileURLContent`（OpenAI 兼容上游无法取 URL，剩余的 URL 形态 file 部分统一内联 base64）。`relay/compatible_handler.go` 在转换前调用前者、转成 OpenAI 形态后调用后者。
  - relaykit：`dto.MessageFile` 新增 `file_url` 并支持解析；`oai_chat/to_claude_messages_req.go` 把 URL 形态的 file 部分转成 Claude `document.source.url`（`.png/.jpg/.jpeg/.gif/.webp` 时为 `image`），同时兼容参考站把 URL 放在 `file_data` 的写法；`MessageImageUrl.MimeType` 补 `json:"mime_type,omitempty"`（内联重写后不再向上游泄漏 `MimeType:""`）。
- **前端**：
  - `web/src/components/attachment-chip.tsx` 按参考站 DOM/尺寸重写（`data-slot`/`data-state`/`data-size`/`data-orientation`、横向 sm、纵向 default、图片 chip 无文件名、上传中 spinner + 灰字、失败红边、动作区 `Button variant=ghost size=icon-xs` 常显）。
  - `studio-chat-input.tsx`：附件行改横向滚动 `gap-3`；上传中占位 → `uploadStudioFile()` 成功后替换真实 URL；支持拖拽任意文件；失败时图片回退 dataURL、其它 toast。`studio-upload.ts`：20MB 前端上限 + multipart 上传。
  - `message-utils.ts`：附件按参考站形态发送（文件 `file_data=<URL>`、图片 `image_url.url`），上传中的附件不进入请求；消息气泡附件行 `max-w-[85%] justify-end`，图片 chip `w-28`。
- **测试**：`relay/helper/attachment_content_test.go`（2 例：私网 file/image 内联为 data URL 且远程 URL 保持原样、`file_url` 本地内联）；relaykit `TestOpenAIChatRequestToClaudeMessagesForwardsFileURLsAsURLSources` 增加 `file_data=<URL>`（studio 形态）用例；`message-utils.test.ts` 3 例。
- **验证**：`go build ./...` ✅；`cd relaykit && GOWORK=off go build ./... && GOWORK=off go test ./relayconvert/...` ✅；`go test ./controller/... ./service/... ./relay/helper/...` ✅；`bun run typecheck` ✅；`bunx oxlint` + `bunx oxfmt --check`（改动文件）✅；`bunx vitest run` 175 文件 / 2107 例 ✅；`bun run build` ✅；CDP 实测 5173 `/studio/chat`：上传 png+txt 后 chip = 80×80（media 62×62、无文件名）/166×80（对齐参考站 80×80、170×80），发送后上游请求体图片已内联为 `data:image/png;base64,...`，`deepseek-flash` 正确回答「橙色」；测试上传文件已从 `data/studio-uploads` 清理。
- **剩余差异 / 未做**：① 本机只有 DeepSeek 渠道，`file` 部分上游不支持（直接 curl 上游确认返回 `file must have a file_id or file_data`），因此 **Claude `document` 链路只做了 relaykit 单测，未在真实 Claude 渠道端到端验证**；② 参考站 chip 的 `shimmer` 骨架动画与 `scroll-fade-x` 渐隐未实现（用 `animate-pulse` / 普通横向滚动替代）；③ 参考站的 `data-state=processing`（上传后处理）状态本站在无桶时没有等价步骤。

### 2026-10-01（第三十一轮：模型广场徽章补齐 `弃用 / 别名 / 逆向 / 泛模型`）
- **参考站采集**（CDP 真实浏览器：标签筛选 + 卡片/详情页徽章 HTML，结果 `/tmp/pw/r31-tagcards.json`、`r31-tagcards2.json`、`r31-tags-dict.json`）：
  - 卡片底部顺序 = `[NEW]` → 计费徽章（`按量/按次/按秒`）→ **展示标签** → 能力标签（最多 2 个 + `+N`）→ 上下文长度徽章（`secondary`）；展示标签与能力徽章同款 outline（`h-4.5 border-border/40 text-[10px] font-medium text-foreground`）。
  - 展示标签 = 标签字典里 `is_display=true` 的那批（`联网 / 泛模型 / 别名 / 逆向 / 弃用` …），按 `sort_order` 排在计费徽章之后；其余标签按模型 `tag_ids` 顺序进右侧能力组（实测 `gpt-image-2-c` = 按次 + 逆向 + 文本对话 + 图片生成 + `+1`；`nano-banana-2` = 按量 + 别名 + 文本对话 + 图像分析 + `+1`；`gemini-3.1-pro-preview-thinking-*` = 按量 + 泛模型 + `1M`）。
  - 详情页头部同样先渲染展示标签（outline `h-5 text-xs border-border/60`），如 `gpt-3.5-turbo-instruct` = `弃用` + `文本对话`。
  - 参考站标签字典共 36 条（含 `is_display` / `sort_order`），四类徽章文本就是字典里的中文名，无英文翻译（`/zh/models` 与 `/models` 均为中文）。
- **本轮改动**：
  - `web/src/features/pricing/lib/capability-badges.ts`：抽出 `splitTags()` 复用；新增 `META_TAG_RULES` + `getMetaTagBadges()`，把 `泛模型 / 别名 / 逆向 / 弃用`（兼容英文 `generic model / alias / reverse-engineered / deprecated`）识别为展示标签。
  - `web/src/features/pricing/components/model-card.tsx`：展示标签渲染在 `NEW` + 计费徽章 + `联网` 之后、能力徽章之前，样式与参考站逐类一致。
  - `web/src/features/pricing/components/model-details.tsx`：头部能力徽章前插入同一组展示标签。
- **i18n**：新增 `Generic model` / `Alias` / `Reverse-engineered` 3 键，并把 zh / zh-TW 的 `Deprecated` 由 `已弃用` / `已棄用` 改为参考站徽章用字 `弃用` / `棄用`；经临时 `scripts/add-missing-keys.mjs` 写入 7 语言后 `bun run i18n:sync`（报告 missing/extras = 0），临时脚本已删除。
- **测试**：`src/features/pricing/__tests__/model-cards.test.tsx` 新增 1 例（四类展示标签渲染且顺序在能力徽章之前、未识别标签不渲染）。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json` + `bunx oxfmt --check`（4 个改动文件）✅；`bunx vitest run` 174 文件 / 2104 用例全通过 ✅；`bun run build` ✅；CDP 实测 5173 `/pricing` 与 `/pricing/deepseek-flash`（临时把 `models.tags` 设为 `泛模型,别名,逆向,弃用,开源权重,1M` 截图核对，验证后已还原为 `推理,工具,文件,开源权重,多模态,1M` 并重启后端确认）。
- **剩余差异**：模型广场/详情页的「分组描述」仍依赖后台「分组说明」配置（未配置显示 `-`）。

### 2026-10-01（第三十轮：个人中心 `/panel/profile` 5 个 Tab 1:1 收尾）
- **参考站结构采集**（CDP 真实浏览器，`/tmp/pw/r30/probe2.mjs` 抓 `[role=tabpanel]` 原始 HTML → `ge-tab{0..4}.html`；注意 gpt.ge 截图必须 `Page.captureScreenshot({fromSurface:false,captureBeyondViewport:true})`，否则会拍到本站标签页）：
  - 面板结构 = `div.space-y-4` > 说明 `<p class="text-sm text-muted-foreground px-1">` + 卡片；TabsContent 自身 `mt-5`；说明文案在面板内部而**不在** Tab 栏下方。
  - 账号关联卡片 = `grid grid-cols-1 gap-4 sm:grid-cols-2`，卡片 `flex items-center gap-3 rounded-xl border border-border/40 p-4 bg-linear-to-br`，按钮 `variant=outline size=sm`；顺序 `绑定邮箱 / GitHub / Google / OIDC / WeChat / Passkey`；未配置的提供者按钮 `未启用`（disabled）；图标 = lucide `mail / github / chrome / circle-dot / message-circle-more / key-round`。
  - 订阅通知 = `订阅事件`（`flex flex-wrap gap-4 pt-1`，`账户额度不足通知` 为 `data-locked` 勾选禁用 + 灰色文字）+ `通知方式`（`flex flex-wrap gap-x-5 gap-y-2 pt-1`）+ 说明（邮件 = `接收所有已订阅通知`，其它 = `仅通知额度提醒，其他订阅自动通知到账户邮件。`）+ 按渠道出现的字段（邮件 = 通知邮箱；wecom/dingtalk/lark = `WebHook 通知地址`；telegram = Chat ID + Bot Token；webhook = `WebHook 通知地址` + `Token (可选)`，占位 `将通过 Header Bearer 传入验证`）+ 预警额度（InputGroup `max-w-xs` + `$` addon + 8 个 `size=xs` 预设）+ `保存`（无测试通知按钮、无 payload 预览）。
  - 修改资料 = `用户名`（disabled）/`昵称`（maxlength 20）/`密码 (可选)`（`如需修改请输入新密码，最短 8 位`）+ `保存`。
  - 安全设置 = 2 列 `ActionCard`：两步验证 (2FA) / 系统令牌（请求头示例 + 全宽 `生成令牌`）/ 删除账户（红色 icon + 红色描边按钮），**参考站无 Passkey / 更改密码 / 登录会话**。
  - 存储设置 = `div.space-y-6.rounded-xl.border.p-5` + `hard-drive` 头部 + `grid gap-6 sm:grid-cols-2` 两组字段 + `bg-muted/40` 贴士（首行 `font-medium text-foreground/80`，其余 `mt-1`）+ `flex gap-2` 内 `flex-1` 的 `验证并保存`。
- **本轮改动**：
  - `web/src/features/profile/index.tsx`：Tab 面板改为参考站的「面板内说明 + 卡片」结构（`TabsContent className='mt-5'`）；存储设置图标 `SlidersHorizontal` → `HardDrive`；安全设置只保留 `TwoFACard + AccessTokenCard + AccountActionCard(delete)`；移除个人中心的 `LanguagePreferencesCard` / `SidebarModulesCard` / `CheckinCalendarCard`（参考站没有，组件文件保留但不再挂载）；存储设置移除 `PrivacyCard`（记录 IP 开关，参考站无，安全页仍有）。
  - `web/src/features/security/components/account-bindings.tsx`：新增 `Google` 卡（顺序插在 GitHub 与 OIDC 之间，lucide 已移除品牌图标故用 `react-icons/si` 的 `SiGooglechrome` / `SiGithub`）；Google 走「名称为 Google 的自定义 OAuth 提供者」这条真实链路（有则显示 `绑定`/`解绑`，无则 `未启用`），并从自定义卡片列表里排除以免重复；值文案与按钮态对齐参考站。
  - `web/src/features/profile/components/profile-banner.tsx`：昵称 `h1` → `h2`（页面级 h1 仍是面包屑下的「个人中心」）；邮箱/ID chip 改 `size=xs` + 参考站 class（`h-7 rounded-full font-mono`）；统计 `dl` 去掉 `truncate/tabular-nums`（参考站无）；时间行补 `max-md:rounded-xl max-md:border max-md:p-4`。
  - `web/src/features/profile/components/tabs/notification-tab.tsx` + `constants.ts`：`账户额度不足通知` 锁定（disabled + 灰字，保存时强制为 true）；WebHook 字段标签统一 `WebHook URL`；`Token (可选)` 占位对齐；删除 `测试通知` 按钮与 Webhook payload 预览；预设改 `size=xs border-border/60`；可选文案括号去掉多余空格。
  - `web/src/features/profile/components/profile-edit-card.tsx`：裁剪为 用户名/昵称/密码 + 保存；密码框可直接输入（`maxLength 20` 昵称、`autoComplete=new-password`），提交时若填了密码则弹出既有身份验证弹窗（`ChangePasswordDialog` 新增 `initialNewPassword` 预填），保留本站 OWASP 重认证要求。
  - `web/src/features/profile/components/storage-bucket-card.tsx`：卡片壳改 `div.space-y-6.rounded-xl.border.border-border/40.p-5`、图标 `Database` → `HardDrive`、字段组 `gap-4` → `gap-6`、贴士改 `mt-1` 分段、按钮改 `flex gap-2` + `flex-1`。
- **i18n**：新增 5 个键（S3 说明长句、`Enter a new password to change it, at least 8 characters`、`Google`、`Passed through the Header Bearer for verification`、`WebHook URL`）经 `scripts/add-missing-keys.mjs` 写入 7 个语言并 `bun run i18n:sync`（报告 missing/extras = 0）；临时脚本已删除。
- **测试**：`src/features/security/__tests__/page.test.tsx` 3 条既有失败全部理清 —— 2FA 卡标题早已改为参考站文案 `Two-Factor Auth (2FA)`（断言同步）、账号关联改为参考站 2 列网格（断言 `grid-cols-1 gap-4 sm:grid-cols-2`，条目 7 = 6 内置 + Gitea 自定义）、个人中心改为「Tab 布局 + 只在切到安全设置时才请求 2FA」的新契约（测试路由改为 `_authenticated/profile/` 嵌套桩）；`settings.test.tsx` 中原「测试通知」用例改为断言 WebHook 地址随保存提交。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json <10 个改动文件>` 0 issue ✅；`bunx oxfmt --check` ✅；`bunx vitest run` 174 文件 / 2103 用例全部通过 ✅（此前 3 条既有失败已清零）；`bun run build` ✅；CDP 实测 5173 五个 Tab 截图与参考站逐项比对（`/tmp/pw/r30/our-t*.png` vs `ge-t*.png`）。
- **剩余差异 / 未做**：① Google 内置 OAuth（后端需新增 `google_id` 列 + 三库验证，本轮用自定义 OAuth 提供者链路替代）；② 参考站「API 与站内图片/视频自动转存到个人桶」未接入 relay/制品链路；③ 个人中心不再挂载 `语言偏好 / 左侧边栏个人设置 / 签到日历`（参考站无，组件保留未使用）；④ 通知方式首个选项中文参考站为「邮件」本站为「邮箱」、`Webhook` 参考站写作 `WebHook`（文案微差）。

### 2026-10-01（第二十九轮：模型详情 `/models/{model}` 阶梯计费卡 1:1 收尾）
- **参考站数据模型复核**（RSC payload：`curl https://gpt.ge/zh/models/gpt-6-astra`、`/zh/models`，文件 `/tmp/pw/r29/ge-detail.html`、`ge-models.html`）：
  - 参考站的阶梯结构是 `pricing_meta.tiered_pricing:[{input_min,input_max?,input,output,cache_read,cache_creation}]` + 基准价 `price_1k_input/price_1k_output`；**基准档不进阶梯表**（只在「可用分组」表），阶梯表每行一个阈值：`输入 Token > 272K`（两档时 `输入 Token > 32K, ≤ 256K`，实测 `/zh/models/qwen3.7-flash`）。
  - 列 = `生效条件 | 输入价格 | 输出价格 | 缓存读取 | 缓存写入`，`:input_max`/`cache_creation` 缺失时对应列整列隐藏（qwen3.7-flash 无缓存写入列）。
  - **1h 缓存写入**：参考站后端确有 `pricing_meta.cache_write_1h`（如 `/zh/models/claude-opus-5-5`：cache_write 5 / cache_write_1h 8），此时「可用分组」列变为 `缓存读取 | 缓存写入 (5m) | 缓存写入 (1h)`；对应 i18n 键 `cacheCreationPrice=缓存写入`、`cacheCreation5mPrice=缓存写入 (5m)`、`cacheCreation1hPrice=缓存写入 (1h)`（en：`Cache write` / `Cache write (5m)` / `Cache write (1h)`）。只有 5m 价时列名不带后缀（gpt-6-astra = `缓存写入`）。参考站的阶梯档位数据结构 `tiered_pricing[]` 本身没有 1h 字段，故其阶梯表最多 5 列。
  - 卡头右侧分组下拉 = 该模型 `enable_groups`（gpt-6-astra = codex/default/gf），**只有 1 个分组时不渲染**（qwen3.7-flash 实测无下拉）；切换分组按 `分组倍率` 换算阶梯价格（codex 0.3x：`$6/$22.5/$0.6/$7.5` ↔ default：`$20/$75/$2/$25`）。
  - DOM（`/tmp/pw/r29/ge-tier-dom2.mjs` 原始 class）：卡 `rounded-xl border border-border/50 overflow-hidden mb-6`；卡头 `px-6 py-4 border-b border-border/40 flex flex-wrap items-center gap-3` + 左侧 `min-w-0 flex-1` 标题块 + 右侧 `button[role=combobox][aria-label="令牌分组"] w-40`（`size-9`）；表格全宽无内边距：表头行 `border-none bg-muted/20 text-xs`、th `h-auto px-6 py-3`（价格列 `text-right`）、数据行 `border-border/30 hover:bg-muted/10`、td `px-6 py-3`（价格列 `text-right font-mono`）。
  - 实测几何（1600 视口，`/tmp/pw/r29/measure-fonts.mjs`、`measure-group-tables.mjs`）：两站内容列均为 1072px；阶梯表 th 12px/500/高 40px、td 14px/400/行高 44px；可用分组表 th 12px、行高 45px、仅「令牌分组」单元格 500 其余 400。
- **本轮改动**：
  - `web/src/features/pricing/components/dynamic-pricing-breakdown.tsx`：新增 `detailTierTable`（公开详情卡布局）与 `groupRatioMultiplier`（分组倍率）；新增 `buildDetailTierRows` —— 从 tier 条件里读 `len/p/c` 上下界，跳过只覆盖最小输入的**基准档**，缺失下界的档位用上一档上界推导（`≤ 200K` 的 else 分支 → `输入 Token > 200K`），多档时输出 `输入 Token > 32K, ≤ 256K`；`detailTierTable` 下的表头/行/单元格 class 与参考站逐一对齐（`h-auto! px-6 py-3`、`[&_th]:text-xs!`、`[&_tbody>tr]:h-auto!`、`[&_td]:font-normal!`、`bg-muted/20`、`border-border/30 hover:bg-muted/10`），去掉「分档价格表」小标题，小屏不再用卡片列表而是同一张横向滚动表；有 1h 缓存写入价时标准缓存写入列按参考站改名为 `Cache Write (5m)`；价格按 `groupRatioMultiplier` 换算（token 价格走 `* rate * ratio`，schema/请求价走 `formatTaskUsageUnitPrice` 的 ratio 选项）。无法推导行（任务型 usageSchema / 单档 / 变量不一致）时自动回退原 compact 渲染并补回内边距。
  - `web/src/features/pricing/components/model-details.tsx`：可用分组表新增 `缓存写入 (1h)` 列（数据取自动态阶梯的 `cacheCreate1hPrice`，同时存在两列时标准列改名 `Cache Write (5m)`，与参考站 claude 系列 8 列一致）；阶梯计费卡卡头改为 `flex flex-wrap items-center gap-3` + 左侧标题块 + 右侧 `Select w-40`（Base UI，`aria-label=令牌分组`，选项 = `getAvailableGroups()`，>1 个才渲染，默认第一个分组），把 `groupRatio` 经 `getConfiguredGroupRatio` 传入明细；可用分组表补齐参考站排版（表头 12px、行高 45px、分组名 500 / 其余 400）。
  - 新增回归用例 2 条（`__tests__/task-price-display.test.tsx`）：详情卡不渲染基准档/1h 列且显示 `Input Token > 200K`；三档表达式推导出 `Input Token > 32K, ≤ 256K` 与 `Input Token > 256K`。
- **CDP 实测**（真实数据，探针用完已回滚）：
  - 本地 `deepseek-flash`（`len <= 200000 ? tier("standard", p*3+c*15+cr*0.3+cc*3.75+cc1h*6) : tier("long_context", p*6+c*22.5+cr*0.6+cc*7.5+cc1h*12)`）渲染为 `生效条件 | 输入价格 | 输出价格 | 缓存读取 | 缓存写入` + `输入 Token > 200K | $6/M | $22.5/M | $0.6/M | $7.5/M`，与参考站 gpt-6-astra 卡片结构/几何逐项一致（内容列 1072、卡头高 68、表头 40、行 44、th 12px/500、td 14px/400、右对齐 font-mono）；本机含 1h 价格 → 可用分组 8 列（`…缓存读取 | 缓存写入 (5m) | 缓存写入 (1h)`）、阶梯表 6 列，与参考站 claude-opus-5-5 的 8 列表头和单元格字重逐项一致。
  - 分组下拉探针：临时把 2 号渠道 + abilities 挪到 `vip` 分组、`GroupRatio.vip=0.5`（`/tmp/pw/r29/probe-backup.json` 备份，验完已还原并重启后端）→ 下拉出现且 `w-40 h-9`，选项 `default/vip`，切到 vip 后价格 `$3/M | $11.25/M | $0.3/M | $3.75/M`（0.5x）；单分组模型不渲染下拉，与参考站 qwen3.7-flash 行为一致。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json`（本轮改动文件）0 issue ✅；`bunx oxfmt --check`（本轮改动文件）✅；`bunx vitest run src/features/pricing` 253 项 ✅；全量 `bunx vitest run` 2100 通过 / 3 个既有 security `page.test.tsx` 失败（与本轮无关）✅；`bun run build` ✅。
- **遗留差异**：① 等宽字体族本项目为 Tailwind 默认 `ui-monospace`，参考站为 `Geist Mono`（全局字体差异，未改）；② 可用分组「描述」列依赖后台分组说明配置，未配置时为 `-`（参考站有文案）；③ 参考站的 `弃用/别名/逆向` 徽章仍未做；④ 参考站阶梯档位数据无 1h 字段，本机 `cc1h` 有价时阶梯表为 6 列（多 `缓存写入 (1h)`），命名遵循参考站分组表约定。

### 2026-10-01（第二十八轮：任务日志 `/panel/task` 1:1 收尾）
- **参考站源码复核 + 实站对照**（chunk `/tmp/pw/r27/chunks/2rshtbw9wv_s8.js` 搜 `statusQueued` / `taskData`；实站 zh/en i18n payload `/tmp/pw/r28/ge-task-zh.html`、`ge-task-en.html`；截图 `/tmp/pw/r28/ge-task-zh.png`）：
  - **列顺序**：`submit_time | username(admin/agent) | channel_id(admin) | platform | task_id | action | progress | duration | quota | status(pinned right)`；参考站**没有**制品列，也没有「查看详情」列（行点击直接开弹窗）。
  - **提交时间**：`whitespace-nowrap` 秒级 `YYYY-MM-DD HH:mm:ss`，空值 `-`。
  - **平台**：纯 `Badge variant="outline"` 原值直出。
  - **任务 ID**：`CopyBtn{position:"right", className:"whitespace-nowrap bg-transparent! p-0", iconClassName:"size-3.5"}` 包 `span.font-mono.font-normal text-[13px] max-w-36 truncate`。
  - **事件**：`inline-flex items-center gap-1.5 whitespace-nowrap` + `size-1.5 rounded-full bg-foreground` 圆点 + `action.toLowerCase()` + `/参数`；参数来自 `properties.input`（**先按字符串 json parse**，仅对象渲染；`duration` 键追加 `s`，null/空串跳过）。
  - **进度**：`Progress h-1 w-16`（`FAILURE` 时 `[&>div]:bg-muted-foreground/30`）+ `text-xs font-semibold` 百分比（`parseInt(progress)` 兜底 0）。
  - **耗时**：`(start_time || submit_time)` → `finish_time` 秒差，`<b>` 数字 + `text-[13px] font-semibold`；`>150` 红 / `>100` 琥珀；无值 `-`。
  - **消耗**：`progress !== '100%'` → 「待结算」，否则金额（参考站另有 `pre_quota/refund_quota` tooltip，本机无此字段）。
  - **状态徽章**：`SUCCESS` 绿 `bg-green-500/15 text-green-600 border-green-500/30`（Completed）、`FAILURE` 红 `/10 + border-red-500/20`（Failed）、`IN_PROGRESS` 蓝 `/15`、`SUBMITTED` 黄 `/15`、`QUEUED` 橙 `/15`、`NOT_START` outline（Not Started）、空串灰 `bg-gray-500/15 text-gray-600 border-gray-500/30`（Submitting）、其它 outline（Unknown）；状态列 `meta.pinned:"right"`。
  - **任务详情弹窗**：`md:max-w-160 bg-linear-to-br from-foreground/6 via-transparent to-transparent md:p-6 md:rounded-2xl`、`DialogHeader gap-1 mb-5`；标题 = 实心 `Badge`(platform) + `font-mono text-base`（action 大写）；描述 = `CopyBtn` 包 `font-mono text-xs ml-1` task_id（无则 `created_at` 本地时间）；正文 = `dl grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm`（状态 / 失败原因红（仅 FAILURE/UNKNOWN）/ 提交 / 开始 / 完成）+ `h4 text-sm font-semibold` 任务数据 + `pre` `JSON.stringify(data ?? {}, null, 2)` 带右上复制。
  - **工具栏**：右侧 = `RefreshCw` 刷新（`variant=outline size-9`，**始终可点**，点击重置全部筛选 + 重载，加载中换 `Spinner`）+ 小屏排序（`lg:hidden`，ArrowUpWideNarrow/ArrowDownNarrowWide）+ 漏斗 `DropdownMenu`（`min-w-40`，标题「显示列」+ 列复选框）；表尾保留提示 `Info size-3.5` + `媒体文件有时效性，请尽快保存到本地！`。
- **本轮改动**：
  - 前端：`constants.ts`（`TASK_STATUS_MAPPINGS` 重写 + `badgeClassName`）、`components/columns/task-logs-columns.tsx`（整体重写：平台 outline、任务 ID `CopyButton`、事件解析 `properties.input`（字符串 JSON parse，与参考站一致）、进度自绘、耗时阈值、待结算、状态右固定；去掉旧「查看详情」列；保留制品列但默认隐藏）、`lib/columns.ts`、`components/usage-logs-table.tsx`（任务列默认隐藏 + 行点击开弹窗）、`components/dialogs/task-details-dialog.tsx`（整体重写为参考站布局；快照按需拉取）、`components/logs-filter-toolbar.tsx`（刷新按钮改 `RefreshCw`、始终可点、loading spinner）、`components/logs-footer-note.tsx`（任务保留提示改参考站原句）。
  - 后端：`controller/task.go` 的 `GET /api/task/:task_id/artifacts` 新增可选 `include_data=1`（列表接口按既有测试约定继续省略 `data` 列；弹窗打开时才按需带出持久化快照，其余调用方行为不变），并在 `controller/task_generic_test.go` 的 `TestTaskListsOmitPersistedSnapshot` 内补断言（不带参数不含快照、带 `include_data=1` 含快照）。
  - i18n：新增 `Task Data` 与新保留提示句 ×7 语言；zh / zh-TW 的 `Start Time` 对齐参考站文案（开始时间 / 開始時間）；`bun run i18n:sync` 会按 en 基准序重写 zh / zh-TW（本次运行顺带完成该归一化，`_sync-report.json` 全 `missingCount: 0 / extrasCount: 0`）。
- **CDP 实测**（真实 SQLite 探针，用完即删，库内仍 0 条）：写入 9 条真实记录覆盖 SUCCESS（35s / 120s 琥珀）/ FAILURE（200s 红 + 失败原因）/ IN_PROGRESS 60% / QUEUED / SUBMITTED / NOT_START / UNKNOWN / 空状态（提交中）/ 无参数与带参数（`music/5s/1080p`、`generate/10s`）→ zh 表逐项核对：列顺序、平台 outline、任务 ID 截断 + 复制、事件圆点 + 参数、0%/60%/100% 进度（失败灰条）、耗时着色、待结算/金额、状态徽章与顺序、状态列右固定全部与参考站一致；行点击两个弹窗（已完成 / 已失败）显示实心平台 Badge + 大写 action + 可复制任务 ID + 时间 dl + **任务数据 JSON（按需拉取成功）**。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json src/features/usage-logs` 0 issue ✅；`bunx oxfmt --check src/features/usage-logs` ✅；`bunx vitest run src/features/usage-logs` 402/402 ✅；全量 `bunx vitest run` = 2098 通过 / 3 失败（仍为既有 `features/security/__tests__/page.test.tsx` 遗留，与本轮无关）；`bun run build` ✅；后端 `go build ./...` ✅、`go test ./controller/` ✅。
- **遗留差异**：① 消耗 Tooltip（预扣 + 补扣 - 返还）依赖任务表 `pre_quota` / `refund_quota`，本机后端无此字段（同第二十七轮）；② 英文文案差异（**中文完全一致**）：查询按钮 `Query` ↔ 参考站 `Search`、分页 `N items in total` ↔ `N records`；③ 参考站任务列表接口直接带 `data`，本项目列表接口按既有设计（有测试保护）省略，改为弹窗按需拉取 —— 展示效果一致，请求时机不同；④ 移动端沿用本项目共享卡片列表（参考站小屏同一张横向滚动表格，既有差异）；⑤ 任务详情弹窗为本项目扩展了管理员/根用户区块（参考站仅普通字段）。

### 2026-10-01（第二十七轮：绘图日志 `/panel/midjourney` 1:1 收尾）
- **参考站源码复核 + 实站双向对照**（chunk `/tmp/pw/r27/chunks/0n1figlusjvp7.js`；实站 zh 截图 `/tmp/pw/r27/ge-drawing-zh.png`，本机 `/tmp/pw/r27/our-drawing-empty-zh.png`）：
  - **类型徽章无色**：映射表里虽带 `cls`（蓝/橙/紫/青/黄绿…）但渲染只取 `label` —— 实际是纯 `Badge variant="outline"`（上一轮误把 `cls` 当样式用，本轮改回；zh 表头为「类型」，EN 为 `Action`）。
  - **任务 ID**：`CopyBtn{position:"right", className:"bg-transparent! p-0", iconClassName:"size-3.5"}` 包 `span.font-mono.font-normal text-[13px] max-w-36 truncate`；空值 `-`。
  - **状态徽章**（直接 Tailwind class，无 variant）：`SUCCESS` → `bg-green-500/15 text-green-600 border-green-500/30`（Completed）；`FAILURE` → `bg-red-500/10 text-red-600 border-red-500/20`（Failed）；`IN_PROGRESS` → `bg-blue-500/15 …`（In Progress）；`SUBMITTED` → `bg-yellow-500/15 …`（Submitted）；`MODAL` → `bg-amber-500/15 …`（Awaiting Action）；`NOT_START` / 其它 → outline（Not Started / Unknown）；`isFailure()` = `FAILURE || (UNKNOWN && 100% && fail_reason)`。
  - **`×N` 制品数**：仅 `SUCCESS && 数量>0` 时在徽章右侧渲染 `text-xs text-muted-foreground font-mono`，数量 = `parseMjUrls(image_urls, image_url).length + parseMjUrls(video_urls, video_url).length`。
  - **状态列右固定**：`meta:{pinned:"right"}` → `sticky right-0` + `shadow-[inset_1px_0_0_0_color-mix(in_oklab,var(--color-border)_40%,transparent)]`；实测参考站三张日志表都是「最后一列右固定」（使用日志=消耗、绘图/任务日志=状态）。
  - **任务详情弹窗** `A({task,open,onOpenChange,isAdmin})`：`md:max-w-180 bg-linear-to-br from-foreground/6 via-transparent to-transparent md:p-6 md:rounded-2xl`；标题 = 实心 `Badge`(action) + 状态徽章 + 模式小灰字；描述 = 可复制的 `font-mono text-xs ml-1` 任务 ID（无 ID 时显示本地时间）；正文外层 `no-scrollbar max-h-[70vh] overflow-y-auto space-y-4 pr-1`；媒体卡底部条 = 复制按钮**包住整段 URL**（`flex-1 min-w-0 justify-start bg-transparent! p-0`、`text-[11px] font-mono`、hover 变前景色）+ 右侧 `ExternalLink` ghost `size-6`；结尾 `<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">`（失败原因红 / 提交 / 开始 / 完成时间）。
  - **保留提示原句**：`Images/videos may expire, please save them locally as soon as possible!`（zh：图片/视频可能存在时效，请尽快保存到本地！），图标 `Info size-3.5`。
  - **i18n 权威文案**（RSC payload `panelMidjourney`）：action ZH = 创作/视频/编辑/放大/变化/强变化/弱变化/平移/识图/融图/上传/缩略/重绘/局部/缩放/自定义缩放/弹窗/换脸；状态 = 已完成/已失败/未启动/已提交/执行中/等待操作。
- **本轮改动**：`constants.ts`（`MJ_TASK_TYPE_MAPPINGS` 全量重写 + `MJ_STATUS_MAPPINGS` 改为参考站配色；`StatusMapping` 增加可选 `badgeClassName`）、`lib/status.ts`（`createStatusMapper.getBadgeClassName`）、新增 `lib/mj-artifacts.ts`（`parseMjArtifactUrls` / `countMjArtifacts` / `isMjTaskFailure`）、`columns/drawing-logs-columns.tsx`（类型徽章无色 outline、任务 ID 用 `CopyButton`、状态徽章带色 + `×N`、进度 `h-1 w-16`、状态列 `meta.pinned:'right'`）、`dialogs/drawing-task-dialog.tsx`（改用共享判定/解析、标题 action 改实心 Badge、媒体卡复制条、渐变 + `md:max-w-180 md:rounded-2xl md:p-6`）、`logs-footer-note.tsx`（绘图保留提示改参考站原句）、`columns/common-logs-columns.tsx`（消耗列右固定，与参考站一致）、i18n 新增 `Awaiting Action` + 新保留提示键 ×7 语言并同步 zh/zh-TW 的识图/融图/缩略/局部/未启动/执行中/队列中（`_sync-report.json` 全 `missingCount: 0 / extrasCount: 0`）。
- **CDP 实测**（真实 SQLite 探针，用完即删，库内仍 0 条）：写入 6 条真实记录（SUCCESS IMAGINE / FAILURE UPSCALE 75s / IN_PROGRESS 60% VIDEO / SUBMITTED 30% DESCRIBE / MODAL / SUCCESS VIDEO 2 段视频）→ zh 表渲染逐项核对：类型徽章无色、任务 ID 等宽文本 + 复制、`×3`/`×1` 制品数、待结算、已完成/失败/执行中/已提交/等待操作 徽章配色、耗时 75.0s 红 / 60.0s 琥珀、行点击弹窗（实心 action Badge + 状态徽章 + 模式 + 可复制 ID + 媒体卡 + 提示词块 + 时间 dl）全部与参考站一致；1100px 窄屏横向滚动时状态列保持右固定（`lastRight≈wrapRight`）；空表 = 插图 + 暂无数据 + 共 0 条 + 保留提示，与参考站 zh 截图逐字一致。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json src/features/usage-logs` 0 issue ✅（顺手修掉 `task-logs-filter-bar.tsx` 的 `import type` 与 `column-helpers.tsx` 的冗余闭合标签）；`bunx oxfmt --check src/features/usage-logs` ✅；`bunx vitest run src/features/usage-logs` 402/402 ✅；全量 `bunx vitest run` = 2098 通过 / 3 失败（仍为既有 `features/security/__tests__/page.test.tsx` 遗留，与本轮无关）；`bun run build` ✅。
- **遗留差异**：① 消耗 Tooltip（参考站悬停显示 `预扣 x + 补扣 y - 返还 z = 消耗`）需要任务表 `pre_quota` / `refund_quota` 字段，本机后端没有，暂只对齐「待结算」与金额；② 英文文案差异（**中文完全一致**）：列表头 `Type` ↔ 参考站 `Action`、查询按钮 `Query` ↔ `Search`、分页 `N items in total` ↔ `N records` —— 本站 `Action`(=操作)、`Search`(=搜索) 已被其它页面占用，直接改名会污染工单/任务详情等页面，故保留现状；③ 移动端沿用本项目共享的卡片列表（参考站小屏是同一张横向滚动表格，见第十二轮记录，属既有差异）。

### 2026-10-01（第二十六轮：创作 → 查看器 Midjourney 操作 1:1）
- **参考站采集**（反编译 `/tmp/pw/r24-chunks/3dfaul0gbdy6o.js`（`ArtworkViewer` + 操作区组件）、`37bwcw4qol3fd.js`（`mjQuickButtons` / `VideoCard`）、`3ht90xbtye9gg.js`；并把同一条 MJ 探针记录写进参考站 IndexedDB，实渲染对照截图 `/tmp/pw/r26/21-ge-viewer.png`，跑完即删）：
  - 触发条件：`provider === 'mj' && status === 'done' && onMjOp`；标题 `image.operations` = `Image operations`。
  - U/V 网格：`grid grid-cols-4 gap-1.5`，按钮 `h-8 border-border/60 font-mono text-xs`（`variant=outline size=sm`）；提示 `U upscales an image · V creates a variation`（`mt-2 text-xs text-muted-foreground`）。
  - 其余操作：容器 `mt-3 flex flex-wrap gap-1.5`，按钮 `h-7 px-2.5 text-xs font-normal text-muted-foreground`；`Custom zoom` 是 Popover（`w-64 p-4`：`Zoom factor: {x}x` + Slider min 1.1 / max 2 / step 0.1 + `Confirm zoom` 按钮）。
  - 过滤与标签：可用按钮 = 去掉 `BOOKMARK` 与 `::Inpaint::`；快速按钮 = `/^[UV][1-4]$/`；customId 片段 → 文案：`::reroll::`=Reroll、`::high_variation::`=Strong variation、`::low_variation::`=Subtle variation、`::Outpaint::50`=Zoom out 2x、`::Outpaint::75`=Zoom out 1.5x、`::pan_left/right/up/down`=`←/→/↑/↓ Pan …`、`::upsample_v6_2x_subtle`=Upscale (subtle)、`::upsample_v6_2x_creative`=Upscale (creative)、`::upsample_v5_2x`=Upscale 2x、`::upsample_v5_4x`=Upscale 4x、`::CustomZoom::`=Custom zoom、`::make_square::`=Make square。
  - 提交协议：`POST {mjEndpoint(values,'/mj/submit/action')}` body `{taskId, customId}`；返回 `code === 21` 时再 `POST {mjEndpoint(values,'/mj/submit/modal')}` body `{taskId}`（Custom zoom 额外带 `prompt: '{finalPrompt ?? prompt} --zoom {n}'`），拿返回 `result` 当新 taskId 继续轮询 `/mj/task/{id}/fetch`；新记录继承 `endpoint / params={operation, zoom?} / mjSource{taskId,button.customId,zoom?} / tokenId / tokenName / favorite / createdAt`，`buttons` 置空。
  - 查看器其余对齐：媒体区右上关闭按钮 `size-8 bg-background/80 backdrop-blur-sm hidden md:inline-flex`；上/下切件按钮 `size-11 bg-background/80 backdrop-blur-sm` + 桌面 `md:flex-col md:justify-start md:gap-2.5`，**始终渲染**用 `disabled` 控制；键盘切件从 ←/→ 改为 ↑/↓；时间行 `· <span class="font-mono">{endpoint}</span>`；Prompt 下方 `finalPrompt` 等宽块（`thin-scrollbar max-h-36 font-mono text-xs` + 复制按钮）；参考图行是附件式横向滚动（`w-22` 卡：`aspect-4/3` 缩略图 `rounded-lg` + 居中 `text-xs` 说明）；右栏容器 `md:max-w-95 … max-md:border-t md:border-l border-border/60`、底部动作条 `md:pt-8 max-md:border-t md:border-t-border/60`。
- **实现**：新增 `lib/mj-actions.ts`（`normalizeMjButtons` / `mjUsableButtons` / `mjQuickButtons` / `isMjCustomZoom` / `mjButtonLabelKey` / `mjSubmitPath`）与 `components/studio-artwork-operations.tsx`（U/V 网格 + 其余按钮 + `CustomZoomOperation` Popover）；`studio-artwork-card.tsx` 卡片 overlay 顶部渲染 U/V 快速按钮（`min-w-8 bg-white/15 font-mono backdrop-blur-sm hover:bg-white/30`，`stopPropagation` 不打开查看器）；`image/index.tsx` 新增 `runMjAction()`（action → code 21 → modal → 轮询；缺失 taskId / 无可用令牌 / 提交失败 / 确认失败各有真实 toast），轮询成功时写回 `buttons` / `finalPrompt`。
- **实测**（CDP 真实浏览器 9223 + 真实后端；探针记录与媒体文件用完即删、参考站探针记录亦已删除）：
  - 卡片：hover 后出现 8 个 `[UV][1-4]` 按钮（`h-6 min-w-8 font-mono bg-white/15`，与参考站逐类同名），点 U1 不打开查看器（仅触发动作）。
  - 查看器：出现「Image operations」+ 8 格网格（321×70，按钮 76×32 = `h-8 font-mono`）+ 提示；其余 16 个按钮全部渲染，`BOOKMARK` / `Inpaint` 不出现；`Custom zoom` Popover 256×132 含 `Zoom factor: 1.5x` + Slider + `Confirm zoom`。
  - 几何对照（同一记录双站渲染）：`refCard` 88×95、`refMedia` 70×53、`opsGrid` 321×70、`U1` 76×32、其余操作区 164、底部动作条 160、`Use same style/Submit for sharing/Download/Regenerate` 顺序与尺寸一致 ✅（差异仅字体度量：参考站未加载自有 webfont 时用 Times New Roman）。
  - 键盘：`ArrowUp` 到头时按钮 `disabled` 且视图不变，`ArrowDown` 切到下一件（时间行 `5 minutes ago` 变化）✅；`Escape` 关闭查看器 ✅。
  - 真实链路：查看器点 U1 → `POST /mj/submit/action` → 后端真实返回 `No available channel for model mj_upscale under group default`（本机无 MJ 渠道）→ 生成一条真实失败记录（可 Retry），证明 action 提交链路已打通。
- **验证**：`bun run typecheck` ✅、`bunx oxlint -c .oxlintrc.json src/features/studio` 0 issue ✅、`bunx oxfmt --check src/features/studio src/i18n/static-keys.ts` ✅、`bunx vitest run src/features/studio` 21/21 ✅（新增 `lib/__tests__/mj-actions.test.ts` 11 例，覆盖按钮归一化 / 过滤 / 标签映射 / 模式端点）、`bun run build` ✅；i18n 复用既有键（无新增），`_sync-report.json` 全 `missingCount: 0 / extrasCount: 0`。
- **遗留差异**：① 本机无真实 MJ 渠道，只能验证到「真实提交 → 真实报错」，`code === 21` 的 modal 分支由单测覆盖（未在生产链路跑通）；② 参考站参考图说明行渲染的是未翻译 key（`referenceImages`），我们改用其 `alt` 文案对应的 `Reference image {{number}}`；③ 字体不同（Public Sans vs 参考站 webfont），同文案换行/宽度存在 1–7px 级差异。

### 2026-10-01（第二十五轮：创作 → 画廊卡片细节 1:1）
- **参考站采集**（反编译 `js/710526` 模块（`ArtworkMediaCard` / `ArtworkPlaceholderCard` / `ArtworkHoverAction` / `ArtworkDeleteButton`）、`js/37bwcw4qol3fd.js` 的 `VideoCard`、`js/3dfaul0gbdy6o.js` 的 `ImageArtworkCard`；文案取自参考站 zh/en 消息包 `/tmp/pw/r25/ge-studio-zh.html`）：
  - `ArtworkPlaceholderCard`：`Card size="sm"` + `className="relative gap-0 border border-border/40 bg-muted/30 py-0 text-center"`（图片卡额外 `bg-muted/40`）→ `CardContent`（`flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden p-4`：图标 → `CardTitle.text-sm` → 子内容）+ `CardFooter`（`justify-center border-border/30 bg-transparent px-3 py-3`，`p.line-clamp-1 text-xs text-muted-foreground/70` 显示提示词）+ 右上角删除（`variant=ghost icon-sm bg-muted text-muted-foreground opacity-0 group-hover/card:opacity-100 hover:bg-muted/70`）。
  - 生成中：图标 `Spinner size-5 text-muted-foreground`，标题 `generation.generating` = `生成中 {progress}`（进度未知时 progress 为空）；进度条 `div.h-0.5.w-2/5.overflow-hidden.rounded-full.bg-border/80`，已知进度时填充 `style.width = progress%`（图片卡另加 `transition-[width]`），未知时 `animate-progress-slide` 跑马灯；视频卡额外显示上游 `taskStatus` 徽章（`Badge variant=secondary`，`max-w-full truncate`），图片卡额外显示 `generation.keepPageOpen`（`请勿离开当前页面`）。
  - 失败：图标 `ImageOff/VideoOff size-6 text-muted-foreground/50`，标题 `generation.failed`（`生成失败`），错误文案 `line-clamp-3 text-xs text-muted-foreground` + `common.retry` 重试按钮；媒体加载失败：标题 `common.loadFailed`（`加载失败`），图片卡显示 `image.linkExpired` + `common.openInBrowser`，视频卡显示重试（重新 `load()`+`play()`）+ `common.openInBrowser`。
  - `VideoCard` 媒体：`<video src poster={coverUrl} muted loop playsInline preload={coverUrl?'none':'metadata'} className="h-auto w-full bg-muted transition-transform duration-300 group-hover/card:scale-[1.02]">`，卡片 `onMouseEnter → play()`、`onMouseLeave → pause() + currentTime = 0`；`ArtworkMediaCard` 的 `aria-label = (prompt||meta).slice(0,120)`。
  - 卡片动作（图片 / 视频一致）：左下收藏（已收藏常显红色 `text-red-400`，未收藏 hover 出现），右上依次 `share.submit`（Share2）→ `gallery.sameStyle`（Sparkles，文案「Use same style」）→ `image.editAsPad` / `image.editAsReference`（Pencil，MJ 为「编辑（作为垫图）」）→ `common.download` → `common.delete`；**卡片上没有「Regenerate」**，只有查看器底部才有 `Use same style`（primary）/ 分享（outline）/ `Download` + `Regenerate`（出错且已有 taskId 时文案变 `generation.continueQuery`「继续查询」）+ `Delete`。
- **本项目实现**：
  - `components/studio-artwork-card.tsx` 重写占位卡：改为参考站同款结构（`border border-border/40` + `bg-muted/30`（图片 `bg-muted/40`）+ 居中图标/标题/内容 + 底部 `line-clamp-1` 提示词行 + 右上角悬浮删除按钮）。
  - 生成中显示真实进度：`StudioGeneration` 新增 `progress`（0-100）/ `taskStatus` / `coverUrl` / `refImages`；图片页把 MJ `/mj/task/{id}/fetch` 的 `progress`（`"42%"` → 42）与 `status` 写回记录，视频页把 `GET /v1/videos/{id}` 的 `progress` / `status` 写回记录，卡片据此渲染真实宽度的进度条与状态徽章（本机无渠道时表现为真实失败卡）。
  - 视频 hover 自动播放：卡片容器 `onMouseEnter/onMouseLeave` 驱动 `play()` / `pause()` + `currentTime = 0`，媒体补上 `poster`（`coverUrl`）、`preload`（无封面 `metadata`）、`bg-muted`。
  - 动作区对齐：卡片 `onRegenerate` 改为 `onSameStyle`（Sparkles + 「Use same style」）；`onRetry` 仅用于占位卡重试按钮；MJ 作品的编辑按钮文案按参考站显示「编辑（作为垫图）」。
  - 一键同款还原参考图：`StudioImageInput.referenceSeed` 由单图改为 `urls: string[]`，图片页记录 `refImages`（提交时写入），`Use same style` 时一并回填。
  - 失败重试复用原任务：`regenerate` 在「记录为失败且已有 taskId + tokenId」时重新拉起轮询（继续查询），否则才重新提交；查看器按钮文案随之切换。
  - 媒体加载失败：图片/视频 `onError` → 显示「加载失败」占位卡（图片提示 `The image link may have expired.`，视频提供重试与「浏览器中打开」）。
- **实测**（CDP 真实浏览器 9223 + 真实后端，探针数据用完即删）：
  - 视频 hover：注入真实视频记录（本地 capability URL，`/api/studio/share/media/17/<32hex>.webm|.mp4`）后，`paused=true currentTime=0` → hover → `paused=false currentTime=2.16` → 移开 → `paused=true currentTime=0`；另一张卡未 hover 时保持 `paused=true`；`preload=metadata`、`muted/loop/playsInline`、`bg-muted` 均与参考站一致 ✅
  - 占位卡：真实失败记录（`No available channel for model kling-v3 under group default`）→「生成失败 + 错误文案 + Retry + 提示词页脚」；探针「生成中 42%」→ 徽章 `IN_PROGRESS`（20px）+ 进度条 121px、填充 51px（= 42%）✅
  - 卡片动作 aria-label 实测为 `Submit for sharing / Use same style / Edit (use as source image) / Download / Delete`（收藏为 `Remove from favorites`）✅
  - 验证后已清空 IndexedDB 探针记录（`r25-*`）与 `data/studio-share-media/u17/`。
- **验证**：`bun run typecheck` ✅、`bunx oxlint -c .oxlintrc.json src/features/studio` 0 issue ✅、`bunx oxfmt --check` ✅、`bunx vitest run src/features/studio` 10/10 ✅、全量 `bunx vitest run` 2087 通过 / 3 失败（既有 `security/__tests__/page.test.tsx` 遗留）、`bun run build` ✅；i18n 新增 9 键 ×7 语言（`Generating {{progress}}` / `Generation failed` / `Failed to load` / `Retry` / `Open in browser` / `Keep this page open` / `The image link may have expired.` / `Continue querying` / `Edit (use as source image)`），`_sync-report.json` 全 `missingCount: 0`。
- **遗留差异**：① ~~参考站卡片 overlay 顶部的 MJ 快捷操作（U1–U4 / V1–V4 / 缩放等 `mjQuickButtons`）我们仍未实现~~（第二十六轮已实现）；② ~~参考站分享/收藏会把媒体转存自有 OSS 并生成封面（`coverUrl`）~~（第三十三轮已为「生成结果」与「收藏」补齐转存与视频封面；分享链路仍走本地 capability，见第三十三轮遗留 ③）；③ 参考站分页在发现页为无限滚动 + 分享页 `Load more`，均已对齐，无剩余差异。

### 2026-10-01（第二十四轮：创作 → 作品分享 `POST /api/studio/share` 打通）
- **参考站采集**（反编译 `js/` 中 `studio share` 相关 chunk + 真实浏览器抓包/交互，账号 `674904341@qq.com`，产物 `/tmp/pw/r24-*.png`）：确认分享协议为
  - `GET /api/studio/share?cursor&page_size&kind&include_pending` → `{items,next_cursor}`；`GET /api/studio/share/self`；`GET /api/studio/share/{id}`；`POST /api/studio/share`（body `{kind, data}`）；`DELETE /api/studio/share/{id}`；`POST /api/studio/share/{id}/approve`。
  - 状态 `1 = PENDING` / `2 = APPROVED`；`data` 为作品快照 `{kind,status,url,coverUrl,width,height,prompt,model,provider,schemaId,params,values,refImages,createdAt}`。
  - 能力矩阵：`canDelete = mine || owner`；`canReview = discover && owner && pending`；`canRemix = mine || approved`；`canFavorite = discover && approved`。
  - Tab 实测为 `My artwork / Favorites / My shares`（英文站点该 Tab 仍是中文站残留文案「我的分享」，本项目照抄为 `My shares`）；卡片左侧为收藏按钮 + 状态徽章；查看器底部动作 `Use same style`（primary）/ `Submit for sharing`（outline）/ `Download` + `Regenerate` + `Delete`。
  - 文案逐字抄录：`My shares` / `Pending review` / `Published` / `Submit for sharing` / `Submitted for review` / `Unable to submit this creation` / `The media, prompt, and generation settings will be public and available for one-click remixing.` / `You have too many pending submissions. Remove one before submitting again.` / `Delete this share?` / `It will be removed from Discover. This action cannot be undone.` / `Share deleted` / `No shares yet` / `Share a creation from your images or videos.` / `No shared creations yet` / `Approved creations will appear here.` / `Load more` / `Unable to load shared creations`。
- **后端**（`go build ./...` / `go vet ./controller/ ./model/` / `go test ./model -run TestStudio` 全绿）：
  - `model/studio.go` 重写：新增 `StudioShare` 表（`studio_shares`，已接入 `model/main.go` AutoMigrate）、`StudioShareArtwork` / `StudioShareDetail`（含 `owner` 标志）、状态与来源常量；`CreateStudioShare`（待审上限 20，超出返回 `ErrStudioSharePendingLimit`）、`GetStudioShareById`、`DeleteStudioShare`、`ApproveStudioShare`、`GetStudioShareFeed`（已发布分享 + MJ 作品合并时间线，cursor = `ts:rank:id`）、`GetUserStudioShares`、`ParseStudioFeedCursor`；删除旧的 `StudioShareItem` / `StudioShareParameter` / `GetStudioShares`。
  - `controller/studio.go` 重写：`GetStudioShares`（discover，支持 `include_pending=1`）、`GetMyStudioShares`、`GetStudioShare`（pending 仅作者/管理员可见）、`SubmitStudioShare`（`io.LimitReader` 256KB 上限 + URL/状态校验）、`DeleteStudioShare`（删库后顺带删除本地媒体文件）、`ApproveStudioShare`。
  - 新增 `controller/studio_media.go`：`POST /api/studio/share/media`（multipart，图片 10MB / 视频 64MB，扩展名白名单）、`GET /api/studio/share/media/:userId/:name`（32 位随机名 capability URL，公开免鉴权）、`removeStudioShareMedia`。
  - 路由（`router/api-router.go`）：discover/serve/`/media/:userId/:name`/`/:id` 在模块鉴权组；`/self`、`POST ""`、`POST /media`、`DELETE /:id`、`POST /:id/approve` 需登录，写操作挂 `UserCriticalRateLimit`。
  - i18n：`i18n/keys.go` 新增 `MsgStudioShareInvalid/InvalidMedia/NotFound/PendingLimit` + `MsgStudioShareMediaInvalid/TooLarge`，3 个 yaml 各补 6 条。
- **前端**（`typecheck` / `oxlint` / `oxfmt` 全绿）：
  - `discover/{types,api,hooks,index}.tsx` 重写：`getStudioShares(kind?,cursor,includePending)` / `getMyStudioShares` / `getStudioShare` / `submitStudioShare` / `deleteStudioShare` / `approveStudioShare` / `uploadStudioShareMedia`；`useStudioShareFeed(scope, kind, signedIn)`（`kind='all'` 走 discover 合并图片 + 视频）；`/studio` 改为 `StudioShell` + sticky「Discover inspiration」头 + `StudioShareGallery scope='discover' kind='all'`，`onSameStyle` 写 `sessionStorage` 再跳 `/studio/image|video?prompt=`。
  - 新增 `lib/shares.ts`（`studioShareArtworkId` = `studio-share-{id}`、`serializeStudioShareArtwork`、`studioShareToArtwork`、`studioShareCapabilities`、`isSharedArtwork`）、`lib/remix.ts`（`saveStudioRemix` / `takeStudioRemix`）、`hooks/use-artwork-share.ts`（确认弹窗 → data/blob URL 先上传 → `POST /api/studio/share` → 写回 `submittedShareId` → 刷新 `['studio-shares']` → toast）、`components/studio-share-gallery.tsx`（mine/discover 共用：骨架屏 / 错误重试 / 空态、`StudioMasonry`、`StudioArtworkCard` 的状态徽章与审核按钮、`StudioArtworkViewer` 的 `badge`、删除 `ConfirmDialog`、深色 `Load more`）。
  - `components/studio-artwork-card.tsx`：`onFavorite/onDownload/onDelete` 变可选，新增 `onShare` / `shareDisabled` / `regenerateLabel` / `leftActions`（左槽合并「收藏 + 额外插槽」）；`studio-artwork-viewer.tsx`：新增 `onShare` / `shareDisabled` / `badge`；`studio-gallery-tabs.tsx` 新增第三个 Tab `My shares`。
  - `hooks/use-gen-screen.ts`：`owned`（排除镜像作品）/ `ofKind` / `tab: 'history'|'favorites'|'mine'` / `showShares` / `hasArtworks`；`hooks/use-artwork-media.ts`：`/api/studio/share/media/` 视为公开 URL（不再用令牌重取）；`lib/generations.ts`：`StudioGeneration` 新增 `sourceShareId?` / `submittedShareId?`。
  - `image/index.tsx` / `video/index.tsx`：`galleryActive = hasArtworks || tab !== 'history'`；卡片/查看器新增分享按钮（已有 `submittedShareId` 则不显示）+ 分享确认弹窗；挂载时消费 `takeStudioRemix()` 还原 prompt/provider/values。删除已无引用的旧发现页文件（`studio-work-card.tsx`、`discover/studio-work-detail.tsx`、`hooks/use-studio-favorites.ts`、`lib/studio-favorites.ts`）。
  - i18n：新增 17 键 × 7 语言，`bun run i18n:sync` 后 `_sync-report.json` 全 `missingCount: 0`。
- **真实链路实测**（CDP 真实浏览器 9223 + 真实后端，非假数据）：
  1. 注入真实本地作品（data URL）→ 卡片 hover `Submit for sharing` → 确认弹窗文案与参考站逐字一致 → 确认 → 自动上传媒体（`POST /api/studio/share/media` 200）→ `POST /api/studio/share` 200 → toast `Submitted for review` ✅
  2. `My shares` Tab 显示 1 张卡片 + `Pending review` 徽章 + 悬浮 composer ✅
  3. Discover：未登录/他人只看到已发布；作者带 `include_pending=1` 时看到自己的待审作品 + 可点 `Pending review` 审核按钮 ✅
  4. 点审核 → `POST /:id/approve` 200 → toast `Published` → 匿名 `GET /api/studio/share` 立即能看到 ✅
  5. 匿名访问 `/studio`（discover）不报 401 ✅
  6. 收藏分享作品真实写入 IndexedDB `generations`（`id=studio-share-2`、`sourceShareId=2`）✅
  7. 查看器：右栏 badge `Published`、`Download`、`Use same style`，无 `Delete` 时按钮正确隐藏 ✅
  8. 删除：卡片 Delete → 确认弹窗 `Delete this share?` → Continue → `DELETE 200` → toast `Share deleted` → 空态 `No shares yet / Share a creation from your images or videos.` ✅；同时本地媒体文件被真实删除 ✅
  9. `/studio` discover 视觉截图正常（瀑布流、hover 蒙层、按钮行 `Favorite / Use same style / Download / Delete`）✅
  10. 测试后已清空 `studio_shares` 表与 `data/studio-share-media/u17/`，删除的仅为本地测试记录，参考站注入数据保持原样 ✅
- **验证**：`go build ./...` ✅、`go vet ./controller/ ./model/` ✅、`go test ./model -run TestStudio -count=1` ✅；`bun run typecheck` ✅、`bunx oxlint -c .oxlintrc.json src/features/studio` 0 issue ✅、`bunx oxfmt` ✅、`bunx vitest run src/features/studio` 10/10 ✅、全量 `bunx vitest run` 2087 通过 / 3 失败（既有 `security/__tests__/page.test.tsx` 遗留）、`bun run build` ✅。
- **遗留差异**：① 参考站 hover 视频自动播放（hover play / leave pause + reset）未实现；② 参考站分享媒体先转存自有 OSS 并可「修复媒体」，我们改为本地 capability 存储（`data/studio-share-media/`）；③ 参考站 `POST /api/studio/share/` 路径带尾斜杠，我们的路由为 `/api/studio/share`；④ 本轮新增 `studio_shares` 表仅在本机 SQLite 实测，MySQL / PostgreSQL 未验证（如需三库验证须补测）。

### 2026-10-01（第二十三轮：创作 → 作品画廊 `GenScreenLayout`（图片 / 视频共用））
- **参考站采集**（反编译 `js/19j53enicez41.js`（`useGenScreen` / `GenScreenLayout`）、`js/3ht90xbtye9gg.js`（`ImageScreen` 画廊接线）、`js/0ga9zl2pcvx15.js`（`VideoScreen` + `VideoCard` + `VirtualArtworkMasonry`）、`js/37bwcw4qol3fd.js`（`StudioGalleryLayout`）；几何用真实浏览器 + 本地注入 7 条真实作品记录测得，产物 `/tmp/pw/r22/ge-gallery-main.html`、`ge-card.html`、`ge-viewer.html`、`ge-viewer-tree.txt`、`r23-*.png`）：
  - `GenScreenLayout`：`artworks === undefined → div.flex-1`；`hasArtworks → StudioGalleryLayout`（`scrollRef` + `header` + `bottomContent=composer(true)` + `overlay`）；否则空态（问候语 + composer(false) + 5 个提示词 chip）。
  - `StudioGalleryLayout`：`relative min-h-0 flex-1` → 滚动区 `thin-scrollbar h-full overflow-y-auto px-4 md:px-6 pb-48` → sticky 头 `sticky top-0 z-20 flex justify-center bg-linear-to-b from-background via-background/85 to-transparent px-4 py-8`（实测 64→166，高 102）→ 悬浮 composer `pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t ... px-4 pt-10 pb-4 md:pb-6` + `pointer-events-auto mx-auto max-w-3xl`（768×112）。
  - 胶囊 Tab：容器 38px（`rounded-full border border-border/60`），列表 `p-1` / 36px，触发器 28px（`px-3 py-1 text-sm font-medium rounded-full`），激活态 `bg-primary text-primary-foreground`；标签 = `image.myArtworks`（My artwork）/ `video.myVideos`（My videos）/ `share.mine`（My shares）/ `gallery.favorites`（Favorites）。
  - 收藏空态：`div.flex.h-[55vh].flex-col.items-center.justify-center.gap-2.5 > Empty（MessageCircleHeart size-16 text-muted-foreground/50）+ 标题「No favorites yet」+ 描述「You have not favorited any artwork.」`。
  - 卡片（`ArtworkCard`/`VideoCard`）：`group/card relative block w-full overflow-hidden rounded-xl bg-muted/40 text-sm`；媒体按钮 `cursor-zoom-in`；hover 蒙层 `bg-linear-to-t from-black/65 … p-3`（提示词 + `模型 · 相对时间`）；左上收藏心形 `size-7 rounded-full bg-black/40 backdrop-blur-sm`（已收藏常显红色）；右上动作组 `absolute right-2 top-2 z-10 flex gap-1.5 opacity-0 group-hover/card:opacity-100`：`Submit for sharing` / `Regenerate` / `Edit (use as reference image)` / `Download` / `Delete`。网格实测 4 列、间距 12、卡片 328.5 宽（1440 视口 336.5），列高按最短列放置。
  - 查看器：`fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden md:flex-row`；左媒体区 `h-[44dvh] … cursor-zoom-out bg-background/95 md:flex-1 md:p-10`（返回 `left-3 top-3 size-11 md:left-4 md:top-4 md:size-8`、关闭 `right-4 top-4 size-8 hidden md:inline-flex`、上一件/下一件 `size-11` 圆形、`absolute inset-x-3 top-1/2 -translate-y-1/2 justify-between`）；右信息栏 `md:max-w-95（380px）md:flex-none md:border-l md:p-6`：模型名 + 收藏（ghost `size-8 text-muted-foreground`）、相对时间、`my-5` 分隔线、「Prompt」+ 复制（ghost icon-sm `absolute right-1 top-1 size-7`）、「Parameters」徽章（`gap-1.5`）、底部动作 `md:mt-auto md:pt-8`：`Use same style`（primary，`w-full h-9`）、`Submit for sharing`（outline w-full）、行内 `Download`/`Regenerate`（outline flex-1）+ `Delete`（outline size-9）。支持 ←/→/Esc 与点击媒体区关闭。
- **前端实现**：
  - 新增 `lib/generations.ts`（IndexedDB `generations` 表 CRUD + `useGenerations` 订阅式只读快照 + `downloadGeneration` + `generationAspectRatio`）、`hooks/use-gen-screen.ts`（Tab / 过滤 / 查看器 id / 上一件下一件 / 滚动容器）、`hooks/use-artwork-media.ts`（`/v1/*`、`/api/*` 媒体用令牌重新拉取并缓存为 Blob URL，绝对 URL 直接用）、`components/{studio-gallery-layout,studio-gallery-tabs,studio-artwork-card,studio-artwork-viewer}.tsx`。
  - 图片页 / 视频页：提交时创建真实记录（running）→ 成功后写回 `url` 与 `width/height`，失败写回真实错误；有作品时切换为画廊布局（胶囊 Tab + 瀑布流 + 悬浮 composer），无作品时仍是原空态 composer；`studio-image-input` / `studio-video-input` 新增 `floating`（只渲染 composer）与 `promptSeed` / `referenceSeed`（一键同款、用作参考图）。
  - 卡片 / 查看器动作全部接真实数据：收藏（IndexedDB）、下载、删除（ConfirmDialog）、重新生成（用记录里的 `values`/`schemaId`/`model` 重新发起真实请求）、用作参考图（图片）、Use same style（回填提示词 + 参数）。
  - 视频记录存 `url=/v1/videos/{task_id}/content`，刷新后用令牌重新拉取播放（不再依赖一次性 Blob URL）。
- **实测**：在真实浏览器里向本地库注入 5 条作品记录后复测 —— sticky 头 64→166（102px）、Tab 38/28px、卡片起点 166、4 列间距 12、悬浮 composer 768×112（底部留白 24）、查看器右栏 380px、动作行 331px（Download/Regenerate 各 140、Delete 36）均与参考站逐项一致；点击卡片「Regenerate」真实提交后端并落库真实错误 `No available channel for model mj_imagine under group default (distributor) (request id: …)`（本机无 MJ/视频渠道，符合预期）；验证结束后已清空本地测试记录，参考站注入数据与收藏状态也已复原。
- **i18n**：新增 12 键 ×7 语言（`My artwork` / `My videos` / `Favorites` / `No favorites yet` / `You have not favorited any artwork.` / `Previous artwork` / `Next artwork` / `Remove from favorites` / `Regenerate` / `Edit (use as reference image)` / `Delete artwork?` / `This artwork will be permanently deleted from this browser.`，另补 `Ratio`）；修正 `image.ideas.*` 5 个键的英文值（此前误填为键名，导致英文界面显示原始键）。`missingCount` 全 0。
- **已知差异**：① ~~「Submit for sharing」/「My shares」未实现~~ ✅ 已在第二十四轮实现（`POST /api/studio/share` + 审核态 + 本地 capability 媒体，参考站为 `studio-share/{id}/preview/{t}` 预览）；② ~~分享按钮与分享画廊（`StudioShareGallery`）缺失~~ ✅ 已在第二十四轮实现；③ 运行中卡片未做参考站的进度条样式（我们为占位 + 旋转图标）；④ 参考站媒体先转存自有 OSS，我们图片直接用上游 URL、视频用网关内容接口。

### 2026-10-01（第二十二轮：创作 → 视频生成 `/studio/video` composer 1:1）
- **参考站采集**（`/tmp/pw/r22/`：`run-ge.mjs` / `run-our.mjs` + `collect2.mjs` 用真实鼠标坐标驱动，产物 `ref-matrix2.json`（5 厂商 × 全部模式）与 `our-matrix4.json`；反编译参考站 `js/` 48 个 chunk，其中 `video-module.js` 含视频 schema 全量、`v1.js` 为接口层）：
  - 厂商 = 前端硬编码 5 家，顺序 `Kling → Vidu → Dreamina → HappyHorse → 阿里万相`，共 18 个模式（Kling 3 / Vidu 4 / Dreamina 3 / HappyHorse 4 / 万相 4）。
  - composer chip 行 `flex w-max min-w-full items-center gap-1`（gap 4px），chip 字号 12.8px / medium，宽度随文字自适应（中文 chip 因字体差异宽约 +5px）。
  - 比例弹窗实测与参考站**完全一致**：pop 320×150，格子 56×64，色块 18×18（1:1）/18×14（16:9）/14×18（9:16）/18×10（21:9）/10×18（9:21）—— 由 `boxOf(ratio, 14)`（最长边缩放到 14、最小 10px）得出，与图片页的 18 不同。
  - 媒体 chip tooltip 文案：`Start frame · Required` / `End frame · Optional` / `Reference image · 1 image` / `Reference image · Up to 7 images` / `Source video · Required (3–15 seconds)` / `Audio · Optional`；数字人 chip 顺序 = 厂商 → 模式 → **参考图 → 音频 → 参数**；万相视频编辑 chip 顺序 = 厂商 → 模式 → 模型 → `auto` → **视频 → 参考图 → 参数（中间有分隔线）**。
  - 参数面板高度 18/18 与参考站一致（Kling 文本/图生 514、数字人 142、Vidu 324、Dreamina 246、HappyHorse 338 / 编辑 510、万相 492/338/544）。
- **新增**：`lib/video-params.ts`（5 厂商 18 个 schema + `buildVideoRequest` / `defaultVideoValues` / `normalizeVideoValues`）、`components/{studio-ratio-select,parameters-marker,studio-video-command-select,studio-video-media-input,studio-video-parameters,studio-video-input}.tsx`，`video/index.tsx` 全量重写。
- **提交链路（真实生效）**：`POST /v1/videos`（body = `{prompt, model?, seconds?, metadata}`，metadata 透传比例 / 时长 / 模式 / 声音 / cfg / 负向提示词 / 种子 / 分辨率等）→ `GET /v1/videos/{task_id}` 轮询（5s × 120 次）→ `GET /v1/videos/{task_id}/content` 取视频 Blob 播放 + 下载；令牌密钥经 `fetchTokenKey` 懒加载，提交与轮询都带 `Authorization`；后端错误优先展示 `error.message`。
- **本轮追加修正**：Kling 声音开关按精确模型匹配（`kling-v3` / `kling-v2-6` 且 `mode=pro`）；媒体标签文案与 tooltip 对齐参考站；Kling 数字人 `models: []`（参考站无模型 chip，提交时不写 `body.model`）；厂商名 `阿里万相` 保持原文不翻译；字段名改为 `Aspect ratio` / `Audio control` / `Auto generate` / `Original video audio`；HappyHorse 视频编辑去掉比例字段、改可选参考图 chip，万相视频编辑保留比例 + 负向提示词 + 可选参考图；`alert.tsx` 新增 `info` / `warning` 变体（警告色 `border-amber-500/10 bg-amber-500/5 text-amber-800`），视频编辑提示按变体渲染；参数面板 number 字段 label 追加 `(Optional)`、`inputMode='numeric'` 过滤非数字、`h-8 text-sm`，select trigger `w-50` 且显示 option label；媒体 chip 图标音频用 `FileAudio`（与参考站一致）。
- **i18n**：键改名 10 组（`First frame`→`Start frame` 等）+ 值修正（脚本 + `bun run i18n:sync`，`missingCount` 全 0；`zh` untranslated 由 0→10 仅因 `Midjourney` / `HappyHorse` 等品牌词保持原文）。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json src/features/studio src/components/ui` ✅；`bunx oxfmt --check src/features/studio src/components/ui` ✅（修复 `studio-ratio-select.tsx`）；`bunx vitest run src/features/studio` 10/10 ✅；全量 `bunx vitest run` 2087 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 遗留）；真实浏览器（CDP 9223）逐项复测，并做真实提交：`POST /v1/videos {"prompt":"A calm lake at sunrise","metadata":{"aspect_ratio":"9:16","duration":"5","mode":"std","sound":"off","cfg_scale":0.5},"model":"kling-v3","seconds":5}` → UI 显示后端真实错误 `No available channel for model kling-v3 under group default (distributor) (request id: …)`（本机确实没有任何视频渠道，符合预期）。
- **已知差异（下一轮）**：① 参考站有作品时切换 `GenScreenLayout`（瀑布流画廊 + 悬浮 composer + 我的视频 / 分享 Tab + 视频查看器 + 收藏转存 OSS + 封面生成），本轮未实现；② 厂商 / 参数 schema 与参考站一样是前端硬编码 5 家，本机无视频渠道 → 只能验证到真实错误链路；③ 参考站媒体先上传平台 OSS 再提交 URL，我们直接提交 base64 data URL（任务插件支持 `data:` URL）；④ 参考站图片 / 视频上传走 `uploadPreferOwn`（自有 OSS），我们上传路径不同。

### 2026-10-01（第二十一轮：创作 → 图片生成 `/studio/image` composer 1:1）
- **参考站采集**（`/tmp/pw/r21/`：`ge-image.json`、`ge-image-composer.json`、`ge-image-popovers.json`、`ge-params-full.html`、`ge-chip-*.html`，反编译 `js/37bwcw4qol3fd.js` 的 `MJ_SCHEMA` / `buildMjPrompt` / `mjEndpoint`，反编译 `js/3ht90xbtye9gg.js` 的 `ImageScreen` 与 `js/0rrwbsnpw4z2a.js` 的 `shouldSubmitComposer`）：
  - 空态：`main` 内右上 `Backup and restore`（`absolute right-2 top-2 z-30`，我们已有）+ `div.flex.px-4.flex-1.flex-col.items-center.justify-center > div.w-full.max-w-3xl > [h1, InputGroup, chips]`；h1 实测 `336,344 768×36`、输入组 `336,412 768×112`、附加区 `337,477 766×46`、按钮行 `y=483 h=32`、chip 行 `540`（换行两行）。
  - 输入组：`InputGroup className="rounded-2xl border-border/80 bg-background/85 shadow-2xl/5 backdrop-blur-md has-disabled:bg-background/85 has-disabled:opacity-100"` + `textarea#studio-image-prompt rows=1 placeholder="Describe the image you want to generate..." className="thin-scrollbar max-h-50 min-h-16 px-4 pt-4 text-sm"`。
  - 底部：`InputGroupAddon align="block-end" className="min-w-0 justify-between gap-x-2 md:gap-x-8"` → 横向滚动容器 → `div.flex.w-max.min-w-full.items-center.gap-1 > div.flex.grow.items-center.gap-0.5`，7 个按钮：厂商 chip（自定义 MJ svg `size-5` + `span.max-w-32.truncate` + chevrons，Popover `min-w-52 p-0` = Command 搜索 + 厂商列表含图标）→ 版本 chip → `Separator`（`mx-0.5 h-4 bg-border/60`）→ 比例 chip（内联 14px 方块 + 比例文字，Popover `p-2` = `grid repeat(5,minmax(0,1fr)) gap-1.5`，每项 `h-16 min-w-14 flex-col gap-1.5 rounded-lg border`，选中 `border-primary/50 bg-primary/5`，方块 1:1 18×18 / 4:3 18×14 / 3:4 14×18 / 16:9 18×10 / 9:16 10×18）→ 参数按钮（`settings2 size-4`）→ 参考图按钮（`image-plus size-4`，`accept=image/*` multiple，MJ 下作为 `base64Array` 垫图）→ 令牌 chip（`key-round size-3.5` + 名称 + chevrons，`ml-auto`）→ 圆形发送（`variant=default icon-sm rounded-full` + `arrow-up size-4.5`）。
  - 参数面板（Popover `w-88 max-h-[min(65vh,34rem)] overflow-y-auto p-5`）：标题 Parameters + `Restore defaults`（outline xs）；`生成模式` Fast/Relax/Turbo（选中 secondary、未选 outline，`h-7 flex-1 text-xs`）；`画质 --q` / `风格` / `视角` / `人物镜头` / `灯光` / `艺术程度` 为 `Select size=sm w-50 text-xs`（含 `None`）；`风格化 --s`(0-1000/10) `混沌 --c`(0-100) `怪异 --weird`(0-3000/50) `角色参考权重 --cw`(0-100) 为滑杆；`提示词修饰`、`参考图` 为 Marker 分隔标签（before/after 各一条 `h-px bg-border/60`）；sref/cref/oref 为 `InputGroup h-8` + 尾部 `Upload` 按钮（`icon-xs`）；艺术程度下方提示「A preset for --s stylization; when selected, it overrides the slider above」。
  - 提示词拼接（`buildMjPrompt`）：`[prompt, [style, view, shot, light].filter(Boolean).join(', '), flags.join(' ')].filter(Boolean).join(' ')`；`flags` 仅在「值非空且 ≠ 默认值」时追加：`--ar`、`--v`/`--niji`、`--q`、`--s`（有 `art` 时改推 `art` 原文）、`--c`、`--weird`、`--sref`、`--cref`(+`--cw`)、`--oref`。默认值：mode=fast、aspectRatio=1:1、version=7、quality=1、stylize=100、chaos=0、weird=0、cw=0。
  - 提交：`mode=relax|turbo` 时端点改写为 `/mj-{mode}/mj/submit/imagine`；body `{prompt, ...a.length ? {base64Array} : {}}`（另带 `mode`）；轮询 `/mj/task/{id}/fetch`，3s 间隔，`status` SUCCESS/FAILURE/CANCEL，`progress`/`imageUrl`/`failReason`；上传参考图走 `/mj/submit/upload-discord-images`；键盘 `Enter` 提交、`Ctrl/Cmd+Enter` 换行。
- **本项目实现**：
  - `lib/image-params.ts`（新）：`StudioImageValues` + 默认值 + `MJ_MODES/ASPECT_RATIOS/VERSIONS/QUALITIES/STYLE_PRESETS/VIEWPOINTS/FRAMINGS/LIGHTINGS/STYLIZATION_PRESETS`（与参考站 schema 同值同序，含 `niji6/niji5/niji4`）+ `buildMidjourneyPrompt`（逐行对齐参考站实现）+ `midjourneyEndpoint`；`lib/__tests__/image-params.test.ts` 6 例覆盖默认值省略、niji、art 覆盖、修饰词合并、mode 端点。
  - `components/studio-image-input.tsx`（新，composer 主体：自适应高度 200px、Enter/Cmd+Enter、粘贴/选择参考图 → 80×80 缩略图 + `X` 删除、20MB 限制、5 个 chip 提示词）。
  - `components/studio-image-model-select.tsx`（厂商 + 图标 + 搜索）、`studio-image-version-select.tsx`（无搜索列表）、`studio-image-ratio-select.tsx`（比例方块网格）、`studio-image-token-select.tsx`（Select token + 刷新按钮 + `sk-xx***xxx`）、`studio-image-parameters.tsx`（17 项参数面板，内部 `ParametersSelect`/`ParametersSlider`/`ParametersMarker`/`ReferenceField`，空值用 `__none__` 哨兵映射）。
  - `image/index.tsx` 重写：厂商列表 = `Midjourney`（`mj`）+ 真实 `/api/pricing` 中 `supported_endpoint_types` 含 `image-generation` 的厂商（按厂商名分组，图标取 `resolveModelProvider`），版本列表随厂商切换；MJ 走 `/mj/submit/imagine`，其它厂商走 `/v1/images/generations`；令牌密钥懒加载（`fetchTokenKey`）、轮询与上传都带 `Authorization`（修复旧实现轮询未带 key 的问题）；后端错误优先取 `error.message`（无 MJ 渠道时直接显示 `No available channel for model mj_imagine …`）。
  - `hooks/use-studio-tokens.ts` 增加 `refresh()`（令牌弹窗里的刷新按钮）。
- **i18n**：新增 118 键 × 7 语言（脚本 + `bun run i18n:sync`，`find-missing-keys` 全绿；`MJ V*`/`Warframe`/`Ghibli` 等专有名词保留原文）。
- **验证**：`bun run typecheck` ✅；`bunx oxlint -c .oxlintrc.json src/features/studio` ✅；`bunx oxfmt` ✅；`bunx vitest run src/features/studio` 10/10 ✅；全量 `bunx vitest run` 2087 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 遗留）；真实浏览器（CDP 5173）实测：输入组 `336,436 768×112`（与参考站同尺寸，仅整体纵向偏移因中文 chip 只占一行）、厂商 347 / 版本 476 / 比例 561 / 参数 623 / 参考图 657 / 令牌 912 / 发送 1061 与参考站逐项一致；弹窗实测 版本 208×272、比例 320×80（每项 56×64）、参数 352×544、令牌 243×80，与参考站完全一致；选择「慢速 + MJ V6.1 + 16:9 + 风格=赛博朋克」后提交，真实请求为 `POST /mj-relax/mj/submit/imagine {"prompt":"a cat Cyberpunk --ar 16:9 --v 6.1","mode":"relax"}`，与参考站 `buildMjPrompt` + `mjEndpoint` 行为一致。
- **已知差异（下一轮）**：① 参考站的 `GenScreenLayout`（有作品时切换为瀑布流画廊 + 悬浮 composer + 我的作品/分享 Tab + 作品查看器 U/V 操作）尚未实现，本轮仍是空态 composer + 输入框下方结果块；② 厂商列表只显示本实例真实拥有的生图模型（本机仅 DeepSeek → 只有 Midjourney 一项，参考站的 OpenAI/Google/DouBao/BaiLian/StabilityAI/Kling 需要对应渠道与模型配置后才会出现）；③ 非 MJ 厂商暂只支持 `model + prompt` 最小出图参数（参考站按厂商 schema 提供尺寸/数量/负向提示词等字段）。

### 2026-10-01（第二十轮：创作 → 聊天对话 `/studio/chat` composer 1:1）
- **参考站采集**（`/tmp/pw/r20/ge-composer.html`、`ge-composer-layout.json`、`ge-empty.json`、`ge-pop-{model,parameters,reasoning,group}.html`、反编译 `ge-js/0k7ehh04zetrk.js` 的 `eF/eE/eB/ex/ev` 组件）：
  - 空态结构：`div.flex.flex-1.flex-col.items-center.justify-center.md:px-4 > div.w-full.max-w-3xl > [h1.mb-8.flex.items-center.justify-center.gap-3.text-2xl.md:text-3xl.font-medium.tracking-tight（Sparkles size-7 + 「早上好，有什么可以帮你？」）, div.px-4.md:pb-3 > div.relative.mx-auto.max-w-3xl > InputGroup]` —— 问候语与输入框整体垂直居中（实测 h1 在 303,448 768×36，输入组在 371,464 736×128）。
  - 输入组：`InputGroup className="rounded-2xl border-border/80 shadow-2xl/5 transition-colors"` + `InputGroupTextarea rows=1 placeholder="问点什么..." className="thin-scrollbar max-h-60 min-h-20 px-4 pt-4 text-sm"`（自适应高度 `min(scrollHeight,240)px`）；附件在 `InputGroupAddon align="block-start"`（图片 80×80 缩略 + 右上角 `X`）。
  - 底部 `InputGroupAddon align="block-end" className="min-w-0 justify-between gap-x-2"`：左簇 `thin-scrollbar flex min-w-0 flex-1 touch-pan-x items-center gap-0.5 overflow-x-auto …`（有消息时先渲染 `+`新建聊天 tooltip 按钮 + `span.mx-0.5 h-4 w-px bg-border`）→ 模型 chip（`Button ghost sm h-8 gap-1 font-medium` + `chevrons-up-down size-3.5`，Popover `w-88 max-w-[90vw] p-0`：Command 搜索「搜索模型...」+ 按厂商 CommandGroup + 选中 Check）→ 分隔线 → 参数按钮（`InputGroupButton icon-sm` + `settings2 size-4`，Popover `w-80 space-y-4 p-4`：温度 0-1 步长 .1 显示 `: 0.5`、最大上下文数 2-50 显示 30、最大回复 Tokens 100-80000 步长 100 显示 6000 + 提示、系统提示词 Textarea `max-h-40 min-h-20` 占位「设定 AI 角色 / 指令，留空则不使用」）→ 思考级别 chip（`brain size-3.5` + 文案 + chevrons，`title="思考级别"`，Popover `w-32 p-1`，按模型族过滤档位）→ 回形针（`paperclip size-4`，不支持时 `opacity-40 pointer-events-none` + tooltip「当前模型不支持上传」；支持时点击选文件、支持粘贴；超过 20MB toast「「{name}」超过 20 MB，已跳过。」）→ 有消息时再渲染橡皮擦「清除上下文」；右簇 `令牌分组 chip（layers size-3.5 + 名称 + chevrons，title="令牌分组（计费倍率）"，className 含 ml-auto，Popover w-56 p-0：Command 搜索 + 每项 `{ratio}x`）` + 圆形发送（`InputGroupButton icon-sm variant=default rounded-full`，`arrow-up size-4.5`，不可发送时 `opacity-40 pointer-events-none`；生成中变 `square size-3.5 fill-current` + tooltip「停止生成」）。
  - 键盘：`Enter` 发送、`Ctrl/Cmd+Enter` 插入换行、`Shift+Enter` 换行；`shouldSubmitComposer` 判定还会排除输入法组合中（`isComposing`）。
  - 清除上下文语义：**不删除消息**，而是在最后一条消息后插入 `Marker variant="separator"`（`before/after` 各一条 `h-px bg-border/60` 线，中间「已清除上下文」），发送时只有该分界之后的消息进入模型上下文。
  - 思考档位按模型名过滤（`gpt-6` → 无 none；`gpt-5.6` → 全档；`claude-opus-5/sonnet-5/…` → 全档；`gemini-3-pro` → low/high；其余回落 `['',none,low,medium,high]`）。
- **本项目实现**：
  - `features/playground/types.ts`：`PlaygroundConfig` 增加 `reasoning_effort` / `max_context` / `system`；`Message` 增加 `attachments` / `contextBoundary`；`ChatCompletionRequest` 增加 `reasoning_effort`。
  - `lib/streaming/payload-builder.ts`：按最后一条 `contextBoundary` 截断上下文 → 过滤无效消息 → 按 `max_context`（回合数 ×2）截断 → 注入 `system` 系统消息 → `reasoning_effort` 非空时透传（后端 `relaykit/dto` 已支持）。
  - `lib/message/*`：`createUserMessage`/`appendUserMessagePair`/`handleSendMessage` 支持附件；`formatMessageForAPI` 有图片附件时输出 `[{type:text},{type:image_url}]` 多模态内容。
  - `Playground` 新增可选 `renderInput(props)`：宿主可替换输入区并复用会话/请求逻辑；空会话时由宿主 composer 自行垂直居中（`/playground` 行为不变）。
  - 新增 `features/studio/components/studio-chat-input.tsx`（composer 主体：自适应高度、Enter/Cmd+Enter、附件读写为 data URL（图片）、20MB 限制、上传/清除上下文/新建聊天/发送/停止按钮）、`studio-chat-model-select.tsx`（厂商分组 Command）、`studio-chat-parameters.tsx`（3 滑杆 + 系统提示词）、`studio-chat-reasoning-select.tsx`（模型族档位表）、`studio-chat-group-select.tsx`（分组 + 倍率）、`hooks/use-studio-model-catalog.ts`（`/api/pricing` 真实目录：厂商名 / capabilities / input_modalities，用于厂商分组、思考档位显隐、上传可用性）。
  - `hooks/use-studio-chat.ts`：`clearMessages` 改为 `clearContext`（在最后一条消息打 `contextBoundary` 并立即落库）；studio 固定按 composer 语义提交参数（temperature + max_tokens 生效，其余 Playground 采样项不发送）。
  - `playground-chat.tsx` / `playground-message-content.tsx`：渲染「已清除上下文」分隔线与消息附件缩略图。
  - `StudioGreeting` 增加 `mb-8`，问候语改为参考站文案（`how can I help?` → 「有什么可以帮你？」）。
  - 四个 Popover 与参考站一致只设 `align="start"`（不写死 side，交给定位引擎自动翻转）；附件只接受图片（非图片 toast「仅支持上传图片」）。
- **i18n**：新增 24 键 × 7 语言（`Ask anything...`、`Reasoning effort`、`Off`/`Minimal`/`Extra high`/`Maximum`、`Temperature (randomness)`、`Maximum context turns`、`Maximum response tokens`、`Increase this value…`、`Set an AI role…`、`Select group`、`Search token groups...`、`No groups found`、`Token group (billing multiplier)`、`Upload images or files`、`The current model does not support uploads`、`Clear context`、`Context cleared`、`Stop generating`、`how can I help?`、`"{{name}}" exceeds {{size}} MB and was skipped.`、`Upload failed. Please try again.`、`Only images can be attached`）；顺带补齐 `{{tradeNo}} · {{amount}}` 与 fr/ja/ru/vi 的 `Low`/`High`；脚本 + `bun run i18n:sync`，`find-missing-keys` 全绿，脚本已删。
- **验证**：`bun run typecheck` ✅、`bunx oxlint src/features/studio src/features/playground` ✅（0 error/warning）、`bunx oxfmt --write` ✅、`bunx vitest run src/features/studio src/features/playground` 13/13 ✅、全量 `bunx vitest run` 2081 通过 / 3 失败（既有 `security/__tests__/page.test.tsx` 遗留）。
- **真实浏览器复核（CDP 5173 / 1440×900，中文界面）**：
  - 几何：输入组 736×128、textarea 734×80（`问点什么...`）、模型 chip 32 高、参数 32×32、思考 84×32、回形针 32×32、分组 96×32、发送 32×32；参数 Popover 实测 **304×310**（与参考站完全一致：304×310），模型 Popover `w-88`=352，分组 Popover 213，思考 Popover 122；空态 h1 与输入组整体居中。
  - 功能：贴图（64×64 PNG）→ 缩略图出现 → 发送 → 请求体 `messages[-1].content = [{type:text},{type:image_url:data:image/png;base64,…}]`，`deepseek-flash` 真实回复「这是一张纯色的图片，主色调是鲜艳的橘红色（或称朱红色）。」；`temperature 0.7`、`max_tokens 4096` 透传，`reasoning_effort` 为空时不发送。
  - 清除上下文：点击橡皮擦 → 出现「已清除上下文」分隔线；再次发送时请求体只含新消息（`messages.length = 1`，role `user`），旧消息仍可见。
  - 测试数据已清理（IndexedDB `conversations`/`messages` 均归 0）。
- **遗留差异**：参考站附件是上传到桶（`uploadPreferOwn(file,{scene:'studio_chat'})`，任意文件类型）；本项目仅在浏览器内把图片读成 data URL 随请求发送（未占用用户存储桶），因此选择器只接受图片、并且仅当目录里该模型有 `vision`/`image` 能力时可用；非图片文件未支持。

### 2026-10-01（第十九轮：创作 → 聊天对话 `/studio/chat` 会话侧栏 + 备份与还原）
- **参考站采集**（`/tmp/pw/r19/ge-chat-sidebar.json`、`live-sidebar.html`、`ge-js/2ldbpd7yikxjj.js`、`ge-js/226zk_9-laojt.js`、`ge-i18n.json`、`ge-i18n-en.json`）：
  - 侧栏 DOM：`SidebarHeader className="flex-row items-center gap-1.5 p-3"` = 「新建聊天」outline 按钮（`grow justify-start gap-2 border-border/40`，187×36）+ `Popconfirm`（清空历史聊天？/ 将清空历史聊天，仅保留星标聊天。/ 确认）包一个 38×36 的 Trash 按钮；分组顺序 `星标` → `今天 / 昨天 / 更早`（按 `updatedAt` 与本地 0 点、-86400s 比较，空分组不渲染）；条目 `SidebarMenuButton`（`isActive` + 悬浮 `SidebarMenuAction` → DropdownMenu 星标/取消星标、重命名、删除），重命名是 Dialog（Input `maxLength=60`、Enter 提交、取消/保存），删除是 ConfirmDialog（「{title}」及其全部消息将被删除，不可恢复。）；空态 `px-4 py-8 text-center text-sm text-muted-foreground` = 暂无聊天；底部 `SidebarFooter p-3` = 隐私提示卡（`rounded-lg border border-border/60 bg-card p-3 text-xs leading-relaxed text-muted-foreground`）；侧栏本体 `collapsible="offcanvas" className="border-border/50 bg-muted/30"`、宽 255、初始折叠（`defaultOpen=false`，`localStorage['studio:sidebar-open']` 记忆）——实测展开后「新建聊天」按钮位于 `12,76 187×36`，与参考站一致。
  - 内容区：左上 `SidebarTrigger`（`absolute left-2 top-2 z-20 text-muted-foreground`），右上「备份与还原」ghost/icon 按钮（`absolute right-2 top-2 z-30`，`aria-label="备份与还原"`，实测 32×32）。
  - 本地数据：IndexedDB（Dexie 库 `studio`）`conversations:"id, updatedAt"`、`messages:"id, [conversationId+createdAt]"`、`generations:"id, [kind+createdAt]"`（含收藏 `favorite`）；`useLiveQuery` 驱动侧栏，所以**任何写入都会即时反映到列表**。
  - 备份：**浏览器直传桶**（`/api/user/oss/url` 取签名 URL，gzip 上传，探测失败提示「请检查桶的 CORS 配置」）；备份体 `{app:"studio-backup",version:1,createdAt,data:{conversations,messages,generations}}`；还原只补本地缺失。本项目改为**后端中转**（无需桶 CORS，行为一致）。
- **本项目实现**：
  - 后端 `service/objstore/objstore.go` 增加 `ErrNotFound` / `ObjectInfo` / `Head` / `Get`；新增 `controller/studio_backup.go`（`GetStudioBackup` 状态、`PutStudioBackup` 上传（32MB 上限、JSON 对象校验）、`DownloadStudioBackup` 下载）与路由 `/api/studio/backup`（GET/PUT/GET file，`UserAuth` + `HeaderNavModuleAuth("studio")`，PUT 走 `UserCriticalRateLimit`）；对象固定 `studio/backup.json`，每次覆盖。
  - 前端存储层重写为 `lib/studio-store.ts`（IndexedDB 库 `studio` v2：`generations` / `conversations` / `messages`）+ `lib/studio-conversations.ts`（会话与消息 CRUD、`groupStudioConversations` 分组）+ `hooks/use-studio-chat.ts`（会话列表 / 当前会话 / 500ms 防抖落库 / 首条用户消息自动命名 30 字 / 清空当前会话 / 新建 / 重命名 / 星标 / 删除 / 清空历史；模型与采样参数与 Playground 共用 localStorage）。
  - 侧栏 `components/studio-chat-sidebar.tsx` 按参考站 DOM/类名复刻（offcanvas 位移、星标/今天/昨天/更早、悬浮菜单、重命名 Dialog、删除 ConfirmDialog、隐私卡、`studio:sidebar-open`），移动端用 Sheet 呈现同一份内容；`Playground` 增加可选 `state` 注入（studio 拥有消息与配置，`/playground` 行为不变）。
  - 备份弹窗 `components/studio-backup-dialog.tsx` + `lib/studio-backup.ts`：先查 `GET /api/user/storage` 判断是否配置桶（未配置 → 提示块 + 「去个人中心配置」跳 `/profile?tab=storage`），再探测 `GET /api/studio/backup`（失败显示「无法检测备份状态…」，与参考站一致地保留按钮）；「立即备份」PUT 快照、「从备份还原」先 Popconfirm 再 GET `/file` 并按 id 只补缺失；备份/还原后派发 `studio:data-changed` 事件，会话列表、消息与收藏即时刷新（对齐参考站的 live query）。
  - i18n：新增 12 个键 × 7 语言（脚本 + `bun run i18n:sync`，旧键已同步清理），英文与中文文案逐条对齐参考站（`studio.sidebar.*` / `studio.settings.*`），如 `No backup found` / `Back up now` / `Configure in Profile` / `All unstarred chats will be cleared.`。
- **验证**：`bun run typecheck` ✅、`bunx oxlint src/features/studio src/features/playground` ✅、`bunx vitest run src/features/studio` 4/4 ✅、全量 `bunx vitest run` 2081 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 遗留）、`go build ./...` ✅、`go test ./controller/... ./service/objstore/...` 全绿 ✅。
- **真实浏览器端到端（CDP 5173 + 本地 S3 兼容端点 127.0.0.1:9099）**：临时在个人中心「存储设置」把桶指向本地端点（`Verify and Save` 走真实 `/api/user/storage/verify`，PUT/DELETE 探针通过）→ `/studio/chat` 侧栏展开（新建聊天 12,76 187×36；空态「暂无聊天」；隐私卡）→ 真实发消息两轮（`deepseek-flash` 真实回复）→ 侧栏出现「今天」分组两条会话 → 悬浮菜单星标（移入「星标」组）、重命名（改过名字的对话）、删除（ConfirmDialog 生效）、清空历史（Popconfirm「清空聊天历史？/ 将清空历史聊天，仅保留星标聊天。/ 取消 / 确认」）→ 右上「备份与还原」：未配置分支、已配置分支（`上次备份 暂无备份` → `立即备份` → `备份完成：1 个聊天、2 条消息、0 件作品` + `0秒钟前 · 1 KB`）→ 删除本地会话后 `从备份还原` → `还原完成：新增 1 个聊天、2 条消息、0 件作品`，侧栏与消息区即时恢复。**验证后已删除测试会话（IndexedDB）并解除存储桶绑定，账号恢复未配置桶的原始状态；本地假 S3 端点已停止。**
- **已知差异（下一轮）**：`/studio/chat` 的 composer 仍是 Playground 版本（参考站：`问点什么...` 占位 + 参数配置 + 思考级别（brain）+ 回形针 + 令牌分组（layers，计费倍率）+ 圆形发送；空态时问候语与输入框整体垂直居中）。

### 2026-10-01（第十八轮：创作 → 发现作品 `/studio` 收藏 / 瀑布流 / 全屏详情）
- **参考站采集**（`/tmp/pw/r18-ge-*.mjs`、`/tmp/pw/r18/ge-detail.html`）：
  - 画廊是**绝对定位瀑布流 + 视口窗口化**（`div.relative w-full` 定高容器 / 子项 `div.absolute left-0 top-0` 用 `left` 定位列、`transform: translate3d(0,y,0)` 定位行），按「最短列」放下一张；卡片宽 = `(容器宽 - 12*(列数-1))/列数`，列数 2 / 3 / 4（断点 640 / 1024），行距 12；滚动到底**自动加载下一页**，页面没有「加载更多」按钮；DOM 只保留视口附近的卡片（实测 46 条数据只挂 18~22 个卡片节点）。
  - 卡片左上角收藏按钮：未收藏 `size-7 rounded-full bg-black/40 text-white/90 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100` + `aria-label/title="收藏"`；已收藏 `z-10 bg-black/5 text-red-400`（常显）+ `aria-label="取消收藏"` + `<Heart class="fill-current">`；收藏**不走后端**，存在浏览器 IndexedDB（库 `studio`，含 `generations` 等表），刷新后保持；页面没有「我的收藏」入口。
  - 点击卡片**不是弹窗**，而是渲染一个全屏详情层 `div.fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden md:flex-row`：左侧 `h-[44dvh] / md:flex-1 md:p-10` 媒体区（`cursor-zoom-out`，返回按钮 `absolute left-3 top-3 size-11 md:size-8 rounded-full border-border/60 bg-background/80 backdrop-blur-sm`、关闭按钮 `absolute right-4 top-4 size-8 hidden md:inline-flex`、上一件/下一件竖排在右缘 `md:right-4 md:flex-col md:gap-2.5`，图标 `chevron-left/up`、`chevron-right/down` 响应式切换）+ 右侧 `md:max-w-95 md:overflow-y-auto md:p-6` 信息栏（`h2 truncate text-base font-medium` 模型名 + 右侧收藏 ghost 按钮 / `mt-1.5 text-xs text-muted-foreground` 相对时间 / `Separator my-5 bg-border/60` / `h3 text-sm font-medium` 提示词 + `relative mt-2 rounded-lg hover:bg-muted/40 p-3` 内 `p.thin-scrollbar max-h-100 overflow-y-auto pr-6 text-sm leading-relaxed` 与右上 `ghost/icon-sm 复制` / `h3 mt-6` 参数设置 + `Badge secondary` 列表（MJ 作品只有 `operation U1` 一条）/ 底部 `md:mt-auto md:pt-8` 全宽 `一键同款`）。
- **本项目实现**：
  - 后端 `model/studio.go`：分享项新增 `aspect_ratio`（解析 Midjourney prompt 的 `--ar/--aspect W:H`，无标记按 MJ 默认 1:1）与 `parameters`（`operation` = 任务 action，如 `IMAGINE/UPSCALE/VARIATION`），控制器/接口结构不变。
  - 前端新增 `features/studio/lib/masonry.ts`（纯函数 `computeMasonryLayout`：最短列放置、实测高度优先）、`components/studio-masonry.tsx`（绝对定位 + 视口窗口化（overscan 1000px）+ 列数跟随 640/1024 断点）、`hooks/use-studio-favorites.ts` + `lib/studio-favorites.ts`（IndexedDB `studio/favorites`，`useSyncExternalStore` 同步所有卡片与详情，写失败自动回滚）。
  - 卡片 `studio-work-card.tsx`：补左上收藏心形（class/aria/图标与参考站逐项一致）、把图片/视频实测比例回传给瀑布流纠正高度；`discover/index.tsx`：栅格改为瀑布流、去掉「加载更多」（改为滚动到距底 800px 自动 `fetchNextPage`，内容不足一屏时自动续拉）、新增 `studio-work-detail.tsx` 全屏详情（含 `←/↑/→/↓` 与 `Esc` 键盘操作，媒体点击关闭、视频控件不冒泡）。
  - i18n 新增 `Favorite / Unfavorite / Previous work / Next work / Parameter settings` × 7 语言（脚本 + `bun run i18n:sync`，临时脚本已删）。
- **验证**：`bun run typecheck` ✅、`bunx oxlint src/features/studio` ✅（无 error/warning）、`bunx vitest run src/features/studio` 4/4 ✅（新增 `masonry.test.ts` 3 例）、全量 `bunx vitest run` 2081 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 遗留）、`go build ./...` ✅、`go test ./model/... ./controller/...` 全绿 ✅。
- **真实浏览器复核（CDP 5173，1440×900 与 390×844）**：临时向 `midjourneys` 写入 46 条测试作品（真实图片 URL，覆盖 16:9 / 2:3 / 3:2 / 4:5 / 1:1；**验证后已全部删除，库内仍为 0 条**）→ 瀑布流列宽 336.5 / 间距 12 / 容器定高 4229px、卡片按最短列落位；DOM 只挂 18~22 个节点（46 条）；滚动到底自动请求 `page=2`，无「加载更多」；收藏 → 心形变红填满 → 刷新后仍为已收藏（IndexedDB `studio` 计数 1）；点击卡片打开全屏详情（模型 / 6小时前 / 提示词 + 复制 / `operation IMAGINE` / 一键同款 / 返回·关闭·上下件），`→` 切下一件、`Esc` 关闭；一键同款跳转 `/studio/image?prompt=…`；移动端 390px：2 列（卡片 168px、容器 348px）、无横向溢出、详情层纵向堆叠。
- **环境备注**：本机 CDP 浏览器 `matchMedia('(hover: hover)')` 为 false（无指针设备），Tailwind v4 的 hover 工具类不会生效 → 截图里 hover 蒙层/工具条不可见属环境限制，非实现问题（DOM 与规则均已核对：`group-hover/card:opacity-100` 规则存在且选择器匹配）。

### 2026-10-01（第十七轮补充：模型详情页「阶梯计费」对齐 `/pricing/{model}`）
- **参考站采集**：`https://gpt.ge/models/gemini-2.5-pro` 与本站 `/pricing/deepseek-flash` 同步 DOM 对比（表头、行、价格单元格）。
- **对齐项**：① 价格字段标签 `Completion price`（补全价格）→ `Output price`（输出价格，`BILLING_VARS.c.label`），与参考站「可用分组 / 阶梯计费」两表用词一致；② 阶梯条件变量 `len` 显示为 `Input Token`（原「完整输入长度」），条件文本与参考站同形（`输入 Token > 200K`）；③ 阶梯价格由固定 4 位小数改为复用 `stripTrailingZeros` 自适应去零（`$3.0000/M` → `$3/M`、`$22.5000/M` → `$22.5/M`），与参考站 `$3.75/M`、`$22.5/M` 一致；④ 顺手消除 `dynamic-pricing-breakdown.tsx` 的嵌套三元告警（表头改为 `tierColumnHeader` 变量）。
- **i18n**：新增 `Input Token` × 7 语言。
- **验证**：`bun run typecheck` ✅；`bunx oxlint`（改动文件）✅；`bunx vitest run src/features/pricing` 253/253 ✅；CDP 真实浏览器复核 `/pricing/deepseek-flash`（表头 `生效条件 | 输入价格 | 输出价格 | 缓存读取 | 缓存写入 | 缓存写入 (1h)`，行 `输入 Token ≤ 200K → $3/M / $15/M …`）。

### 2026-10-01（第十七轮：个人中心 `/panel/profile` 账号关联 / 安全设置对齐）
- **参考站采集**：CDP 真实浏览器逐 Tab 采集（中文 + 切换 English 对照，`/tmp/pw/r17/ge-*.txt`、`/tmp/pw/r17/ge-en-*.txt`），并用 DOM 几何探针取到卡片原始 class 与矩形（`r17-geom*.mjs`、`r17-dom.mjs`、`r17-secdom.mjs`、`r17-notifdom2.mjs`）。
- **账号关联 Tab（结构 1:1）**
  - 卡片改为参考站的扁平结构：`flex items-center gap-3 rounded-xl border border-border/40 p-4 bg-linear-to-br …`，子元素只有「40px 图标框 / 标题+副文案 / 按钮」（去掉了原先多包一层的 `div.flex.items-center.gap-2` 与「已绑定」StatusBadge）。
  - 列表顺序与参考站一致：`绑定邮箱`（原「邮箱」）→ `GitHub` → `OIDC` → `WeChat`（原「微信」）→ `Passkey`；`Discord` / `Telegram` / `LinuxDO` 改为「后台启用或已绑定才渲染」（参考站只列出其支持的核心渠道）。
  - 未启用渠道按钮文案改为 `未启用`（原为「已禁用」徽章 + ghost 按钮）；已绑定邮箱仍显示 `绑定`（点击进入换绑流程），已绑定的其它渠道保留禁用的 `已绑定` 按钮。
  - 新增 Passkey 绑定卡（`KeyRound` 图标 + 「未绑定，绑定后可无密码安全登录」/「已绑定」，点击「绑定」走安全验证 → WebAuthn 注册），`安全设置` 中原有的 Passkey 管理卡（状态 / 移除）保留。
  - 图标对齐参考站：OIDC = `CircleDot`、WeChat = `MessageCircleMore`（WeChat 文字仍保留品牌英文名）。
- **安全设置 Tab（卡序 + 文案 1:1）**
  - 卡序改为参考站的 `两步验证 (2FA) / 系统令牌 / 删除账户`（同一 `grid-cols-1 gap-4 sm:grid-cols-2`，删除账户落在第二行第一列），本站独有的 `Passkey` / `更改密码` / `登录会话` 卡片按既定策略保留在后。
  - 文案对齐：`两步验证 (2FA)`（原「双重验证」）、按钮 `开启两步验证`（原「启用」）、说明「为账户开启动态码验证，即使密码泄露也能拦截登录」、Tab 说明「管理访问令牌与账户安全，操作前请谨慎确认」、删除账户说明「永久删除您的账户及所有相关数据，此操作不可恢复」。
  - 系统令牌卡对齐参考站：请求头示例 `pre` 改为 `overflow-x-auto rounded-md bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground`（去掉边框）、移除「您的用户 ID」与「访问记录」按钮（审计记录仍可在侧边栏「审计日志」查看）、未生成令牌时卡片只显示全宽 `生成令牌`（原「生成」，生成后的状态表 / 重新生成 / 撤销保留）。
- **订阅通知 Tab**：`配额警告阈值` → `预警额度`（参考站用词），其余字段顺序 / chips / 提示文案已对齐；参考站「通知方式 → 邮件」在本项目仍显示「邮箱」（同一个 i18n key 被登录 / 找回密码表单共用）；本站独有的「测试通知」按钮按既定策略保留。
- **i18n**：新增 3 键 × 7 语言（`Generate Token`、`Not enabled`、`Not bound — bind to enable passwordless sign-in`），并调整 6 个既有键的中文 / 繁中（2FA、删除账户、安全设置说明等）；临时脚本 + `bun run i18n:sync`，7 语言 `missingCount` / `extrasCount` 全 0。
- **测试**：`access-token-card.test.tsx` 改为断言参考站结构（请求头示例 + 全宽 `Generate Token`，不再有「访问记录」抽屉）；`enrollment.test.tsx` 的 2FA 按钮名同步为 `Enable 2FA`；`page.test.tsx` 绑定卡数量 5 → 6（该文件 3 例既有失败与本站历史布局有关，未新增失败）。
- **验证**：`bun run typecheck` ✅；`bunx oxlint src/features/security src/features/profile` ✅；`bunx oxfmt --write` ✅；`bunx vitest run src/features/security src/features/profile` = 55 通过 / 3 既有失败；CDP 真实浏览器截图 `/tmp/pw/r17/our-bindings.png`、`our-security.png`、`our-notifications.png`、`our-edit.png` 与参考站 `pt-ge-tab0-Subscriptions.png` 对照一致。
- **遗留差异**：① 参考站的 `Google` 绑定卡在本项目缺失（后端未实现 Google OAuth；可用后台「自定义 OAuth 提供者」配置 Google 端点达到同样效果）；② 通知方式文案「邮箱 vs 邮件」因共用 i18n key 保留；③ 本站独有卡片（Passkey 管理 / 更改密码 / 登录会话 / 记录 IP 开关）与「测试通知」按钮按既定策略保留；④ 存储桶媒体自动转存仍待接入。

### 2026-10-01（第十六轮：订单 / 发票 `/panel/order` 1:1）
- **参考站源码级采集**：抓取订单页 JS chunk（`/tmp/pw/ge-order-chunks/35n45yad1z0h6.js`）逐段还原列定义、工具栏、弹窗与接口清单；表格表头/列宽 DOM（`/tmp/pw/r16-ge-thead.html`）、页面文本（`/tmp/pw/r16-ge-order.txt`）。参考站接口：`/api/invoice/self`、`/api/invoice/self/amount`、`/api/invoice/`、`/api/invoice/invoicing`、`/api/invoice/amount`、`/api/topup/invoice`、`/api/topup/invoice/batch`、`/api/topup/clear`。
- **后端（新增/重写）**
  - `model/invoice.go` 重写：`Invoice` 增 `project_type` / `buyer_bank_account` / `buyer_tel` / `buyer_addr` / `invoice_no` / `red_invoice_no`，状态扩展为 `pending/invoicing/approved/rejected/red_flushing`；新增 `GetInvoiceableAmountForTradeNos`、`UpdateInvoiceStatus`、`UpdateInvoiceInfo`、`BatchInvoicing`、`CountInvoicesInRange`、`UpdateTopUpInvoiced`、`BatchUpdateTopUpInvoiced`、`ClearInvalidTopUps`（48 小时未支付）。
  - `model/topup.go`：`TopUp` 增 `type`（1 在线充值 / 2 兑换码，`TopUpTypeOnline`/`TopUpTypeRedemption`）与 `is_invoiced`；统计类查询（`HasSuccessfulTopUp`、`GetUserTotalTopUpQuota`、可开票订单查询）显式限定 `type = 1`，保持既有语义不变。
  - `model/redemption.go`：兑换码核销时在同事务内写入一条 `type=2` 的充值订单（`trade_no=REDEEM-{id}`、`money=0`、`status=success`），使兑换码在订单列表按参考站显示「兑换码 / 已兑换」。
  - 各在线支付下单处（epay / stripe / creem / waffo / waffo_pancake）显式写入 `Type: TopUpTypeOnline`。
  - `controller/invoice.go` 重写 + 新增 `AdminCreateInvoice`、`AdminUpdateInvoiceStatus`、`AdminUpdateInvoiceInfo`、`AdminBatchInvoicing`、`AdminInvoiceAmount`；`controller/topup.go` 新增 `AdminMarkTopUpInvoiced`、`AdminBatchMarkTopUpInvoiced`、`AdminClearInvalidTopUps`；`router/api-router.go` 挂载 `/api/invoice*`、`/api/invoice/admin*`、`/api/topup/invoice*`、`/api/topup/clear`。
- **前端**：`web/src/features/orders/` 全部重写 —— `index.tsx`（双 Tab + 双工具栏 + 两套表格 + 6 个弹窗接线）、`types.ts`、`api.ts`、`lib/invoice.ts`、`lib/invoice-display.ts`、`components/invoice-form|apply-dialog|detail-dialog|edit-dialog|reject-dialog|create-dialog.tsx`；共享组件小扩展：`DataTablePage`/`DataTableView` 新增 `onRowClick`（整行点击打开详情/标记已开票）、`DatePicker` 新增 `prefix`/`className`（对应参考站「开始/结束」前缀）。
- **布局要点**：整块内容是一张卡片（`rounded-xl border` 内：胶囊 Tabs → 工具栏 → 表格 → 分页），与参考站截图一致；表格不加 `applyHeaderSize`（参考站为纯 auto 布局、无 colgroup），避免横向滚动。
- **i18n**：新增 99 键 × 7 语言（含 `Redemption code`、`Online top-up`、`Not supported`、`Invoiced`、`Not invoiced`、`Paid`/`Unpaid`/`Test success`/`Redeemed`、`Approved`/`Invoicing`/`Red-flushing`、`Withdrawn`、发票表单与弹窗全部文案）；`Paid` 中文由「已提现」改为「已支付」，提现徽章改用新键 `Withdrawn`（中文仍为「已提现」）；`Redeemed` 中文改为「已兑换」。临时脚本 + `bun run i18n:sync`，`find-missing-keys` 全绿。
- **三库迁移验证（新增列/表：`top_ups.type`、`top_ups.is_invoiced`、`invoices`、`invoice_orders`）**
  - SQLite：`data/new-api.db` 重启两次，列与表存在、无重复 ALTER ✅
  - PostgreSQL 16（`/tmp/pgdata`，端口 5433）：全新库 AutoMigrate → `type bigint not null default 1`、`is_invoiced boolean not null default false`、两张表均建立 ✅；模拟旧库（DROP 列/表后再启动）自动补回且 0 error ✅
  - MariaDB 10.11（`/tmp/mysqldata`，端口 3307，MySQL 协议）：全新库 → `type bigint(20) not null default 1`、`is_invoiced tinyint(1) not null default 0`、两张表 ✅；模拟旧库后重启补回且 0 error ✅
- **端到端验证（CDP 真实浏览器 + 真实后端数据）**：勾选订单 → 「已选 1 个，合计 $50.00」→ 申请开票弹窗（不足 100 美元时红框禁用表单、满额时绿框可填）→ 填表提交 `POST /api/invoice` 成功（列表出现 $110.00 待审核）→ 行点击打开「申请详情」（含发票明细 UITEST-INV-001/002）→ 取消申请 `DELETE /api/invoice/:id` 成功；管理端（临时提权 role=10 验证后已还原）见 ID/用户 ID/上级 列、清除无效订单、用户 ID 查询、开始/结束日期、查询总额（已开票 0 笔，共 $0.00）、复制待审、批量审核、创建发票弹窗、行菜单（标记为已开票/开票中/待审核/驳回/编辑/复制/删除）。
- **测试**：`go build ./...` ✅；`go test ./model/... ./controller/...` ✅；`bun run typecheck` ✅；`bunx oxlint`/`oxfmt` ✅；全量前端测试 2078 通过 / 3 失败（既有 `security/__tests__/page.test.tsx` 路由桩用例，与本轮无关）。
- **遗留差异**：参考站的「批量自动开票 / 乐企智税扫码登录」依赖第三方税局服务（`/api/invoice/leqi/*`），本项目未接入（不做第三方税局对接）；开票记录「下载」仅在管理员上传发票文件后出现。

### 2026-10-01（第十五轮：充值页 `/panel/topup` 1:1 收尾）
- **参考站采集**：CDP 真实浏览器抓取 `GET https://gpt.ge/api/topup_status` 原始 JSON 与充值页 HTML/双端截图（`/tmp/pw/r15-ge-topup*.png|html`、`r15-ge-topup-cols.html`），逐条比对额度卡、支付方式、兑换码区块的真实文案与取值来源。
- **代码级差异修复（两处，其余均为环境配置差异）**
  - 支付方式下方提示：参考站取后台 `epay_tip`（本项目此前硬编码「最低充值金额」）。后端 `setting/operation_setting/payment_setting.go` 新增 `EpayTip`（json `epay_tip`）、`controller/topup.go` 的 `/api/user/topup/info` 返回该字段；前端 `recharge-form-card.tsx` 有值显示该提示（Info 图标），为空回退「最低充值金额」；后台「系统设置 → 计费与支付 → 支付网关 → 常规」新增 `支付提示` 输入框（schema / sanitized / initial / dirty 全链路 + i18n）。
  - 兑换码下方链接：参考站仅在后台配置 `top_up_link` 时显示「无法在线充值？购买兑换码」。前端改为仅当 `topup_link` 存在时渲染（移除原先 else 分支的「兑换码将立即充值到余额。」）。
- **i18n**：新增 `Payment tip`、`Shown below the payment methods on the top-up page` ×7 语言；zh/zh-TW 调整 `Redeem` → 兑换余额/兌換餘額、`Enter your redemption code` → 请输入充值兑换码/請輸入儲值兌換碼、`Can't pay online?` → 无法在线充值？/無法線上儲值？；临时脚本 + `bun run i18n:sync`，missing/extras 全 0。
- **验证**：`go build ./...` ✅（后端已 restart 生效）；`curl /api/user/topup/info` 返回 `epay_tip`/`topup_link` ✅；`bun run typecheck` ✅；`bunx vitest run src/features/wallet src/features/system-settings`（19 文件 / 180 例）✅；`oxlint`/`oxfmt`（改动文件）✅（顺手消除 `recharge-form-card` 的嵌套三元告警）；CDP 真实浏览器双端对比（`r15-our-topup-1440.png`、`r15-our-redeem.png`、`r15-our-topup-mobile.png` vs `r15-ge-topup-1440.png`、`r15-ge-redeem.png`、`r15-ge-topup-mobile.png`），后台输入框截图 `r15-admin-payment-tip.png`。
- **本机真实配置（非假数据，均可在后台修改）**：按参考站同值写入 `payment_setting.epay_tip=需要对公汇款请联系客服。`、`TopUpLink=https://shop.gpt.ge/buy/1`。
- **遗留差异（环境数据，非代码）**：本机 `quota_display_type=USD`（参考站为 CNY）、`price=7.3`（参考站约 2.5）；参考站双节 `promo_*` 活动、微信/USDT/USD 支付方式与分组描述在参考站后台配置，本机未配置（组件已实现，配置后即显示）。

### 2026-10-01（第十四轮：令牌页 `/panel/token` 小屏 + 批量条 + 细节对齐）
- **参考站采集**：CDP 真实浏览器 390px/1440px 双端探针（`/tmp/pw/r14-*.mjs|png|html|log`），并从源码包 `/tmp/pw/ge-chunks2/1bu-jlub15zt3.js` 取到工具栏与列定义的原始 JSX。
- **小屏改为同一张表（关键结构差异修复）**
  - 参考站 390px 下不是卡片列表：工具栏首行 = `筛选查询`（`lg:hidden mr-auto`）+ 漏斗（显示列）+ `创建令牌`，筛选控件默认收起，展开后为整宽竖排（`w-full lg:w-36/40`）；表格仍是桌面同一张，容器 `overflow-x-auto`（实测 322 视口 / 949 表宽），状态列 `sticky right-0`。
  - 本项目：`ApiKeysTable` 删除自研 `ApiKeysMobileList`/骨架屏与 `now` 定时器（`hideMobile` 走桌面表），`ApiKeysToolbar` 新增 `筛选查询` 折叠（`aria-expanded`，`max-lg:order-1` + `max-lg:flex-col`，几何与参考站一致：按钮 x=29 w=78、输入 330×36 竖排）。
- **批量操作条内联化**：参考站在勾选行后把筛选区**替换**为 `复制N 个`（outline sm，Copy icon）/ `删除N 个`（outline sm，Popconfirm 标题「确认删除选中的令牌？」+「共 N 个令牌将被删除，此操作不可恢复。」）/ `取消`（secondary sm），右侧动作区保留。我们删除了浮动 `BulkActionsToolbar` 与 `ApiKeysMultiDeleteDialog`，改为 `DataTableBulkActions` 内联渲染进工具栏。
- **筛选框可清空**：新增共享 `web/src/components/ui/input-clear.tsx`（`InputGroup` + `InputGroupInput` + 内联 `X`，对应参考站 `InputClear`：`icon-sm` 幽灵按钮、仅在有值时出现），名称/ApiKey 两个筛选项接入，并支持回车提交。
- **列宽/表头/面包屑对齐**
  - 表头 `t('API Key')` → `t('ApiKey')`，`ApiKey` 文案七语言统一为字面量 `ApiKey`（参考站中文界面也是 `ApiKey`）。
  - 按参考站实测列宽重新标定 `size`（select 30 / name 85 / key 160 / group 155 / quota 125 / created 130 / expired 85 / status 60），桌面实测已逐列对齐到 ±5px（参考 station x=357 起：29/84/158/138/134/137/82/154/57）。
  - 固定列分隔线由柔和投影改为参考站的 1px inset 边线（`shadow-[inset_1px_0_0_0_color-mix(in_oklab,var(--color-border)_40%,transparent)]`，共享 `column-pinning.ts`）。
  - 卡片工具栏行去掉多余的 `mb-3`（参考站只有 `border-b pb-4`，间距 16px）。
  - 面包屑/侧边栏 `Dashboard` 中文由「数据看板」改为「仪表盘」（参考站为 `仪表盘 > API 令牌`），zh-TW 同步为「儀表板」。
  - BaseURL 主显示在无路径时补灰色 `/v1`（参考站硬编码 `https://api.gpt.ge` + `/v1`；我们仍是配置里的真实地址，只补路径展示）。
- **CC Switch 弹窗**：BaseURL 选择框下方新增 `FieldDescription` 线路描述行（参考站 `data-slot="field-description"`，数据来自后台 `api_info` 的 description，未配置则不显示）。
- **i18n**：新增/调整 6 键 × 7 语言（`Copy {{count}}`、`Delete {{count}}`、`Delete selected tokens?`、`{{count}} token(s) will be deleted. This action cannot be undone.`、`ApiKey` 字面量、`Filters` → 中文「筛选查询」/繁中「篩選查詢」、`Dashboard` 中文「仪表盘」），走临时脚本 + `bun run i18n:sync`，missing/extras 全 0。
- **验证**：`bun run typecheck` ✅；`bunx vitest run src/features/keys`（8 文件 / 62 例）✅；全量 `bunx vitest run` = 171 文件 / 2078 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 路由桩失败）；`oxlint`/`oxfmt`（改动文件）✅；CDP 双端走查（截图 `r14-final-desktop.png`、`r14-final-selected.png`、`r14-final-popconfirm.png`、`r14-final-ccswitch.png`、`r14-final-mobile.png`、`r14-final-mobile-expanded.png`）。
- **遗留差异（下一轮继续）**
  - 参考站列宽是纯 auto 布局（列定义只给了 select `size:40`），我们仍靠 `size` 比例近似；长内容时表现会略有差异。
  - 参考站批量复制按钮无 loading 态（我们保留 spinner，功能更好）。

### 2026-10-01（第十三轮：令牌页 `/panel/token` 1:1 收尾）
- **参考站采集**：CDP 真实浏览器逐元素探针（`/tmp/pw/r13-*.mjs|json|html|png`）：表头/单元格 DOM、行操作菜单、删除 Popconfirm、显示列下拉、分组 tooltip、BaseURL hover 卡、CC Switch 弹窗全量 HTML。
- **表格列 1:1（`api-keys-columns.tsx` / `api-keys-cells.tsx` / `api-key-group-cell.tsx`）**
  - 参考站列定义（源码 `/tmp/pw/ge-chunks2/1bu-jlub15zt3.js`）为 `select / name / key / group / quota / created_time / expired_time / actions / status`：已按此删除我们多出的 `模型限制`、`IP 限制` 两列（信息分别移入分组单元格徽章与编辑抽屉，与参考站一致）。
  - 名称列：`名称 + 状态徽章`（启用不显示；禁用 `yellow`、过期 `amber`、耗尽 `red`、未知 outline），删除独立「状态文字」列。
  - ApiKey 列：`sk-` + `key.slice(0,2) + '***' + key.slice(-3)` + 复制按钮（`CopyButton` 扩展 `position='right'` / 支持函数取值 / `disabled`；列表接口只返回掩码 key，真实 key 仍按需 `POST /api/token/:id/key` 懒加载）。
  - 分组列：`size-2 rounded-full bg-primary` 圆点 + `max-w-30 truncate` 分组名 + tooltip（用户分组接口的 `desc`，如「通用渠道（全站大部分模型可用）」）+ `自动` 徽章（`cross_group_retry`）+ `模型限制` outline 徽章（tooltip 列出授权模型）；不再显示倍率 `1x`。
  - 创建时间：绝对时间 `YYYY-MM-DD HH:mm`（新增 `formatTimestampToMinute`），不再显示「创建时间/最后使用」两行。
  - 操作列：`连接应用` 菜单（MessageSquare，`size=sm` ghost）→ 图标盒 + `配置 CC Switch` / 聊天预设项；`|` 分隔线；铅笔（`size=sm` ghost）；`|` 分隔线；垃圾桶 Popconfirm（新增共享 `web/src/components/ui/popconfirm.tsx`，w-60 / 3.5 内边距 / 取消+删除）。删除改为直接调用接口并刷新（移除已无用的单条删除弹窗）。
  - 状态列：`meta.pinned='right'`，表头/单元格都居中，`Switch checked={status===1}` → 复用 `PUT /api/token/?status_only=true`。
- **工具栏**：状态筛选 popover 移除，改为参考站结构 = 刷新（`max-xl:hidden`）+ 共享 `DataTableViewOptions`（漏斗 → `显示列`：名称 / ApiKey / 分组 / 已用 / 剩余 / 创建时间 / 过期时间，状态列 `enableHiding:false`）+ `创建令牌`（`px-4 shadow-lg shadow-primary/20`）；状态筛选仅保留在 URL 参数（`useTableUrlState`）里。
- **BaseURL 卡（`api-keys-summary-card.tsx`）**：改为参考站结构——`BaseURL ⓘ`（提示：Apikey必须搭配BaseURL使用…）+ hover 卡（标题 `可用API地址` + 右侧 `部分应用需添加/v1后缀`，条目 = 地球图标 + 线路名 + URL + 复制）+ outline 复制按钮；右侧 3 个统计块改为参考站样式（`rounded-xl/rounded-lg bg-background/80 px-5 py-2`，`size-10` 圆形图标 `size-5 text-foreground/70`，`max-md:hidden`，值与标题上下排列）。
- **连接应用弹窗（`dialogs/cc-switch-dialog.tsx`）**：按参考站重做——标题 `配置 CC Switch` + 描述 `选择线路和模型后，打开已安装的 CC Switch`；应用改 `ToggleGroup`（Claude/Codex/Gemini）；名称默认取当前令牌名；新增 BaseURL 线路选择（真实数据来自 `useApiAddresses()`，展示 `线路名 · URL`）；中间 Alert 说明「可选模型根据当前令牌的权限和令牌分组获取…」；主模型带 `刷新`（invalidate 查询）；Haiku/Sonnet/Opus 用 `ComboboxInput`（可搜索、可自定义值）；底部 `取消 / 填入 CC Switch`（外部链接图标，未选主模型时禁用）。
- **`ComboboxInput` 行为修正**：无选项时点击也会展开「No models found」空态（此前必须有选项或输入内容才展开），与参考站空态一致。
- **i18n**：新增 16 键 × 7 语言（`Model restriction`、`Authorized models`、`Are you sure you want to delete "{{name}}"?`、`This action cannot be undone.`、
  `Connect App`、`Configure CC Switch`、`Available API Addresses`、`Some applications require the /v1 suffix`、BaseURL 提示语、`Fill into CC Switch`、`Pick a line and models…`、
  `Select an API address`、`Search and select a model`、`Haiku/Sonnet/Opus Model (optional)`、模型权限提示语），走临时脚本 + `bun run i18n:sync`，missing/extras 全 0。
- **验证**：`bun run typecheck` ✅；`bunx vitest run` 全量 ✅（171 文件 / 2079 用例；`security/page.test.tsx` 3 例为既有失败、`usage-logs/detail-preview` 1 例为高负载下的偶发超时，单跑通过）；`oxlint`/`oxfmt`（改动文件）✅；CDP 走查 `/keys` 桌面表格、显示列、行菜单、Popconfirm、复制按钮、BaseURL hover 卡、连接应用弹窗（截图 `/tmp/pw/r13-token-our.png`、`r13-our-rowmenu.png`、`r13-our-popconfirm.png`、`r13-our-ccswitch.png`）。
- **遗留差异（下一轮继续）**
  - 令牌页小屏仍是我们的卡片列表（参考站小屏是同一张横向滚动表格 + `筛选查询` 按钮）。
  - 参考站 CC Switch 弹窗 BaseURL 字段下有一行线路描述（如 `全球直连`），我们只显示选择框。
  - 参考站表头/搜索框的 `ApiKey` 文案在中文界面下就是 `ApiKey`（我们保留中文翻译 `API 密钥`）。

### 2026-10-01（第十二轮：仪表盘 `/panel` 1:1 + 全局金额格式）
- **参考站采集**：`/tmp/pw/r12-ge-dashboard.png|txt`、`r12-ge-dash-probe{,2}.json`、`/tmp/pw/r12b-probe*.mjs`（CDP 真实浏览器逐元素探针：欢迎行 / 三大大卡 / 三小卡 / 模型用量统计卡 / 令牌行 / 充值页 VIP 卡 / 使用日志汇总卡）。
- **全局金额格式（本轮最大发现）**：参考站**余额、累计消耗、收益、奖励、实付金额全部固定 2 位小数**（`$0.00`/`$0.30`/`$1.00`/`实付 60.00 元，节省 15.00 元`），我们此前到处 `formatQuota()` 会 trim 成 `$0`/`$1`。
  - `web/src/lib/currency.ts` 新增 `fixedFractionDigits`（同时作用于 `formatCurrencyFromUSD` / `formatLocalCurrencyAmount` / `formatQuotaWithCurrency`；**TOKENS 显示被显式排除**，令牌数量仍走原缩写逻辑，避免出现 `500000.00`）。
  - `web/src/lib/format.ts` 新增 `formatQuotaFixed(quota)` = 固定 2 位小数的额度显示。
  - 已替换：仪表盘 账户余额/累计消耗、令牌页 账户余额/累计消耗 与 已用/剩余、邀请计划 待使用收益/累计收益/奖励规则/解锁条件/奖励与提现记录、个人中心 余额/累计消耗、充值页 账户余额 与 `实付/节省/待支付`、使用日志「当前 MPM」。
  - 明确**不改**：模型价格与日志表格金额（参考站为变长精度，如 `$0.014`）、今日小卡金额（参考站就是 `$0`）、令牌页金额仍不带货币符号（单位在列头与详情弹层）。
- **仪表盘文案/结构对齐**
  - 三小卡：`今日 消耗`/`今日 请求`/`今日 Token`（参考站中文带空格，原为「今日消耗/今日请求」）；金额 `$0` 保持不补零（与参考站一致）。
  - 模型用量统计卡：右上角由 `最近 7 天` 改为参考站原文 **`同步延迟：20 分钟`**（新增常量 `SHARE_SYNC_DELAY_MINUTES = 20` + i18n 键 `Sync delay: {{minutes}} minutes`）；正文改为 **`近 7 天消耗 $0.00，日均 $0.00`**（金额固定 2 位）。
  - 三大大卡（`$0.00` 余额/消耗、`用户分组：default` + `前往充值`/`查看日志`、图标 `h-10 w-10 rounded-full`）、系统公告卡（PillTabs `系统公告/调价公示` + `订阅通知` + Accordion 条目）经 DOM 探针比对与参考站一致。
- **使用日志汇总卡文案对齐**：`区间消费→区间消耗`、`每分钟消费→每分钟消耗`、`每分钟 Token 数→每分钟Token数`（参考站原文），当前 MPM 金额改固定 2 位（`$0.00`）；卡片结构与「查看/刷新」行为已与参考站一致。
- **令牌页「已用 / 剩余」单元格按参考站源码重写**：参考站前端包（`/tmp/pw/ge-chunks*/1bu-jlub15zt3.js`）里该列实现为
  ```jsx
  <div className="whitespace-nowrap">
    <Badge variant="outline" className="mr-1">{renderQuota(used_quota)}</Badge>
    <Badge variant="outline">{unlimited_quota ? t('unlimited') : renderQuota(remain_quota)}</Badge>
  </div>
  ```
  且同一包内 `renderQuota = (q, digits = 2) => "$" + (q / 500000).toFixed(digits)` —— 这就是「全局金额固定 2 位小数」的源头（我们保留可配置的 `quotaPerUnit`/币种，不硬编码）。桌面端已改为同款两个 outline Badge（去掉进度条与弹层）；移动端卡片仍保留我们的标签 + 进度条 + 详情弹层（参考站没有移动端卡片，是小屏下横向滚动的同一张表）。
- **充值页 VIP 卡补真实数据（参考站「您已累计充值 $0.30」）**
  - 后端：`model.GetUserTotalTopUpQuota(userId)`（`SUM(amount)`，仅统计 `success` 订单）+ `GET /api/user/topup/info` 新增 `total_topup`（额度单位）。
  - 前端：`ExtraDiscountCard` 底部由「你的分组：x」改为 `您已累计充值 {{amount}}`（`formatQuotaFixed`，金额固定 2 位）；条目继续按后台真实配置渲染（分组名 + 折扣胶囊 + `GetUsableGroupDescription` 描述）。
  - 验证：本机 CDP 实测渲染为 `您已累计充值 $1.10`（该用户两笔成功充值 300000+250000 额度 / 500000 = $1.10，与数据库一致）。
  - **数据库兼容验证**：新增 `model.GetUserTotalTopUpQuota` 的 `COALESCE(SUM(amount), 0)` 语句在真实 **SQLite（`model` 包内存库）/ PostgreSQL 16.15 / MariaDB 10.11.18** 三种引擎上运行通过（临时对照用 Go 测试：同一函数对三种方言分别 `AutoMigrate` + 造数 + 求和，结果均为 550000，空用户为 0；验证脚本用后即删，MySQL/PG 服务已停止）。
- **i18n**：新增 1 键（`Sync delay: {{minutes}} minutes`）× 7 语言，并校正 zh/zh-TW 共 12 条文案（今日 消耗、近 N 天消耗 …）；走临时脚本 + `bun run i18n:sync`，`missingCount`/`extrasCount` 全 0，脚本用后即删。
- **验证**：`bun run typecheck` ✅；`bunx vitest run src/features/{keys,profile,invitation,dashboard,wallet,usage-logs} src/lib` ✅（45 文件 / 592 用例，含按新格式更新的 `api-key-listing.test.tsx`、`affiliate-records.test.tsx`）；`oxlint`/`oxfmt`（改动文件）✅；CDP 走查 `/dashboard/overview`、`/keys`、`/wallet`、`/invitation`、`/profile`、`/usage-logs/common`（截图 `/tmp/pw/r12b-our-dashboard.png`）逐页核对金额与文案。
- **遗留差异（下一轮继续）**
  - 令牌页「已用 / 剩余」：参考站无限额令牌用两个 outline Badge 展示 `$0.00` + `不限额`，我们仍是纯文本 + 进度条的 popover（金额不带符号，`.00` 已对齐）。
  - 充值页 VIP 卡条目副标题取自后台分组描述（`UserUsableGroups`）：参考站配的是 `累计充值 $3000` / `30 天内日均消费 $100`，本机未配置故显示 `vip分组`/`svip`（属环境数据，代码路径一致）。
  - 充值页 `实付 X 元` 的币种取自本机货币显示配置（本机 USD → `$`），参考站是 CNY 配置，属环境数据差异。
  - 参考站充值页还有「无法在线充值？购买兑换码」区块，我们仅在配置了 `topup_link` 时展示入口。

### 2026-10-01（第十一轮：工单 `/panel/ticket` 1:1）
- **参考站采集**：`/tmp/pw/r11-ge-ticket*.{png,txt,html}` + CDP DOM 探针（列表卡 / PillTabs / 列表项 / 对话面板 / composer / 创建弹窗 / 关闭确认框）。关键实测值：
  - 容器 `flex h-[calc(100dvh-13.5rem)] min-h-0 flex-col gap-4 lg:h-[calc(100dvh-16rem)] lg:flex-row`，左列表 `lg:w-80` 卡 `rounded-2xl border-border/40 bg-background/60 p-3`，右面板 `lg:flex-1 hidden lg:block`。
  - PillTabs：`w-full rounded-full border border-border/40 bg-background/40 p-1`，触发器 `flex-1 text-xs text-muted-foreground`，选中为绝对定位 `bg-primary` 胶囊 + `text-primary-foreground`；计数红点 `h-4 min-w-4 rounded-full bg-red-500 text-[0.6rem] text-white`。
  - 列表项：`<img 36×36 rounded-full>` + 标题 `text-sm font-medium` + 状态胶囊 `rounded-full px-1.5 text-[0.65rem]`（待回复 amber / 已关闭 `border-border/50 bg-muted`）+ 邮箱 + 相对时间 `text-[0.7rem]`；选中态 `border-border/80 bg-muted/40`。
  - 对话面板：header `p-4 border-b`，meta 行 `mt-1.5 text-xs`（工单号 secondary 胶囊 + 分类文字 + `·` + 邮箱 truncate），右侧「关闭工单」（`X` 图标 + 文字，`h-8 rounded-[min(var(--radius-md),12px)] border-border/60`，AlertDialog 确认）；消息区 `flex-1 space-y-4 overflow-y-auto p-4` + 自绘滚动条；消息行 32px 头像 + `max-w-[78%]` 气泡（我方 `bg-primary text-primary-foreground`，客服 `bg-muted/60`）+ 气泡上方 `text-[0.7rem]` 作者/时间 + 我方气泡下 `CheckCheck size-3`；composer `form.p-3 > div.rounded-2xl.border.p-2.focus-within:border-primary/40 focus-within:ring-2`，textarea `field-sizing-content max-h-40 min-h-12 resize-none border-none bg-transparent px-1.5`，工具行 `< />` + 📎 + `flex-1` + 圆形 `size-9 rounded-xl` 发送按钮。
- **后端（真实能力，无假数据）**
  - `tickets.ticket_no`：`TK` + `yyyymmdd` + 7 位工单 ID（如 `TK202610010001068`）；`AutoMigrate` 加列 + `BackfillTicketNumbers()` 为历史工单回填；列表/详情/管理端自动带出。
  - `GET /api/ticket/stats`：返回 `{pending,resolved,closed}` 计数（`CountTicketsByStatus`，支持 SQLite/MySQL/PostgreSQL 的 `GROUP BY`），供 Tab 红点。
  - 控制台状态语义对齐参考站：`pending`（待回复）= 仅 `open`；`replied`（已回复）= `in_progress` + `resolved`（工单状态枚举与后台筛选保持不变）；徽章文案 `in_progress → 已回复`（emerald）。
  - **工单附件**：`POST /api/ticket/attachment`（multipart，≤5 MB，白名单 `.png/.jpg/.jpeg/.gif/.webp/.bmp/.avif/.pdf/.doc/.docx`，与参考站 accept 一致），落盘 `data/ticket-attachments/u<用户ID>/<32位随机 hex>.<ext>`（`TICKET_ATTACHMENT_DIR` 可覆盖）；`GET /api/ticket/attachment/:userId/:name` 以**能力 URL**公开提供（控制台 `<img>` 无法携带 Authorization 头，文件名 128 位 `crypto/rand` 保证不可枚举），并带 `X-Content-Type-Options: nosniff`、图片 `inline` / 文档 `attachment`。
- **前端**
  - `use-ticket-composer.ts`（新增，创建弹窗与回复框共用）：插入代码块（`\n```\n\n```\n`，光标落在围栏内，与参考站一致）+ 选择/粘贴文件上传 → 图片写 `![name](url)`、其他写 `[name](url)`；5 MB 与类型校验 + toast。
  - `ticket-conversation.tsx`：header 右侧「关闭工单」+ `AlertDialog`（`确认关闭工单` / `关闭后将无法继续回复，确定要关闭吗？`）；工单号 TK 徽章 + 分类 + 邮箱；消息用 `@/components/ui/markdown` 渲染，套用参考站同款 markdown 容器类（`ticket-constants.ts` 的 `TICKET_MESSAGE_MARKDOWN_CLASS`）；我方消息 `CheckCheck` 已发送标记；时间戳今天显示 `HH:mm`、更早显示本地化「月日 时:分」；composer 加 `</>`/📎/圆形发送 + 自绘滚动条；关闭态提示改为参考站原文。
  - `index.tsx`：Tab 红点计数（`/api/ticket/stats`）、Tab 值改为 `replied/pending/closed`、列表项选中态与相对时间（`formatTimestampRelative` + `toIntlLocale`，中文无空格「13小时前」与参考站一致）、刷新按钮 32px、状态胶囊与参考站几何一致。
  - `new-ticket-dialog.tsx`：复用 composer hook，补 `</>` 与 📎 按钮（弹窗几何仍为 512×509，与参考站实测一致）。
  - 新增 `ticket-constants.ts`（分类文案 + markdown 容器类）与 `ticket-badges.tsx` 重写（`rounded-full px-1.5 text-[0.65rem]`，amber/emerald/muted 三态）。
- **i18n**：新增 6 键 × 7 语言，并按参考站原文校正 4 处（`输入回复内容...`、`工单已关闭，如有其他问题请发起新的工单！`、`确认关闭工单` 等）；`bun run i18n:sync` 后 `missingCount`/`extrasCount` 全 0；临时脚本用后即删。
- **验证**：`go build ./...` ✅；`go test ./model/ -run Ticket` ✅（新增 `model/ticket_test.go`：工单号格式、创建即分配工单号、三个 Tab 过滤 + 计数）；`bun run typecheck` ✅；`bunx oxlint`/`oxfmt`（改动文件）✅；CDP 真实浏览器走查：粘贴/选择文件上传 → 文本域插入 markdown → 发送 → 气泡内图片真实渲染（截图 `/tmp/pw/r11-our-markdown.png`）、关闭确认框（`/tmp/pw/r11-our-close-dialog.png`）、列表/创建弹窗（`/tmp/pw/r11-final-detail.png`、`/tmp/pw/r11-our-create2.png`）。
- **清理**：删除本机测试用附件回复与上传文件；关闭参考站上我创建的「UI 对比测试（可忽略）」工单。
- **遗留差异**（参考站有、我们暂无）：① 参考站有 `/api/ticket/ws` WebSocket 实时推送（新消息/工单状态/Tab 计数实时刷新），我们仍是查询刷新；② 客服端「快捷短语」与「AI 起草回复」；③ 参考站附件走 `/api/user/oss/url` 预签名直传对象存储，我们落本机磁盘（无平台 OSS 时的等价能力）。

### 2026-10-01（第十轮：个人中心 `/panel/profile` 1:1）
- **参考站采集**：`/tmp/pw/r10-ge-profile-*.png|txt`（5 个 Tab 全量截图 + 文案），并逐项测量 DOM 几何（Tab 列表 36px / 按钮 28px / 无边框 / 未选中字色 lab 7.78 纯黑 / 选中黑胶囊白字；头像 120px + 4px 白环；banner 96px）。
- **前端对齐**
  - Tab 胶囊：`TabsList h-9!`、`TabsTrigger h-7 border-0`、未选中 `text-foreground`、选中 `bg-foreground text-background` —— 与参考站实测一致（36px/28px/0px 边框）。
  - Tab 说明文案按参考站逐条替换：安全设置＝「管理访问令牌与账户安全，操作前请谨慎确认」（并删除页内重复的一行说明）、存储设置＝「配置 S3 兼容存储桶（Cloudflare R2、阿里云 OSS、腾讯云 COS、AWS S3、MinIO 等）…」。
  - 角色徽章：`ROLE_LABEL_KEYS[USER]` 由 `User`（用户）改为 `Common User`（普通用户），与参考站页头一致。
  - 订阅通知页：预警额度 chips 改为参考站样式（`h-6 rounded-lg px-2 text-xs`、`$0.1` 无空格），提示改为「当额度低于 0.12$ 时，将收到预警通知（最多 3 小时 1 封）」；`NOTIFICATION_LIMIT_DURATION_MINUTE` 默认值 10 → 180（仍可用环境变量覆盖，前端按分钟自动换算「x 小时 / x 分钟」）。
  - 安全设置页卡序改为 双重验证(2FA) / 系统令牌 / Passkey / 更改密码 / 删除账户 + 登录会话（本站独有的 Passkey、登录会话保留）。
- **存储设置「个人存储桶」（新增能力，非假数据）**
  - 依赖：`github.com/aws/aws-sdk-go-v2/service/s3 v1.79.0`（与既有 `aws-sdk-go-v2 v1.41.5` 同源，未升级 core/credentials，`go.mod` 仅 +6 行）。
  - 后端 `service/objstore`：S3 兼容客户端（Path-Style、静态凭证、20s 超时）；`Validate()` 校验 endpoint/bucket/region/AK/SK/公开域名；`Verify()` 向桶内试写 `.new-api-verify-*.txt` 再删除（凭证 + 权限 + 桶存在性）；`Put()`/`PublicURL()` 供后续落桶复用。
  - 接口：`GET /api/user/storage`（**永不返回 SecretKey**）、`POST /api/user/storage/verify`（校验通过才保存；SecretKey 留空＝沿用已存密钥）、`DELETE /api/user/storage`；配置存 `users.setting.user_storage`（`relaykit/dto.UserSetting` 新增 `UserStorage *UserStorageConfig`），带用户级限流。
  - 后端 i18n：`setting.storage_invalid / storage_verify_failed / storage_saved / storage_removed`（en / zh-CN / zh-TW）。
  - 前端 `features/profile/components/storage-bucket-card.tsx`：参考站同款卡片（Database 图标 + 标题 + 「保存时会向桶内试写一个测试文件验证凭证与权限」）、字段 `Endpoint（S3 API 地址）/ Bucket（桶名）/ Region（选填）/ AccessKey ID / SecretKey / 访问域名（选填）`、底部「桶需要完成两项准备」（CORS 动态填本站 origin、公开读取）、全宽黑色「验证并保存」，已配置时显示「留空则保留已保存的 SecretKey」与「解除存储桶绑定」。
  - 前端 i18n：新增 22 键 × 7 语言（`missingCount` 全 0）。
  - 真实验证：本地运行 S3 协议服务（gofakes3，`127.0.0.1:9100`），CDP 真实浏览器走完整链路 —— 填表 →「验证并保存」→ 后端 PutObject+DeleteObject → 写入 SQLite `users.setting` → 重新加载显示已配置（密钥打码）；把 Endpoint 改为不可达地址后 UI 显示真实报错（`write test object failed: … connection refused`）；「解除存储桶绑定」清空配置并回读为空。
  - 测试：`service/objstore/objstore_test.go` 表驱动（Validate 14 例 + PublicURL 3 例，含越权路径规范化）。
- **验证**：`go build ./...` ✅；`go test ./service/... ./controller/... ./model/...` ✅；`cd relaykit && GOWORK=off go build ./...` ✅；`bun run typecheck` ✅；`bunx vitest run src/features/profile src/features/security` 55 通过 / 3 既有失败（`security/__tests__/page.test.tsx`，与本轮无关）；`bunx oxfmt`、`bunx oxlint`（改动文件）✅；`bun run i18n:sync` 后 7 语言 `missingCount` 全 0；CDP 9223 对照组图 `/tmp/pw/r10d-our-*.png`。
- **仍待处理（遗留差异）**：① 参考站「API 与站内请求的图片、视频将保存到你的桶中长期留存」目前仅完成配置与连通性校验，媒体自动转存（`relay/image_handler` 响应、`service.TaskArtifactStore` 制品）未接入；② 2FA 卡片等少数文案用词与参考站不同（`双重验证` vs `两步验证`）；③ 本站独有卡片（Passkey、登录会话、记录 IP 开关、Discord/Telegram/LinuxDO 绑定）按既定策略保留。

### 2026-10-01（第九轮：邀请计划 1:1）
- **参考站实现反查**：从参考站前端 chunk（`/tmp/pw/ge-invite-src.js`，来源 `/_next/static/chunks/2g38tb-5pk4nv.js`）读取 `/panel/invite` 页组件 `C`（页头/统计卡/解锁 Alert/邀请链接/推广文案/奖励规则）、弹窗 `A`（转入余额 / 申请提现）与两张记录表 `$`/`L` 的完整实现，并按参考站 `panelInvite` 文案表（zh/en）逐条对齐。
- **后端（全部真实数据，非假数据）**
  - 新增 `model/withdrawal.go`：`withdrawals` 表（amount / amount_cny / quota_held / real_name / account / status），AutoMigrate 已接入；申请时在事务内预扣 `aff_quota`（`lockForUpdate` + 条件更新），审核拒绝时原额度返还，已拒绝的申请不可再次变更；状态 0 待审核 / 1 已提现 / 2 提现中 / 3 已拒绝。
  - 新增 `controller/invitation.go`：`GET /api/user/invite/status`（账户余额、邀请码、待使用/累计收益、奖励次数、资格校验、奖励配置、提现配置）、`GET /api/afflog/self`、`GET /api/afflog`（管理员）、`POST /api/withdrawal/self`、`GET /api/withdrawal/self`、`GET /api/withdrawal`（管理员）、`PUT /api/withdrawal`（管理员改状态，拒绝时返还额度）。
  - 充值返佣：`model.ApplyAffiliateTopupReward` 在 `creditTopUpQuota` 成功路径同事务发放（被邀请人第 N 次成功充值内的返佣），`AffiliateReward.Source='topup'` 首次真正写入；返佣比例/次数由后台配置。
  - 新增后台选项：`AffiliateTopupRewardPercent`、`AffiliateTopupRewardTimes`、`WithdrawalEnabled`、`WithdrawalMinQuota`、`WithdrawalRatio`（`common/constants.go`、`model/option.go`），系统设置 → 额度设置新增「充值返佣比例/返佣充值次数/最低提现额度/提现汇率/启用邀请收益提现」5 项。
  - 测试：`model/affiliate_test.go`（返佣次数上限、提现预扣、驳回返还、重复变更拦截）3 例；`go test ./model/... ./controller/...` 全绿。
- **前端**：`features/invitation` 重写为参考站结构 —— 标题行（Gift 图标 + 邀请奖励 + 右侧「提取到余额」/「申请提现」）、三统计卡（bg-pink-500/emerald-500/amber-500 圆形图标）、Card 内解锁 Alert（`LockKeyhole` + 勾选行「您需完成至少一次有效充值」「累计实际使用额度：x / y」，额度不足时整块模糊）、行内邀请链接行 + CopyBtn、左「推广文案」（4 条参考站原文随机换 + 刷新/复制）右「奖励规则」（按后台真实配置动态编号，未配置的规则不显示）、底部 PillTabs 卡片（奖励记录 / 提现记录）。
  - 记录表按参考站列：奖励记录 = 创建时间 |（管理端：邀请人/被邀请人）| 被邀者充值 | 奖励额度(Badge outline) | 状态(已奖励/无奖励) | 详情；提现记录 = 申请时间 |（管理端：用户 ID）| 金额 | 提现金额(¥ Badge) |（管理端：真实姓名/支付宝账户可复制）| 状态 |（管理端操作下拉：标记已提现/提现中/待审核/拒绝返还额度/复制提现账户）。
  - 弹窗：`InviteActionDialog`（`sm:max-w-xl`）复刻参考站 —— 标题=当前动作、正文居中大号「可提取收益 $x」、转入表单（zod：≥$1 且 ≤可用 + 「最低转入额度 $1」）、提现表单（zod：≥最低提现额度且 ≤可用 + 真实姓名 + 支付宝账户 + 红色「提现金额 ¥x」实时换算）、底部「重置」+ 提交。
- **i18n**：新增 64 键 × 7 语言（含参考站 4 条推广文案原文、弹窗/记录表/后台设置文案），并同步参考站中文措辞（待使用收益 / 提取到余额 / 完成条件后解锁邀请功能 等）；`missingCount` 全 0。
- **验证**：`bun run typecheck` ✅、`oxlint`（改动文件）✅、`go build ./...` ✅、`go test ./model/... ./controller/...` ✅、`bunx vitest run`（含新增 `features/invitation/__tests__/affiliate-records.test.tsx` 2 例）✅；真实浏览器 CDP 对照参考站截图（默认态 / 解锁 Alert 态 / 提现弹窗 / 转出弹窗 / 提现记录表），并用真实接口跑通「申请提现 $20 → 预扣 $10 → 提现记录显示 ¥32.00 待审核」后清理测试数据、恢复全部临时改动。
- **遗留差异（需站点配置，非代码缺失）**：提现相关 UI（按钮/Tab/弹窗）仅在后台开启「邀请收益提现」后显示；「充值返佣比例/次数」「被邀请人注册奖励」默认 0，未配置时不展示对应奖励规则（避免展示未生效的规则）；金额沿用本项目 `@/lib/format` / `@/lib/currency` 输出（`$1` 而非参考站 `$1.00` 的尾零写法）。

### 2026-10-01（第八轮：绘图日志 1:1）
- **参考站实现反查**：从参考站前端 chunk（`/_next/static/chunks/0n1figlusjvp7.js`）读取 `panel/midjourney` 页的真实列定义与单元格实现，并解析 RSC payload 得到 `panelMidjourney` / `data` 两份文案表（zh+en，存 `/tmp/pw/ge-messages.json`，后续轮次可复用）。确认「模式」列取值 = 任务上的 `mode`（`Fast`/`Relax`/`Turbo`，图标 Zap/Coffee/Rocket）。
- **后端新增 `mode` 字段**（真实数据，非假数据）：`model.Midjourney` 增加 `mode varchar(20)`（AutoMigrate 已在本机 SQLite 验证加列成功）；`dto.MidjourneyRequest`/`MidjourneyDto` 同步；`service.ResolveMidjourneyMode()` 依据客户端显式 `mode` → prompt 中的 `--relax/--turbo/--fast` → 默认 `Fast`（Midjourney 默认速度模式）推导；提交流程写入、轮询/通知在上游返回 `mode` 时更新、`coverMidjourneyTaskDto` 回传。测试：`service/midjourney_test.go` 表驱动 7 例。
- **前端列对齐参考站**：顺序与单元格改为 提交时间 | 类型 | 任务 ID | 模式 | 进度 | 耗时 | 提示词 | 消耗 | 状态（管理端另有渠道列，非管理员隐藏）：
  - 类型：`Badge variant=outline` + 参考站同款标签（Imagine/Edits/Variation/High Variation/Low Variation/Modal 等，i18n 已按参考站文案补齐）
  - 模式：outline 徽章 + `Zap`/`Coffee`/`Rocket`（`fill-primary`）+ 粗体文本，空值显示 `-`
  - 进度：进度条（`w-16`）+ 百分比粗体文本；耗时：`x.xs`，>30s 琥珀、>60s 红色，缺失 `-`
  - 提示词：单行截断 + `title` 悬浮（与参考站一致，不再弹对话框）；消耗：未完成显示「待结算」
- **行点击 → 任务详情弹窗**（参考站核心交互，之前缺失）：新增 `components/dialogs/drawing-task-dialog.tsx` —— 标题为 类型徽章 + 状态徽章 + 模式；描述为可复制的 任务 ID（无 ID 时显示提交时间）；正文为图片网格（复制/新窗口打开、加载失败占位）、提示词 / 英文提示词（`pre` + 复制按钮）、失败原因（红色）/提交时间/开始时间/完成时间。
- **默认列**：图片/失败原因/提交结果三列（本项目额外信息）默认隐藏，保持与参考站默认视图一致，可在「显示列」中开启。
- **i18n**：新增 7 条键 × 7 语言（Imagine / Edits / Variation / High Variation / Low Variation / Modal / Pending settlement），`bun run i18n:sync` 后 `missingCount` 全 0；临时脚本用后即删。
- **验证**：`bun run typecheck` ✅；`bunx oxlint`/`oxfmt` ✅（改动文件）；`bunx vitest run` = 2081 通过 / 3 失败（失败仍为既有 `features/security/__tests__/page.test.tsx`，与本轮无关）；新增回归测试 `components/__tests__/drawing-log-mode.test.tsx` 3 例（模式徽章、空值 `-`、默认隐藏列）。
- **CDP 实测**：临时写入 3 条本地绘图日志（已完成/失败/进行中）验证后已删除——列渲染、进度条、耗时着色、待结算、行点击弹窗（含图片网格与失败原因）、`pageerror` 0；截图 `/tmp/pw/r11-drawing-*.png`。
- **遗留差异**（~~三项均已于第二十七轮解决~~ → 已全部对齐）：① `×N` 制品数量 —— 改为参考站算法 `parseMjUrls(image_urls, image_url) + parseMjUrls(video_urls, video_url)`（第二十七轮实现）；② 状态标签文案 —— 改为 Completed/Failed/In Progress/Submitted/Not Started/Awaiting Action/Unknown（第二十七轮实现）；③ 任务 ID 单元格 —— 由带边框徽章改为纯等宽文本 + 复制图标（第二十七轮实现）。

### 2026-10-01（第七轮：帮助中心 / 教程 / 文档 / 博客）
- **参考站内容采集（真实数据，无假数据）**：用 CDP 真实浏览器抓取 `/help`、`/tutorials`、`/tutorials/{coding,app,openclaw}`、22 篇教程正文、`/doc` 与 3 篇文档正文、`/blog` 17 篇文章（含封面/摘要）与 9 条 FAQ（取自页面 `FAQPage` JSON-LD）。
- **内容落库方式**：抓取结果转为静态内容文件 `web/src/features/help/content/{tutorials,docs,blog,faqs}.json`（正文为清洗后的 HTML），前端按需渲染；正文中的品牌名/接口地址在生成时替换为 `{{siteName}}`/`{{apiBase}}`/`{{siteUrl}}` 占位符，渲染时用站点真实名称与 API 地址填充（`/panel/token` 链接改写为本项目 `/keys`）。
- **新增页面（均为公开页，受顶栏开关控制，默认开启）**：
  - `/help`：点阵 Hero + 搜索框（可实时过滤教程/文档/FAQ）+ 教程 3 卡 + 文档 4 卡 + FAQ 手风琴（Markdown 渲染，含表格）。
  - `/tutorials`、`/tutorials/$category`：分类卡与课程卡（序号圆点 + 标题 + 描述 + 播放图标）。
  - `/tutorials/$category/$slug`：面包屑 + 左侧课程目录（当前课高亮）+ 正文（标题锚点、图片圆角描边）+ 「上一课/下一课」卡 + 右侧「本页目录」吸顶。
  - `/doc`、`/doc/$slug`：文档索引（新手指南分组 + 卡片栅格）与文档详情（「更新于 x 个月前」）。
  - `/blog`、`/blog/$slug`、`/blog/category/$category`：轮播大图（自动播放点 + 左右按钮）+ 精选/推荐侧栏 + 分类胶囊 + 卡片栅格；详情页为居中文章（作者/时间 meta + 正文）。
- **顶栏**：新增「博客」「帮助中心」入口（顺序与参考站一致：控制台 / 模型广场 / 创作 / 博客 / 帮助中心 / …）；`HeaderNavModules` 新增 `blog`/`help` 开关（前端默认值 + 系统设置 → 顶栏导航表单 + 校验 schema）；`Docs` 未配置外链时的回退由 `/docs`（404）改为 `/doc`。
- **样式**：项目未安装 `@tailwindcss/typography`，`prose` 类此前无实际样式；本轮为帮助内容新增作用域样式表 `features/help/styles/article-content.css`（标题/段落/列表/引用/代码块/表格/图片/分隔线，使用主题 CSS 变量），避免影响其他页面。
- **防盗链**：参考站封面 CDN 对非同源 Referer 返回 403，图片统一加 `referrerpolicy="no-referrer"`（正文图片在 `prepareContentHtml` 中批量注入）。
- **i18n**：新增 37 条键 × 7 语言（帮助中心/教程/文档/博客/FAQ/分类名等），`missingCount` 全 0；临时脚本用后即删。
- **测试**：新增 `features/help/__tests__/content.test.ts` 13 例（占位符替换、标题锚点与图片 referrer、课程相邻导航、博客分类过滤、封面尺寸改写、搜索匹配）；`bun run typecheck` ✅、`bunx oxlint`/`oxfmt` ✅（改动文件）。
- **已知限制**：内容为静态文件（不支持后台编辑，参考站内容为中文单语）；封面/正文图片直连参考站 CDN；文章「相对时间」沿用抓取时的文案（如「3个月前」），不随真实时间刷新。

### 2026-10-01（第六轮：模型广场列表 + 模型详情）
- **后端新增公开模型目录（models.dev 兼容）**：新增 `pkg/modelcatalog`，启动后异步拉取（默认 `https://models.dev/api.json`，可用 `MODEL_CATALOG_URL` 覆盖，`MODEL_CATALOG_DISABLED=true` 关闭），按 `id`/模型名建索引并根据供应商优先取数，6 小时刷新、失败保留上次快照、响应体 64MB 上限；`model/pricing.go` 的 `Pricing` 新增 `context_length`/`max_output_tokens`/`release_date`/`knowledge_cutoff`/`input_modalities`/`output_modalities`/`capabilities` 字段并在构建价格表时补全，目录缺失时用标签（如 `1M`、`128K`）兜底解析上下文长度。新增 `pkg/modelcatalog` 单测与 `TestParseContextLengthTag`。
- **模型广场卡片**：底部左起改为 `NEW`（`release_date` 8 周内）+ 短计费徽章（`按量`/`按次`，按参考站去掉「计费」后缀）+ `联网`（web search 能力，参考站放在计费徽章旁）；右侧为能力徽章（最多 2 个 + `+N`）与 `secondary` 样式的上下文长度徽章（1050000 → `1M`，991000 → `991K`）；描述列沿用参考站 `indent-6 line-clamp-2`。
- **能力徽章口径对齐参考站**：`文本对话 / 图像分析 / 文件分析 / 深度思考 / 图片生成 / 视频生成 / 文字转语音 / 异步任务` 由 `capabilities` + `input/output_modalities` + 标签推导（参考站同款顺序，联网单列）。
- **模型详情页重排为参考站结构**（`model-details.tsx`）：
  - 面包屑 `mb-10 text-sm`（返回 › 供应商 › 模型名，chevron 分隔）；头部图标容器 `size-15 rounded-2xl border shadow-lg`、标题 `text-2xl font-bold`、标题下为能力徽章（不再是原始标签）；右上「在线体验 / 复制链接」改为 `h-9 rounded-full border-border/60` 胶囊按钮。
  - 新增 5 项统计卡（参考站排版）：上下文长度（brain 图标）/ 最大输出 / 发布日期 / 知识截止 / 模型倍率 · 补全倍率，数字项 `text-lg`、日期项 `text-sm`，日期按语言格式化（`2026年9月10日`）。
  - 页面容器改为 `max-w-6xl px-4 py-8 lg:px-10`；卡片统一 `rounded-xl border-border/50` + 表头区 `px-6 py-4 border-b`。
  - 「可用分组」改为参考站扁平表格：令牌分组 / 描述 / 分组倍率 / 输入价格 / 输出价格 / 缓存读取 / 缓存写入（动态计费模型取首档价格，如 `$3/M`、`$15/M`），价格按分组倍率换算。
  - 「阶梯计费」独立成卡（标题 + 副标题，`compact` 价格明细）；「支持端点」改为 `secondary` 徽章 + 等宽路径 ghost 复制按钮 + 右侧 `POST` 徽章。
  - 新增「可用率监控」卡（参考站布局）：标题 + 副标题 + 分组图例（圆点/分组名/百分比）+ 多分组 24 小时折线（`GroupUptimeTrendChart`，数据取 `/api/perf-metrics`），无数据显示占位。
  - 移除了参考站没有的区块：基础价格卡、模型元信息（供应商/能力/模态/标签）区、API 调用示例区与性能图表区（组件文件保留，页面不再渲染）。
- **i18n**：新增 20 条键（7 语言，`missingCount` 全 0），含 `Per-token`/`Per-call`/`File analysis`/`Video generation`/`Text to speech`/`Async task`/`Context length`/`Release date`/`Available groups`/`Uptime monitoring`/`Effective condition`/`Cache read` 及两张卡的副标题；`NEW`、`Web search`、`Description` 的中文改为参考站用字（`NEW`/`联网`/`描述`）。
- **验证**：`bun run typecheck` ✅；`bunx vitest run` 2065 通过 / 3 既有失败（`security/__tests__/page.test.tsx`）；`bunx vitest run src/features/pricing` 253/253 ✅；`bunx oxlint`、`bunx oxfmt --check` 均通过；`go build ./...` ✅、`go test ./pkg/modelcatalog ./model ./controller` ✅；真实浏览器（CDP 9223）复核 `/pricing`、`/pricing/deepseek-flash` 与参考站逐屏比对。
- **仍待处理**：详情页「阶梯计费」表头为 `档位/输入/输出/缓存读取/缓存写入(1h)`（参考站为 `生效条件/输入价格/输出价格/缓存读取/缓存写入`，价格带 `/M`）、分组描述依赖后台「分组说明」配置（未配置显示 `-`）、参考站的 `弃用/别名/逆向` 徽章与「阶梯计费」的分组下拉暂未实现。

### 2026-10-01（第五轮：登录 / 注册 / 找回密码 1:1）
- **认证页骨架重做**（`features/auth/auth-layout.tsx`）：改为参考站结构 —— 顶部固定 64px 无边框页头（左：`size-10` 站点 Logo；右：主题切换按钮），`main` 为 `my-5 md:mb-12` + 垂直居中的 `max-w-lg`（512px）卡片。实测几何：`main` 与参考站完全一致（`y=20 h=832`），卡片宽 512、内边距 40px、输入框高 36px、徽章 12px/字距 3.36px，均与参考站一致。
- **登录页**：徽章「登录账户」+ 标题「访问您的账户」+ 副标题；社交登录按钮改为参考站样式（两列栅格、`h-9`、`rounded-full`、`border-border/60 bg-card/70`、hover 上浮 + 主色）；「或」分隔线改为 `h-px bg-border/70` + `tracking-[0.34em]`；字段改为「邮箱地址 / 登陆密码」（文案与参考站逐字一致）；页脚改为左右分布的虚线下划线链接。
- **注册页**：改为参考站字段集 —— 邮箱地址 + 登陆密码 + 「我同意 服务条款 和 隐私政策」勾选行 + 创建账户按钮（去掉用户名、确认密码字段，与参考站一致）；页脚居中「已有账户了吗？登录账户」。勾选未选时不再置灰提交按钮（与参考站一致），改为提交时提示。
- **找回密码页**：由无卡片布局改为与参考站一致的同款卡片（徽章「重置密码」/ 标题「找回密码」/ 副标题 / 邮箱地址 / 发送重置邮件 / 左右分布页脚）。
- **`LegalConsent` 组件改版**：由方框卡片改为参考站的行内 `<label>` + 复选框 + 「我同意《服务条款》和《隐私政策》」，登录页不再展示（参考站登录页无条款位）。
- **登录页移除 `TermsFooter`**（参考站无此段文字）；注册页条款由勾选行承载。
- **后端：支持仅邮箱注册**（`controller/user.go`、`model/user.go`）
  - 未传 `username` 时按邮箱本地部分生成用户名（`SuggestUsernameFromEmail`：小写、仅保留 `a-z0-9._-`、去首尾标点、截断 20 字符、空则回退 `user`）；重名时追加序号（`EnsureUniqueUsername`，最多 100 次）。
  - 邮箱冲突返回既有 `邮箱已被占用`；注册后**始终保存邮箱**（此前仅在开启邮箱验证时才保存，导致邮箱登录/找回密码不可用）。
  - 新增单测 `TestSuggestUsernameFromEmail`、`TestEnsureUniqueUsernameAppendsSuffix`（`model/user_authentication_test.go`）。
- **前端注册请求**：`registerFormSchema` 改为 `email`（必填 + 格式校验）+ `password`，`RegisterPayload.username` 改为可选；提交只发邮箱，由后端推导用户名。
- **i18n**：新增/更新 16 条键 × 7 语言（`Go home`、`I agree to the`、`Terms of Service`、`Recover password`、`Please enter your bound email address`、`Remembered your password?`、`Back to sign in`、`Please enter a password, 8-128 characters` 等），`missingCount` 全 0；zh 文案按参考站逐字对齐（含参考站自身的「登陆密码」「返回登陆」写法）。
- **验证**：`bun run typecheck` ✅、`go build ./...` ✅、`go test ./model/... ./controller/...` 全绿 ✅、真实浏览器 CDP 走通「邮箱注册 → 提示账户已创建 → 邮箱登录 → 进入控制台」全流程 ✅、移动端 390px 无横向溢出 ✅、`bunx vitest run` 2065 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 遗留）。
- **已知差异（需站点配置，非代码缺失）**
  - 社交登录行（GitHub / Google）只在系统设置里配置了对应 OAuth 后才显示；参考站的 Google 按钮对应本项目的「自定义 OAuth 提供方」，自定义提供方目前不显示图标。
  - 「使用 Passkey 登录」按钮仅在开启 Passkey 登录后显示；`email_verification` 开启时会多出邮箱验证码行（参考站默认关闭验证）。
  - 密码长度文案用本项目真实策略「8-128 位」，参考站文案为「8-20 位」。
  - 开发库未写入任何伪造的 OAuth 凭据；社交行的样式核对是通过在浏览器内临时 mock `/api/status` 完成的。

### 2026-10-01（第四轮：创作下拉 + Studio 四页）
- **顶栏「创作」下拉（hover 菜单）**：`use-top-nav-links.ts` 新增 `studio` 模块与 4 个子项（发现作品 / 聊天对话 / 图片生成 / 视频生成，含描述、图标、渐变底色，与参考站一致）；新增共享组件 `components/layout/components/top-nav-menu.tsx`（基于项目已有 `components/ui/navigation-menu.tsx`），公共顶栏 `public-header.tsx` 与控制台 `top-nav.tsx` 共用；移动端菜单按参考站渲染「创作」分组 + 渐变图标条目；控制台/公共页均生效。
- **顶栏模块开关**：`HeaderNavModules.studio` 已加入前端默认值（`lib/nav-modules.ts`、系统设置 → 顶栏导航表单），后端 `middleware.HeaderNavModuleAuth("studio")` 保护新接口。
- **Studio 页面骨架**：新增 `features/studio/*` 与路由 `/studio`、`/studio/chat`、`/studio/image`、`/studio/video`；顶栏在 studio 页替换为参考站同款胶囊 Tab（发现 / 聊天 / 生图 / 视频，`md:` 以上显示，移动端仅保留右侧操作区）；整页 `h-dvh` 布局 + 内部滚动容器（与参考站一致）。
- **发现作品（画廊）**：后端新增 `model/studio.go` + `controller/studio.go`，公开接口 `GET /api/studio/share?page=1&page_size=24`（可按 `kind=image|video` 过滤），数据取自 Midjourney 作品表；前端瀑布流卡片（图片/视频、hover 显示提示词与「模型 · 相对时间」、悬浮「一键同款」）、点击查看大图弹窗（上一件/下一件）、「加载更多」分页、空态。
- **聊天对话**：`features/playground` 解耦路由（改为 `Playground(initialModel)` 并可注入空态），`/studio/chat` 复用其聊天/输入/参数能力；左侧栏「新建聊天」「暂无聊天」与隐私提示复刻参考站；问候语按参考站时段（凌晨/早上/中午/下午/晚上）切换。
- **图片生成**：问候语、提示词框、工具栏选择器（Midjourney / MJ V7 / 1:1 / 默认-KEY）、5 个提示词 chip、圆形发送按钮；提交调用 `/mj/submit/imagine`（自动追加 `--ar`、`--v`）并轮询 `/mj/task/:id/fetch` 展示结果。
- **视频生成**：同款布局（模型 / 文生视频 / 9:16 / 默认-KEY + 5 个 chip），模型取自价格目录中 `openai-video` 模型，提交 `/v1/video/generations` 并轮询任务状态。
- **i18n**：新增 51 条键（7 语言，`missingCount` 全 0），含 `Studio`/`Discover`/`studio.tab.*`/`studio.greeting.*`/提示词 chip 等；脚本 + `bun run i18n:sync` 写入后已删除临时脚本。
- **验证**：`bun run typecheck` ✅、`go build ./...` ✅、`bunx vitest run src/features/playground src/lib` 85/85 ✅、真实浏览器（CDP）截图复核 `/studio`、`/studio/chat`、`/studio/image`、`/studio/video`、移动端 390px、公共/控制台顶栏下拉 ✅。
- **待办**：画廊收藏（需用户存储）、聊天「备份到 OSS」、图片/视频生成的渠道联调（当前测试库无渠道，提交会返回真实的后端错误）。


### 2026-10-01（第三轮：首页 1:1 + 公共顶栏布局）
- **公共顶栏改为参考站结构**：`div.sticky top-0 z-50 > header.relative w-full bg-background/50 backdrop-blur-2xl`（原为 `fixed` 覆盖层 + `pointer-events` 技巧）。顶栏现在**占据文档流**（64px）并吸顶，与参考站一致；`PublicLayout` 容器 main 去掉 `pt-20` 补偿，`/pricing`、`/monitoring`、`/rankings` 去掉 `pt-16/sm:pt-20` 补偿（模型广场的 sticky 筛选条现在正好贴顶栏下沿，与参考站 `sticky top-[calc(4rem+var(--banner-h,0px))]` 一致）。
- **首页 Hero 重写**：新模型轮播 pill（`New Model` 徽标 + 模型名上滑切换，点击进模型详情）+ 两行标题 + 副标题（模型数 `650+` 位置加粗主色，取真实 `home_stats.model_count`）+ `Get Started`/`Help Docs`（h-14 圆角）按钮；栅格背景加 `isolate`，避免被 layout 背景遮挡。
- **首页 Features 重写**：徽标 `WORRY-FREE` + `完善的服务体系` + 6 卡（圆形描边图标 + 3 列栅格 + hover 渐变/缩放），文案与参考站逐字一致（模型数用真实值插值）。
- **首页 HowItWorks 重写**：徽标 `QUICK START` + `几行代码，快速接入` + 左卡片（3 步骤圆角序号 + 编程/应用教程入口）/右代码面板（Chat/Responses/Claude/Gemini 四 Tab、语法高亮、复制按钮、REQUEST/RESPONSE、底部 `POST /v1/chat/completions` + `200 OK`）。
- **首页 UseCases 重写**：徽标 `VERSATILE SCENARIOS` + `一个平台，多种用途` + 5 卡（首卡跨 2 列）。
- **首页统计与页脚**：统计改为参考站的整块圆角卡（3 列，`text-sm uppercase tracking-[0.3em]` 标签 + `text-3xl` 数值，保留真实数据与滚动计数动画）；页脚改为参考站栅格（品牌占 2 列 + 链接列 `sm:grid-cols-4`，底部虚线分隔的版权/归属行），链接列不再受「演示站点」开关限制。
- **i18n**：新增/更新首页与页脚相关键共 ~150 条（7 语言），全部经 `add-missing-keys.mjs` + `bun run i18n:sync` 写入，missingCount 全 0。
- **测试**：`src/features/home` 9 例全绿（更新为新文案/结构断言）；全量 `bunx vitest run` 2064 通过 / 3 失败（均为既有 `security/__tests__/page.test.tsx` 遗留）。
- **待办（已在第七轮完成）**：`/tutorials/coding`、`/tutorials/app` 教程页已实现；首页 `Help Docs` 在未配置 `docs_link` 时仍回退到 `/pricing`（参考站为外链 Apifox，保持现状）。

### 2026-10-01（第二轮）
- **设计系统尺寸整体对齐参考站**（全局）：`Button/Input/SelectTrigger` 尺寸 +4px、页面标题 24px（见第 2 节）。

- **使用日志页 1:1**：
  - 筛选条改为参考站结构：左侧 `flex-wrap`（开始/结束/令牌名称/模型/查询），右侧「全部日志 + 图标组」，整条 `sticky` 在顶栏下方。
  - 新增「导出」按钮：后端新增 `GET /api/log/export`（管理员）与 `GET /api/log/self/export`（用户）CSV 导出接口（`controller/log.go`，复用现有筛选查询，最多 5 万行），无记录时返回 `code=no_records`，前端提示「所选时间范围内没有消费记录」。已用真实浏览器点击验证：下载 `logs-*.csv` 成功。
  - 「显示列」面板图标改为漏斗、标题改为「显示列」（`DataTableViewOptions`，全站生效）。
  - 详情列表头置空 + 不可隐藏（参考站该列为空表头窄列）。
  - 区间消耗卡新增「查看」按钮：默认显示 `-`，点击后拉取并变为「刷新」（与参考站一致）。
  - 分组筛选移入「更多筛选」面板（`group-filter.test.tsx` 同步更新：桌面端先展开更多筛选，`h-9` 断言）。
- **任务/绘图日志页**：新增「全部状态」下拉（未启动/已提交/队列中/执行中/已完成/已失败/未知），任务 ID 占位符改为「任务 ID」，任务日志详情列空表头。
- **订单/发票**：开票记录第 2 列改为空表头窄图标列（41px，悬浮显示项目名称），与参考站列结构一致。
- **i18n**：新增 `Export` / `Export failed` / `No consumption records in the selected time range` / `Show Columns` / `Task Status`，并把 `All Status` 中文改为「全部状态」（脚本 + `i18n:sync`，missingCount 全 0）。
- **测试**：`SectionPageLayout` 在无 `SidebarProvider` 时不再渲染侧栏触发器（新增 `useOptionalSidebar`），修复 security / request-policies / passkey 三个测试文件共 20 例既有失败；`usage-logs`（含 audit viewer 31 例）与 group-filter 全绿。
  - 仍失败（既有、与本轮无关）：`src/features/security/__tests__/page.test.tsx` 3 例（个人中心/安全页文案与路由桩，属个人中心页复刻遗留）。

### 2026-10-01
- **订单/发票页 1:1 复刻完成（用户侧前后端）**：
  - 后端新增 `model/invoice.go`（`invoices` / `invoice_orders` 两张表，AutoMigrate 已接入）、`controller/invoice.go`，路由 `GET/POST/DELETE /api/invoice`、`GET /api/invoice/eligible`、`GET /api/invoice/admin`、`POST /api/invoice/admin/:id/review`；订单列表接口附带 `invoice_status`。
  - 规则与参考站一致：未开票金额需达到起开金额（`payment_setting.invoice_min_amount`，默认 100）、不允许存在未完成（审核中/已拒绝）申请、被拒绝需先删除才能重新申请；删除已开票申请被拒绝。
  - 前端新增 `features/orders/{api,types,components/invoice-apply-dialog}`，`index.tsx` 重写为双 Tab + 勾选 + 全部开票 + 开票记录表 + 删除确认。
  - 端到端验证（SQLite，真实接口）：提交 → 订单显示"审核中" → 再次打开弹窗出现红框条件提示 → 开票记录出现该申请 → 删除后订单恢复可开票；
  - 注意：`SectionPageLayout` 只渲染已知插槽子节点，弹窗必须放在 `SectionPageLayout.Content` 内。
- API 令牌表头去掉货币单位（`已用 / 剩余`），过期时间显示 `永不过期`；支付方式补充 `Epay/Creem/Waffo Pancake` 文案。
- 建立本文档。
- 修复误删的 `web/src/features/keys/components/api-keys-columns.tsx`（按会话日志完整重建），`bunx vitest run src/features/keys` 8 文件 / 67 用例全绿。
- 核对并修复侧边栏折叠几何（与参考站逐项一致）。
- 修复 `web/src/hooks/__tests__/sidebar-config.test.tsx`（菜单重构后 13/13 通过）。
- 采集参考站「订单/发票」页结构：双 Tab、提示"可勾选指定订单申请开票！"、"全部开票"按钮、列 `商户订单编号/支付方式/支付金额/充值额度/创建时间/开票状态/状态(固定右侧)`；开票记录列 `发票类型/（图标）/发票金额/抬头类型/发票抬头/申请状态/申请时间/操作(下载)`，提示"已开发票会发至您的账户邮箱，或点击操作栏下载"；申请开票弹窗字段：红框提示(满 100 元 + 无未完成申请)、未开票金额、发票类型(增值税普通发票/增值税专用发票)、抬头类型(企业/个人·境外企业)、发票抬头*、项目名称*、纳税人识别号*、发票备注(选填)、底部提示 + 重置/提交申请。
