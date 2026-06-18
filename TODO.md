# codex-reset-monitor -> TanStack Start 1:1 重写计划

## 目标

将 `/Users/wankong/Code/Git/codex-reset-monitor` 的现有 Next.js 16 App Router 应用，按当前项目 `/Users/wankong/Code/Git/codex-reset` 的 TanStack Start 技术栈重写，并保持用户可见行为、数据记录、订阅流程、邮件通知和 cron API 语义 1:1 对齐。

## 当前事实

- 目标项目技术栈：TanStack Start + React 19 + TanStack Router/Query + Drizzle ORM + SQLite + shadcn/ui + Oxfmt/Oxlint。
- 源项目技术栈：Next.js 16 + next-intl + Drizzle SQLite + Resend + emailmd + pino + shadcn/ui。
- 源项目核心功能：
  - 公开首页：展示 Codex reset monitor hero、订阅表单、订阅人数、最近 reset、最近 3 条 reset、最近 30 条监测历史。
  - 双语：`zh` / `en`，URL 形态为 `/{locale}`，默认 `zh`。
  - 订阅：邮箱提交、去重、退订后重新激活、记录订阅 locale。
  - 检测任务：`POST /api/jobs/check-usage`，用 `CRON_SECRET` 鉴权，拉取 ChatGPT usage 接口并记录快照。
  - reset 判定：`secondary_window.reset_at` 向后推进超过 1 小时，且小于正常 secondary window 周期时，视为提前 reset。
  - 邮件：reset 时向 active subscribers 发送本地化 Resend 邮件，记录 sent / failed / skipped delivery。
  - 退订：`GET /api/unsubscribe?token=...&lang=...`，更新订阅状态后跳转到 `/{locale}/unsubscribe?ok=true` 或无 `ok`。

## 约束

- 以目标项目规则为准：TanStack Start、SQLite、shadcn CLI、lucide-react 图标、`pnpm lint` 验证。
- 不保留 Next.js 专用代码：移除 `"use server"` / `"use client"` 心智模型、`next/navigation`、`next-intl` routing、`next/cache`、`server-only`。
- TanStack loader 不直接访问数据库或 Node API；数据读取通过 `createServerFn`，并优先封装为 TanStack Query `queryOptions`。
- server-only 代码只放在 `createServerFn` handler 内部或 `*.server.ts` 文件中。
- 数据库 schema 使用 `sqlite-core`，纳入目标项目 `src/lib/db/schema/index.ts` 的统一导出。
- UI 组件缺失时用 `pnpm ui add <component>` 添加，不手写新的 shadcn primitive。
- 数据库运行方式与源项目一致：SQLite + better-sqlite3，默认文件为 `data/codex-reset-record.sqlite`。

## 推荐方案

在现有 TanStack Start 项目上做增量迁移，而不是另起新项目。

理由：

- 目标项目已经有 TanStack Start、root route、QueryClient、Drizzle、theme provider、路径别名和 lint 工作流。
- 源项目没有用户登录需求，因此移除认证 scaffold，避免保留无用依赖和数据库表。
- 迁移面主要集中在公开路由、server functions、server routes、业务 schema、邮件和 i18n，适合在当前架构内逐步替换默认 scaffold。

不采用的方案：

- 直接把源项目复制进来再删除 Next.js。该方案会把 Next middleware、next-intl、SQLite、`server-only` 和 Server Action 习惯带进目标项目，风险更高。

## 文件映射

| 源项目                                     | 目标项目                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `src/app/[locale]/layout.tsx`              | `src/routes/$locale/route.tsx` + `src/routes/__root.tsx`                      |
| `src/app/[locale]/page.tsx`                | `src/routes/$locale/index.tsx`                                                |
| `src/app/[locale]/actions.ts`              | `src/lib/subscribers.functions.ts`                                            |
| `src/app/[locale]/unsubscribe/page.tsx`    | `src/routes/$locale/unsubscribe.tsx`                                          |
| `src/app/api/jobs/check-usage/route.ts`    | `src/routes/api/jobs/check-usage.ts`                                          |
| `src/app/api/unsubscribe/route.ts`         | `src/routes/api/unsubscribe.ts`                                               |
| `src/proxy.ts`                             | 不迁移；由 TanStack route 参数与重定向处理                                    |
| `src/i18n/**`                              | `src/lib/i18n/**`                                                             |
| `src/lib/db/schema.ts`                     | `src/lib/db/schema/monitor.schema.ts` + `schema/index.ts` 导出                |
| `src/lib/app-data.ts`                      | `src/lib/app-data.queries.ts` + `src/lib/app-data.functions.ts`               |
| `src/lib/jobs/check-usage.ts`              | `src/lib/jobs/check-usage.server.ts`                                          |
| `src/lib/usage/**`                         | `src/lib/usage/*.server.ts` 或可共享 schema 文件                              |
| `src/lib/email/**`                         | `src/lib/email/*.server.ts`                                                   |
| `src/components/subscribe-form.tsx`        | `src/components/subscribe-form.tsx`，改用 `useServerFn` 或受控 `fetcher` 状态 |
| `src/components/lang-toggle.tsx`           | `src/components/lang-toggle.tsx`，改用 TanStack Router `Link` / `useNavigate` |
| `src/components/theme-toggle.tsx`          | 复用目标项目现有实现，必要时调整文案与样式                                    |
| `src/components/ui/card.tsx` / `table.tsx` | 通过 `pnpm ui add card table` 添加                                            |

