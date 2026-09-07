# MY SPACE

MY SPACE 是一个面向长期个人使用的内容入口：公开访客可以浏览 AI 新闻示例、项目和工具，管理员登录后可以维护项目、工具及工具分类。

项目已经从静态学习示例发展为可运行的全栈应用。当前重点不是继续堆叠页面，而是完善真实内容、部署流程和自动化验证。

## 当前功能

### 公开区域

- `/`：AI 每日简报首页，目前使用明确标记的示例内容。
- `/news`：完整 AI 新闻示例列表，支持分类筛选和正文展开。
- `/projects`：从 Supabase（云数据库服务）读取已发布且当前账号可见的项目，使用服务端分页。
- `/projects/[slug]`：项目详情、状态、亮点、技术标签和外部链接。
- `/tools`：从 Supabase 读取工具和分类，支持关键词搜索、分类筛选和清空条件。
- 顶部导航：按登录状态和数据可见性生成项目菜单、工具分类菜单及登录/后台入口。

### 管理区域

- `/login`：管理员登录；不提供普通访客注册。
- `/admin/tools`：工具分页、新建、编辑、永久删除和批量游客可见性设置。
- `/admin/projects`：项目分页、新建、编辑、永久删除和批量游客可见性设置。
- `/admin/categories`：工具分类的新建、改名和删除；已被工具使用的分类不可删除。
- 后台写操作在 Server Action（服务端操作）中重新校验管理员身份。
- 表单支持字段错误、提交状态、未保存更改提醒和重复提交保护。

## 技术栈

- Next.js 16.3.4（React 全栈框架），使用 App Router（应用路由）。
- React 19.2.8（用户界面库）。
- TypeScript 5（带静态类型的 JavaScript）。
- Tailwind CSS 4（原子化 CSS 框架）与 CSS Modules（局部样式模块）。
- Supabase（PostgreSQL 数据库、身份认证和行级安全策略）。

## 本地运行

### 1. 安装依赖

```powershell
npm install
```

`npm install` 会根据 `package-lock.json` 安装项目依赖。正常结果是生成或更新本地 `node_modules` 目录；不要提交该目录。

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，然后填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ADMIN_USER_ID=
```

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目地址。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：浏览器可用的公开密钥；数据库安全不能只依赖它，仍由行级安全策略控制。
- `ADMIN_USER_ID`：唯一管理员在 Supabase Auth（身份认证）中的用户 ID。

`.env.local` 含环境专用信息，不应提交到代码仓库。

### 3. 准备数据库

数据库结构和权限变更位于 `supabase/migrations/`。本地学习材料见 `docs/database-design.md` 与 `docs/learning-notes/`。

如果使用 Supabase CLI（命令行工具），先确认已连接到正确项目，再应用迁移。迁移会修改数据库结构和策略，生产环境执行前应检查目标项目与备份策略。

### 4. 启动开发服务器

```powershell
npm run dev
```

该命令启动 Next.js 开发服务器。终端通常会显示本地地址，例如 `http://localhost:3000`；浏览器打开该地址即可查看网站。

## 质量检查

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

- `npm run lint`：运行 ESLint（代码规范检查）。
- `npx tsc --noEmit`：只做 TypeScript 类型检查，不生成文件。
- `npm run build`：执行生产构建，检查路由、服务端代码和打包是否可以完成。

## 项目结构

```text
app/                  页面、布局、加载/错误状态与服务端操作
components/           公共组件、新闻组件和后台组件
lib/                  数据访问、表单解析、认证和 Supabase 客户端
data/                 数据库不可用时的静态回退数据
supabase/migrations/  数据库结构与权限迁移
docs/                 数据库说明和分日学习笔记
public/               静态资源
```

## 文档入口

- `个人网站-项目与工具集-学习路线-v2.md`：按当前进度整理的学习路线和后续计划。
- `DESIGN.md`：视觉方向、设计令牌和组件风格约束。
- `UX-CONTRACT.md`：导航、权限、CRUD、反馈和无障碍行为约定。
- `CHANGELOG.md`：已经完成的重要变更。
- `AGENTS.md`：仓库内编码智能代理需要遵守的项目规则。

## 当前限制

- AI 新闻仍是本地示例，没有真实采集、来源引用、定时任务和历史归档。
- 项目只支持封面地址，尚未提供文件上传。
- 管理员仍是单账号模型，暂不支持普通用户、角色或多人协作。
- 自动化测试尚未建立；当前主要依赖静态检查、生产构建和人工浏览器验收。
- 代码仓库不能证明线上域名、部署环境和定时任务状态，发布前需单独核验。

## 文档维护规则

功能完成后同时更新 `CHANGELOG.md`；长期视觉决定更新 `DESIGN.md`；跨页面交互规则更新 `UX-CONTRACT.md`。规划项不能写成已完成功能，线上状态也不能仅根据本地代码推断。
