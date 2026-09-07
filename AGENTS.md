<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MY SPACE 项目规则

## 开始工作前

- 先阅读 `README.md` 了解当前功能和运行方式。
- 修改视觉、布局或公共组件前，完整阅读 `DESIGN.md`。
- 修改导航、表单、权限、删除、反馈或响应式行为前，完整阅读 `UX-CONTRACT.md`。
- 涉及数据库时，检查 `supabase/migrations/`、`lib/supabase/database.types.ts` 和对应 repository（数据访问层）；迁移文件是数据库结构与权限的权威记录。
- 写 Next.js 代码前，按上方自动生成规则阅读 `node_modules/next/dist/docs/` 中与任务相关的文档，不凭旧版本经验猜测 API（接口）。

## 项目约定

- 用户界面和说明文案使用简体中文；首次出现的英文技术词补充中文解释。
- 保留 App Router（应用路由）、Server Component（服务端组件）优先和现有 CSS Modules（局部样式模块）结构。
- 公开读取集中在 `lib/*-repository.ts`，后台读取集中在 `lib/admin-*-repository.ts`；不要在页面里复制查询逻辑。
- 后台页面可见不等于已授权。每个敏感读取和写入都必须在服务端调用 `requireAdmin()` 或遵循现有等价模式。
- 可见性统一使用 `hide_from_guests`：`false` 表示游客可见，`true` 表示仅登录用户可见。它与发布状态、项目进度和首页推荐相互独立。
- 项目和工具的新建、编辑应复用现有表单；删除、批量可见性和未保存提醒应复用现有确认弹窗与状态模式。
- 重要但不直观的业务逻辑添加中文注释；不要给显而易见的语法逐行加注释。

## 数据库与安全

- 不修改已经应用的旧迁移；新变化新增带时间戳的迁移文件。
- 数据库表、授权策略或字段变化后，同步更新 `lib/supabase/database.types.ts` 和相关文档。
- 不在代码、日志、URL、Toast（短暂状态提示）或文档中写入真实密钥、密码和用户令牌。
- 永久删除必须保留明确后果、重复提交保护和服务端版本校验；不要用浏览器原生 `confirm()` 代替应用弹窗。

## 完成标准

- 至少运行 `npm run lint`、`npx tsc --noEmit` 和 `npm run build`。
- 交互改动还要检查键盘焦点、窄屏、加载、空数据、错误和 `prefers-reduced-motion`（减少动态效果偏好）状态。
- 功能变化更新 `CHANGELOG.md`；长期视觉规则更新 `DESIGN.md`；跨页面行为变化更新 `UX-CONTRACT.md`。
- 不把示例内容描述成真实数据，不把本地完成描述成已经上线。