## 实施计划

### 阶段 1：依赖、配置与环境变量

- [x] 对比依赖，加入业务必需包：`resend`、`emailmd`、`pino`、`canvas-confetti`、`@types/canvas-confetti`。
- [x] 不加入 Next 专属包：`next`、`next-intl`、`next-themes`、`geist`、`hono`。
- [x] 决定是否保留源项目的 `@remixicon/react` 图标；默认不保留，改为 `lucide-react`。
- [x] 在 `src/env/server.ts` 增加并校验：
  - [x] `CRON_SECRET`
  - [x] `CHATGPT_USAGE_AUTHORIZATION`
  - [x] `CHATGPT_USAGE_ENDPOINT`，默认 `https://chatgpt.com`
  - [x] `RESEND_API_KEY`，可选；缺失时跳过发送并记录 skipped
  - [x] `EMAIL_FROM`，可选；缺失时跳过发送并记录 skipped
  - [x] `LOG_LEVEL`，默认 `info`
  - [x] `LOG_DIR`，默认 `logs`
- [x] 复用目标项目已有 `VITE_BASE_URL` 作为公开 base URL，不再新增 `APP_BASE_URL`，并同步 `.env.example`。
- [x] 用 `pnpm ui add card table` 补齐 UI primitive。

### 阶段 2：SQLite schema 与迁移

- [x] 新增 `src/lib/db/schema/monitor.schema.ts`。
- [x] 将源项目 SQLite schema 迁移到 TanStack Start 项目：
  - [x] `usage_snapshots`
  - [x] `subscribers`
  - [x] `job_runs`
  - [x] `email_deliveries`
- [x] 保持字段语义 1:1：
  - [x] 自增 id
  - [x] enum-like text 字段取值不变
  - [x] unix 秒时间字段继续用 integer/bigint 语义
  - [x] `raw_json` 保持 text，避免迁移时改动行为
  - [x] unique email 和 unsubscribe token 约束保留
  - [x] indexes 保留
- [x] 从 `src/lib/db/schema/index.ts` 导出 monitor schema，不保留认证 schema。
- [x] 运行 `pnpm db generate` 生成迁移。
- [x] 运行 `pnpm db migrate` 验证迁移可应用到本地 SQLite。

### 阶段 3：i18n 路由与字典

- [x] 新建 `src/lib/i18n/routing.ts`：
  - [x] `Locale = "zh" | "en"`
  - [x] `locales = ["zh", "en"]`
  - [x] `defaultLocale = "zh"`
  - [x] `normalizeLocale`
  - [x] `USER_LOCALE` cookie 常量
- [x] 迁移 `src/i18n/messages/zh.json` 和 `en.json` 到 `src/lib/i18n/messages/`。
- [x] 新建轻量字典读取工具，替代 `next-intl`：
  - [x] server function / loader 可按 locale 取 messages
  - [x] client component 通过 props 或 context 使用 messages
- [x] 新建 `src/routes/$locale/route.tsx`：
  - [x] 校验 locale，不合法时重定向到 `/zh`
  - [x] 设置 `<html lang>` 的来源；如果 root route 无法直接读取 params，则在页面级保证可访问性和链接正确
  - [x] 提供 locale/messages 给子路由
- [x] 调整 `src/routes/index.tsx`：
  - [x] 读取 `USER_LOCALE` cookie
  - [x] 重定向到 `/${locale}`，默认 `/zh`
- [x] 实现语言切换：
  - [x] `/zh` <-> `/en`
  - [x] `/zh/unsubscribe` <-> `/en/unsubscribe`
  - [x] 切换时写入 locale cookie

### 阶段 4：业务 server functions 与查询

- [x] 新建 `src/lib/app-data.functions.ts`：
  - [x] `$getHomeData` 使用 `createServerFn({ method: "GET" })`
  - [x] handler 内部读取 db
  - [x] 返回 active subscriber count、reset count、latest reset、latest snapshot、latest job、history、detections
- [x] 新建 `src/lib/app-data.queries.ts`：
  - [x] `homeDataQueryOptions(locale)`，供 loader `ensureQueryData` 使用
- [x] 新建 `src/lib/subscribers.functions.ts`：
  - [x] `$subscribe` 使用 `createServerFn({ method: "POST" })`
  - [x] validator 校验 email + locale
  - [x] 保持返回状态：`success` / `duplicate` / `invalid` / `error`
  - [x] 成功后让调用方 invalidate home query
- [x] 新建 `src/lib/subscribers.server.ts`：
  - [x] `createOrReactivateSubscriber`
  - [x] `unsubscribeByToken`
  - [x] token 使用 `node:crypto randomBytes(24).toString("hex")`
- [x] 确保公开订阅 server function 不要求登录，且内部只接受经过 validator 清洗的数据。

### 阶段 5：usage 检测、cron API 与退订 API

- [x] 新建 `src/lib/usage/types.ts`，保留 zod schema。
- [x] 新建 `src/lib/usage/fetch.server.ts`：
  - [x] 使用 `env.CHATGPT_USAGE_AUTHORIZATION`
  - [x] `CHATGPT_USAGE_ENDPOINT` 缺省为 `https://chatgpt.com`
  - [x] `fetch(..., { cache: "no-store" })`
  - [x] response shape mismatch 时抛 Error
- [x] 新建 `src/lib/usage/normalize.server.ts`：
  - [x] `hashAccount`
  - [x] `maskEmail`
  - [x] `toSnapshotInsert`
- [x] 新建 `src/lib/jobs/check-usage.server.ts`：
  - [x] 迁移 baseline / no_change / reset / error 逻辑
  - [x] reset 判定阈值保持不变：推进 > 1 小时且 < secondary window
  - [x] reset 时加载 active subscribers 并调用邮件发送
  - [x] 每次请求都记录 snapshot，异常记录 job run
- [x] 新建 `src/routes/api/jobs/check-usage.ts`：
  - [x] `POST` handler
  - [x] 支持 `Authorization: Bearer <secret>`
  - [x] 支持 `x-cron-secret`
  - [x] 未配置 secret 返回 500
  - [x] secret 不匹配返回 401
  - [x] job error 返回 500，否则 200
- [x] 新建 `src/routes/api/unsubscribe.ts`：
  - [x] 读取 `token` 和 `lang`
  - [x] 调用 `unsubscribeByToken`
  - [x] 写入 locale cookie
  - [x] redirect 到 `/${locale}/unsubscribe?ok=true` 或 `/${locale}/unsubscribe`

### 阶段 6：邮件与日志

- [x] 新建 `src/lib/logger.server.ts`：
  - [x] pino stdout + file multistream
  - [x] 默认 `logs/app.log`
  - [x] `maskEmail`
  - [x] 不在 client bundle 导入
- [x] 新建 `src/lib/email/templates.ts`：
  - [x] 保持中英文主题和 markdown 内容 1:1
  - [x] 使用 `formatUnixTime`
- [x] 新建 `src/lib/email/send.server.ts`：
  - [x] 使用 Resend + emailmd
  - [x] `RESEND_API_KEY` 或 `EMAIL_FROM` 缺失时记录 skipped delivery
  - [x] 每个 recipient 独立 try/catch
  - [x] 记录 provider message id
  - [x] 退订链接指向 `/api/unsubscribe?token=...&lang=...`

### 阶段 7：页面与组件

- [x] 删除或停止使用 `src/components/_DELETE_ME_intro_page.tsx`。
- [x] 迁移 `CodexLogo`。
- [x] 迁移 `SubscribeForm`：
  - [x] 去掉 Next Server Action 类型
  - [x] 使用 `$subscribe` server function
  - [x] 保持成功、重复、非法、错误状态文案
  - [x] 成功后展示邮箱与 confetti
  - [x] 成功后 invalidate home data query
- [x] 迁移 `LangToggle`：
  - [x] 使用 TanStack Router 导航
  - [x] 使用 `LanguagesIcon` 或合适的 lucide icon
  - [x] 切换后更新 locale cookie
- [x] 复用目标项目 `ThemeProvider` / `ThemeToggle`：
  - [x] 根据页面视觉需要调整按钮 variant 和尺寸
  - [x] 不引入 `next-themes`
- [x] 迁移 `Table` 与 `Card` UI 使用。
- [x] 迁移 `Confetti`，确认浏览器端限定。
- [x] 新建 `src/routes/$locale/index.tsx`：
  - [x] loader 使用 `context.queryClient.ensureQueryData(homeDataQueryOptions(locale))`
  - [x] head meta 使用 locale 字典
  - [x] 页面结构和源项目视觉 1:1
  - [x] 空历史状态 1:1
- [x] 新建 `src/routes/$locale/unsubscribe.tsx`：
  - [x] 读取 search param `ok`
  - [x] 展示 success / invalid 文案
  - [x] 返回首页链接指向当前 locale

### 阶段 8：样式与静态资源

- [x] 对比 `src/app/[locale]/globals.css` 和目标项目 `src/styles.css`。
- [x] 将源项目需要的主题 token、字体类、容器规则迁移到 `src/styles.css`。
- [x] 不迁移 Geist Next font helper；如需字体，使用目标项目已有 `@fontsource-variable/inter` 或 CSS font-family。
- [x] 迁移 favicon：
  - [x] 将源项目 `src/app/[locale]/favicon.ico` 放入 `public/favicon.ico`
  - [x] 更新 `src/routes/__root.tsx` head links
- [x] 删除目标项目默认 scaffold 文案 meta，改为 Codex Reset Records。
- [ ] 检查移动端布局，确保 header、hero、表格横向滚动、订阅表单不溢出。

### 阶段 9：文档与脚本

- [x] 更新 `README.md`：
  - [x] 项目用途
  - [x] 环境变量
  - [x] 本地启动
  - [x] 数据库迁移
  - [x] 手动触发 cron curl
  - [x] 生产部署说明
- [x] 视需要迁移 `scripts/mock-codex-usage.mjs`，用于本地模拟 usage API。
- [x] 视需要迁移 `check-usage.sh`，并改成 pnpm/目标项目端口约定。
- [x] 更新 `.env.example`。

### 阶段 10：验证

- [x] `pnpm lint`
- [x] `pnpm db generate`
- [x] `pnpm db migrate`
- [ ] 本地启动 `pnpm dev`，手动验收：
  - [x] `/` 重定向到 `/zh`
  - [x] `/zh` 首页显示中文内容
  - [x] `/en` 首页显示英文内容
  - [ ] 语言切换保持路径语义正确
  - [ ] 主题切换可用且无 hydration 闪烁
  - [ ] 邮箱为空 / 非法时显示 invalid
  - [ ] 新邮箱订阅成功
  - [ ] 重复邮箱显示 duplicate
  - [x] 退订 token 生效并跳转到对应 locale 页面
  - [x] 无效退订 token 显示 invalid
  - [x] `POST /api/jobs/check-usage` 无 secret 返回 401 或 500，按配置场景验证
  - [x] secret 正确时可记录 baseline / no_change / reset
  - [x] 缺少 Resend 配置时 reset 邮件 delivery 记录为 skipped
  - [ ] 配置 Resend 后可发送邮件并记录 provider id
- [ ] 如涉及 UI 大改，使用浏览器截图检查桌面和移动端首屏。

## 风险与处理

- ChatGPT usage endpoint 是非官方内部接口，字段和鉴权可能变化。处理：zod schema mismatch 直接失败并记录 job run error，不写入伪数据。
- 不迁移历史 SQLite 数据。处理：本计划只重写应用并使用新的 SQLite 数据文件；历史数据搬迁另做一次性导入脚本。
- TanStack loader 是同构执行。处理：所有 DB、fs、Resend、pino、node:crypto 直接使用都放入 server function handler 或 `*.server.ts`。
- 邮件批量发送可能部分失败。处理：沿用逐收件人 try/catch 和 delivery 明细记录。
- reset 判定依赖历史最新 snapshot。处理：首次运行只记录 baseline，不通知。

## 回滚方式

- 代码层面：回退本次迁移 commit 即可恢复 scaffold 状态。
- 数据库层面：如果迁移已应用，使用 Drizzle 生成的迁移记录确认新增表；回滚时删除 monitor 新增表。
- 外部状态：Resend 已发送邮件无法撤回；上线前用缺失 `RESEND_API_KEY` 的 skipped 模式或测试收件人完成验证。

## 实施前确认

- [x] 接受目标项目使用 SQLite，与源项目保持一致。
- [x] 接受不引入 `next-intl`，改用 TanStack Router locale route + JSON 字典。
- [x] 接受公开 monitor 页面不接入认证系统，并移除认证 scaffold。
- [x] 确认历史 SQLite 数据是否需要迁移；当前计划不包含历史数据导入。

## SQLite 回调收尾

- [x] 将数据库驱动从 PostgreSQL 改回 SQLite + `better-sqlite3`。
- [x] 固定 `better-sqlite3` 与 `@types/better-sqlite3` 依赖版本，并同步 lockfile。
- [x] 删除 PostgreSQL 本地运行配置，不再保留 `docker-compose.yml`。
- [x] 重新生成 SQLite Drizzle migration，并与源项目 SQLite SQL 做 1:1 对照。
- [x] 使用临时 SQLite 文件执行 `pnpm db migrate`，确认迁移可从空库创建表。
- [x] 扫描源码和依赖配置，确认无 Better Auth、PostgreSQL ORM、Next 指令和 `next-intl` 引入残留。
