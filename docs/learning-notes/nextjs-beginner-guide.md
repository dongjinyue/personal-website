# Next.js 从零入门：结合个人网站理解全栈开发

适用对象：已经跟着完成网页，但还不清楚 Next.js 为什么这样组织代码的初学者。

版本基准：本项目 Next.js 16.3.4、React 19，使用 App Router（应用路由）。核对日期：2026-09-03。

本文是专题教材，不是要求你重做项目。标注“可选练习”的代码可以自己尝试；其他示例用于解释已有实现。本文没有替你修改业务代码。

配套阅读：[Supabase 基础教材](./supabase-beginner-guide.md)、[Day 10 实践文档](./day-10-supabase-postgresql.md)。

## 一、先知道自己正在学什么

你现在的网站使用几层不同的技术：

| 技术 | 职责 | 网站中的例子 |
| --- | --- | --- |
| HTML（网页结构语言） | 描述内容结构 | 标题、按钮、表单 |
| CSS（层叠样式表） | 控制外观与布局 | 卡片、颜色、响应式网格 |
| JavaScript（编程语言） | 执行逻辑 | 搜索、筛选、点击事件 |
| TypeScript（带类型检查的 JavaScript） | 提前发现类型错误 | `Tool`、`ToolCategory` |
| React（界面库） | 用组件和状态组织界面 | `ToolCard`、`ToolExplorer` |
| Next.js（基于 React 的框架） | 路由、服务端渲染、数据读取、构建 | `/tools`、动态详情页 |
| Supabase（后端平台） | 提供数据库、认证等能力 | 工具表与行级安全策略 |

React 负责“界面如何组成”，Next.js 帮你把这些界面组织成能运行、能访问、能部署的网站。两者不是互相替代的技术。

## 二、Next.js 为什么不只是前端工具

Next.js 可以同时运行浏览器代码和服务端代码。

浏览器适合处理输入、点击、搜索框状态；服务端适合读取数据库、验证身份和处理不能公开的凭据。

```text
浏览器
  请求 /tools
       ↓
Next.js 服务端
  调用 getTools()
       ↓
Supabase 数据接口 → PostgreSQL 数据库
       ↓
返回工具数据 → Next.js 生成页面内容
       ↓
浏览器显示卡片，并接管搜索和筛选交互
```

开发时，浏览器和 Next.js 服务端都可能在你的电脑上，但它们仍是不同的运行环境。部署后，服务端代码会在部署平台执行，不在访客电脑执行。

## 三、先看懂项目目录

```text
personal-website/
├── app/                 路由入口、页面与布局
├── components/          可以复用的界面组件
├── data/                静态数据与现有数据类型
├── lib/                 查询、客户端与业务辅助函数
├── public/              可通过网址访问的静态资源
├── supabase/            迁移与初始数据脚本
├── docs/                学习文档
├── package.json         依赖声明与运行命令
├── package-lock.json    npm 锁定的依赖版本
├── tsconfig.json        TypeScript 配置
├── next.config.ts       Next.js 配置
├── .env.local           本机环境变量，不提交 Git
├── node_modules/        已安装的依赖，不手动改源码
└── .next/               自动生成的构建产物和缓存
```

其中 `app`、`public` 和特殊文件名是框架约定。`components`、`lib`、`data` 是项目组织方式，不是 Next.js 强制要求的名称。

`package.json` 像依赖清单，`node_modules` 是清单对应的实际安装内容。不要把依赖内部代码当成自己的业务代码修改。

## 四、App Router：目录如何变成网址

Next.js 使用 File-system Routing（基于文件系统的路由）。

| 文件 | 对应网址 |
| --- | --- |
| `app/page.tsx` | `/` |
| `app/tools/page.tsx` | `/tools` |
| `app/projects/page.tsx` | `/projects` |
| `app/projects/[slug]/page.tsx` | `/projects/某个项目标识` |

目录决定路径片段，`page.tsx` 决定该路径的页面内容。只创建 `app/about/` 文件夹但没有页面文件，不会自动得到一个可访问的关于页面。

### 可选练习：理解最小页面

如果以后想增加关于页，可以创建 `app/about/page.tsx`：

```tsx
// 默认导出的函数组件，是 /about 的页面入口。
export default function AboutPage() {
  return <main><h1>关于我</h1><p>这里介绍我正在学习的内容。</p></main>;
}
```

预期结果：访问 `/about`，看到标题和介绍。页面函数叫 `AboutPage` 还是 `Page` 不影响路径，路径由目录决定。

## 五、page 与 layout 有什么不同

`page.tsx` 表示具体页面；`layout.tsx` 表示多个页面共享的外壳。

你的 `app/layout.tsx` 大致组织为：

```text
RootLayout（根布局）
├── Header（页头）
├── children（当前页面内容）
└── Footer（页脚）
```

因此 `/tools` 和 `/projects` 不需要分别重复写页头、页脚。

- 根布局必须提供 `<html>` 和 `<body>`；
- `children` 表示被包裹的页面或下一级布局；
- 子目录还能添加自己的 `layout.tsx`，例如管理后台专用侧边栏；
- 共享布局在客户端导航时可以保留状态，不应假设每次换页都会从头执行所有布局逻辑。

最后一点会影响登录保护：不能只在布局中检查一次身份，就认为所有后续操作都安全。

## 六、Component、Props 和 State

### Component（组件）

把页面拆成职责明确的部分，例如卡片、搜索栏和页头。

### Props（组件参数）

由父组件传给子组件的数据：

```tsx
<ToolExplorer tools={tools} />
```

左边的 `tools` 是参数名，右边的 `tools` 是当前作用域中的数据变量。子组件不应直接修改父组件传入的数据。

### State（状态）

组件内部随操作变化的数据，例如：

```tsx
const [query, setQuery] = useState("");
```

- `query`：当前搜索词；
- `setQuery`：更新搜索词的函数；
- `useState("")`：初始搜索词是空字符串。

搜索结果可以由“工具列表 + 搜索词 + 分类”计算得到，通常不需要再保存一份重复的结果状态。这样可以避免两份数据不同步。

## 七、为什么有 .ts 和 .tsx

- `.ts`：普通 TypeScript 代码，例如查询函数、类型定义；
- `.tsx`：允许包含 JSX（在 JavaScript 中描述界面的语法），适合组件。

例如：

```text
lib/tool-repository.ts    查询和转换数据
components/ToolCard.tsx   返回卡片界面
```

`type Tool` 是开发阶段的类型描述，不会在数据库返回数据时自动执行检查。因此项目里的分类校验函数仍然有价值。

`@/components/ToolExplorer` 中的 `@/` 是路径别名，由本项目 TypeScript 配置指定，不是联网下载路径。

## 八、服务端组件：负责读取与组织数据

App Router 下的页面和布局默认是 Server Component（服务端组件）。

项目已有的 Tools 页面可以简化为：

```tsx
import ToolExplorer from "@/components/ToolExplorer";
import { getTools } from "@/lib/tool-repository";

export default async function ToolsPage() {
  // 等待数据库查询结束，再将结果传给交互组件。
  const tools = await getTools();
  return <ToolExplorer tools={tools} />;
}
```

`async` 表示函数可以异步执行，`await` 等待查询结果。等待数据库不等于让浏览器执行数据库代码。

服务端组件不能直接使用 `useState` 和浏览器事件处理器，也不能依赖 `window`。它们适合获取数据、处理服务端逻辑，再输出界面。

服务端执行也不自动代表安全：如果把私密数据作为参数传给客户端组件，它仍会到达浏览器。只能传递界面需要的数据。

## 九、客户端组件：负责交互

需要搜索输入、按钮事件或状态时，使用 Client Component（客户端组件）。文件顶部声明：

```tsx
"use client";

import { useState } from "react";

export default function SearchExample() {
  const [query, setQuery] = useState("");

  return (
    <label>
      搜索工具
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
    </label>
  );
}
```

这只是独立教学示例，不需要替换你现有的 `ToolExplorer`。

`"use client"` 声明客户端模块边界；它导入的普通模块也可能进入浏览器代码包。因此不能从里面导入数据库服务端模块。

不要为了消除一个报错就给整个应用加 `"use client"`。通常保留页面为服务端组件，只让需要交互的小部分进入客户端。

依据：[Next.js 服务端与客户端组件](https://nextjs.org/docs/app/getting-started/server-and-client-components)。

## 十、客户端组件不等于“只在浏览器运行”

首次访问时，Next.js 可以先在服务端生成包含客户端组件的 HTML（网页内容），让用户较早看到页面；随后浏览器加载 JavaScript，为交互组件接上事件。

这个过程叫 Hydration（水合，即让预生成界面具有交互能力）。

所以客户端组件的首次渲染也不能随意读取 `window` 或 `localStorage`。只属于浏览器的操作应放在合适的事件处理器或 `useEffect`（副作用钩子）中。

如果服务端和浏览器首次输出不同，例如渲染时直接使用随机数或不同本地时间，就可能出现 Hydration Mismatch（水合不匹配）。

## 十一、服务端与客户端之间能传什么

本项目传递 `Tool[]`（工具数组），里面是字符串、布尔值和标签数组，适合作为跨边界参数。

不能把数据库连接对象、包含普通方法的客户端实例或任意普通函数传给客户端组件。跨边界数据必须符合 React 的可序列化规则；先使用简单数据对象最容易理解。

`import "server-only"` 用于声明模块只能被服务端使用。它是开发构建保护，不是数据库权限系统，也不能取代 Supabase RLS（行级安全）。

## 十二、完整追踪一次 /tools 请求

1. 浏览器请求 `/tools`；
2. Next.js 找到 `app/tools/page.tsx`；
3. 页面调用 `getTools()`；
4. 查询层创建与当前请求关联的 Supabase 客户端；
5. Supabase 按角色和 RLS 处理查询；
6. 查询层将 `is_favorite` 转成 `isFavorite`，展开标签；
7. 页面把 `Tool[]` 传给 `ToolExplorer`；
8. 浏览器接管搜索与分类按钮。

当前搜索是对已经取得的工具数组进行本地筛选，不是每输入一个字就查询数据库。数据量很大时，再考虑服务端分页与搜索。

并非所有页面都已经连接数据库：当前首页和项目数据仍有静态来源。不要因为 Tools 页面接入成功，就认为整个网站都已迁移。

## 十三、动态路由 [slug]

`slug` 是适合放在网址中的项目标识，例如 `personal-website`。

```text
/projects/personal-website
          └── slug 的值
```

项目当前使用 Next.js 16 的异步参数写法：

```tsx
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  // 记录不存在时进入 404 流程，不继续读取不存在对象的属性。
  if (!project) notFound();

  return <h1>{project.name}</h1>;
}
```

这是已有详情页的简化版本。不要照抄旧教程中的同步 `params.slug` 写法。

`generateStaticParams()` 可以提供一组已知参数，帮助预生成对应路径。动态路由中的“动态”指路径有变量，不代表它一定必须每次请求重新渲染。

## 十四、Link 与页面导航

站内跳转通常使用 `next/link`：

```tsx
import Link from "next/link";

<Link href="/tools">查看工具集</Link>
```

它可以支持客户端导航和预取，减少完整页面刷新。不要用点击事件和 `window.location` 替代所有普通链接。

站外工具链接使用 `<a>` 很合适。若使用 `target="_blank"` 新开窗口，可配合 `rel="noopener noreferrer"`。

页面导航不是权限校验：隐藏管理后台链接不能阻止别人直接输入管理后台网址。

## 十五、CSS：全局样式与局部样式

- `app/globals.css`：全站基础样式、颜色变量和通用规则；
- `*.module.css`：CSS Modules（局部作用域样式），适合组件或页面。

项目示例：

```tsx
import styles from "../collection.module.css";

<main className={styles.page}>页面内容</main>
```

`styles.page` 会映射到构建生成的局部类名，减少不同文件都写 `.page` 时的命名冲突。

CSS Modules 不会自动修复所有全局选择器问题。全局样式仍应保持克制，避免无意影响其他页面。

## 十六、public、图片与页面信息

`public/example.png` 的访问地址是 `/example.png`，不是 `/public/example.png`。放入 `public` 的内容应视为公开资源，不能放密码文件。

Next.js 提供 `next/image`（图片组件），支持图片尺寸处理等优化；使用时需要正确设置尺寸或布局约束，外部图片来源还可能需要配置。

Metadata（页面元信息）用于标题、描述和分享信息。你的项目详情页已经用 `generateMetadata()` 根据项目内容生成标题和描述。

页面标题应说明“这是哪一页”，而不是所有页面都叫同一个名称。元信息有助于搜索和分享，但不保证搜索排名。

## 十七、加载、无数据、错误与 404

这些状态不能混为一谈：

| 状态 | 含义 | 处理方式 |
| --- | --- | --- |
| 正在加载 | 查询还未完成 | `loading.tsx` 或 Suspense（等待边界） |
| 查询成功但无记录 | 返回空数组 | 显示“还没有工具” |
| 筛选后无结果 | 数据存在但不匹配 | 显示清除筛选按钮 |
| 查询失败 | 网络、权限或服务出错 | 保留错误，进入错误处理 |
| 记录不存在 | 找不到指定详情 | `notFound()` 与 404 界面 |

`error.tsx` 用来提供错误边界界面，需要是客户端组件。它主要处理对应边界下的渲染错误，不会自动处理所有事件处理器中的异常。

不要把所有数据库错误都转换成 `[]`，否则“系统故障”会被伪装成“没有数据”。

## 十八、渲染与缓存：先学区别，不死记旧结论

Rendering（渲染）是生成界面的过程；Caching（缓存）是复用之前的结果。它们有关联，但不是一回事。

- 静态预渲染：提前生成可复用结果；
- 动态渲染：依赖请求时才能知道的信息；
- 客户端状态更新：浏览器根据新状态重新计算界面；
- 数据缓存：复用查询结果，不必每次都重新访问数据源。

不要把“服务端组件”理解为“每一次点击都查数据库”，也不要把 `async` 理解成“自动动态渲染”。

### 本项目版本与配置特别说明

当前 `next.config.ts` 没有启用 `cacheComponents: true`。新版官方缓存教材中介绍的 Cache Components（缓存组件）模式有配置前提，不应直接混入当前代码。

当前 Tools 查询读取 `cookies()`，依赖请求上下文。首页和项目详情又可能具有不同渲染方式，应结合实际代码与构建输出判断。

现代 Next.js 不能套用“所有 fetch 请求默认永久缓存”的旧印象。即使某次请求未设置数据缓存，浏览器导航和页面结果仍可能有各自的缓存行为。

后续写入工具后，要明确如何刷新列表或使旧缓存失效；缓存管理员私有数据时尤其不能跨用户共享结果。

依据：[缓存组件模式及启用前提](https://nextjs.org/docs/app/getting-started/caching)。本项目现状以本地 `next.config.ts` 为准。

## 十九、环境变量与安全边界

`process.env` 用来访问环境变量。项目在 `.env.local` 中配置 Supabase 地址和公开密钥。

- `NEXT_PUBLIC_` 前缀表示变量可以进入浏览器代码，不是加密方式；
- 不带该前缀的变量通常留在服务端，但开发者仍不能主动把秘密返回给浏览器；
- 修改本地配置后重启开发服务，有助于确保读取新值；
- 部署平台需要单独配置环境变量，不会自动读取你电脑上未提交的文件；
- `.env.example` 只保留模板，不能写真实密码。

服务端代码使用 Supabase Publishable Key（公开密钥）仍然受 RLS 约束；代码运行位置和数据库访问角色是两个不同概念。

## 二十、Route Handler 与 Server Action

Route Handler（路由处理器）在 `route.ts` 中接收 HTTP（网络请求协议）请求并返回响应。例如以下可选教学接口放在 `app/api/health/route.ts`：

```ts
// 简单健康检查，不访问数据库，也不暴露环境变量。
export async function GET() {
  return Response.json({ ok: true });
}
```

访问 `/api/health` 会得到 JSON（结构化数据格式），不是 React 页面。同一路径片段不能同时用 `page.tsx` 和 `route.ts` 争用同一个入口。

Server Action（服务端操作）适合从表单触发服务端写入。`"use server"` 用于声明此类服务端函数，不是把普通组件变成服务端组件的必要指令。

任何写入入口都要验证输入、用户身份和操作权限。不能因为函数名写着 `deleteTool` 或文件里有 `"use server"` 就省略授权。

现有服务端页面可以直接调用 `getTools()`，无需绕一圈请求自己的网站接口。

## 二十一、登录保护与 Proxy

Next.js 16 将 Middleware（中间件）命名为 Proxy（请求前处理），使用根目录 `proxy.ts`。旧教程的 `middleware.ts` 不应不加区分地照搬。

Proxy 可以做请求前的重定向、头信息处理和必要的会话刷新协作，但不是完整的权限系统，也不适合承担全部慢查询。

管理员功能应分层保护：

1. 页面层：没有权限时提示或跳转；
2. 服务端操作或接口层：每次敏感操作重新验证身份和权限；
3. 数据库层：RLS 限制真实数据访问。

只有登录状态不等于管理员。Day 11 以后还要定义“哪些已登录用户是管理员”。

## 二十二、常用终端命令

本项目使用 npm（Node 包管理器）。不要随意切换包管理器并生成不同的锁文件。

### 启动开发环境

```powershell
npm run dev
```

执行 `package.json` 中的 `dev` 脚本，即 `next dev`。预期显示本地地址与就绪信息。它会创建或更新 `.next` 开发缓存；按 `Ctrl + C` 停止。

### 检查代码规范

```powershell
npm run lint
```

本项目执行 ESLint（代码规范检查器）。预期没有错误并回到终端提示符。通过它不代表数据库连接和所有类型一定正确。

### 检查类型

```powershell
npx tsc --noEmit
```

`npx` 运行工具，`tsc` 是 TypeScript 编译器，`--noEmit` 表示不输出编译后的 JavaScript；项目启用增量检查时仍可能更新类型检查缓存。

### 生产构建

```powershell
npm run build
```

执行 `next build`，生成 `.next` 生产产物，并检查构建与类型问题。当前脚本没有把 ESLint 集成进来，仍需单独运行 lint。构建通过不代表所有请求时才执行的查询和权限都验证成功。

### 运行生产构建

```powershell
npm run start
```

执行 `next start`，使用已经生成的生产产物；必须先构建成功。这不是自动发布到互联网。

## 二十三、Build 与 Deployment

Build（构建）把源码变成可运行产物；Deployment（部署）把产物和运行环境放到能服务访客的平台。

上线时仍需要：

- 平台支持你的 Next.js 服务端功能；
- 配置环境变量；
- 服务端可以访问 Supabase；
- 配置正确的登录跳转地址；
- 使用 HTTPS（加密网络连接）并检查错误日志。

当前应用读取请求 Cookie（会话数据），后续还要服务端登录，因此不能简单假设导出静态 HTML 就能保留全部能力。

## 二十四、排查错误的顺序

### 1. 路由打不开

检查路径拼写、对应 `page.tsx` 是否存在、组件是否默认导出。不必首先怀疑 Supabase。

### 2. useState 或 onClick 报错

检查交互代码是否处于客户端组件边界。把交互拆到小组件，而不是盲目将整个页面改为客户端。

### 3. window is not defined

说明代码在没有浏览器对象的环境中执行。检查是否在顶层或首次渲染时读取了 `window`。

### 4. 数据库读取失败

检查服务端终端日志、环境变量、网络连接、查询关系和 RLS。不要通过换成高级私密密钥来掩盖权限错误。

### 5. Module not found（找不到模块）

先看错误路径：业务文件可能是导入路径或文件名大小写错误；`node_modules/next` 内部路径可能涉及依赖或旧模块缓存。

项目曾在依赖处理之后出现 Next.js 内部模块解析错误，确认文件存在后重启开发服务器恢复。这个案例不能推广成“所有模块错误重启就好”。

顺序建议：看完整错误 → 确认文件与路径 → 重启服务 → 检查锁文件和依赖安装。清理生成目录前先停止相关进程并确认绝对路径；不要执行来源不明的递归删除命令。

### 6. 本地正常，部署失败

检查环境变量、大小写、Node.js 运行版本、构建输出和平台网络。Windows 上某些大小写问题可能到 Linux 部署环境才出现。

### 7. 修改数据库后页面没变化

先确认页面是不是仍读 `data/` 静态数据，再确认连接的项目、筛选条件、排序和缓存。不要只凭卡片顺序就当作连接正确的唯一证据。

## 二十五、三组复习练习与参考答案

### 练习 A：定位功能应放在哪里

问题：增加 `/about` 页面、增加搜索按钮、改变工具查询，各放在哪里？

参考答案：分别是 `app/about/page.tsx`、负责交互的客户端组件、`lib/tool-repository.ts`。页面入口、交互和数据访问应保持职责清楚。

### 练习 B：解释为什么不能这样写

问题：在 `ToolExplorer` 中直接导入 `lib/supabase/server.ts`，为什么不合适？

参考答案：`ToolExplorer` 是客户端入口，服务端客户端依赖请求 Cookie 和服务端模块。应由服务端页面查询后通过参数传入结果，`server-only` 会帮助阻止错误导入。

### 练习 C：识别“成功但没有数据”和“失败”

问题：数据库查询失败时返回空数组，会有什么问题？

参考答案：页面会把故障误当成没有工具，用户看不到真实问题，开发者也失去定位线索。空结果和错误必须分别处理。

## 二十六、自测题

先回答，再看下一节：

1. React 和 Next.js 的职责有什么不同？
2. `/tools` 的路径由组件函数名还是文件目录决定？
3. `layout.tsx` 中的 `children` 是什么？
4. `.ts` 和 `.tsx` 有什么区别？
5. 为什么 ToolsPage 不需要 `"use client"`？
6. 为什么 ToolExplorer 需要客户端组件边界？
7. 客户端组件是否只在浏览器执行？
8. `async` 是否保证页面每次请求都重新渲染？
9. Next.js 16 应如何读取 `params` 和 `cookies()`？
10. `server-only` 是否能替代 RLS？
11. 为什么不能只通过隐藏按钮保护删除操作？
12. `NEXT_PUBLIC_` 是否表示变量已经加密？
13. 本项目是否启用了 Cache Components？
14. lint 通过是否代表 build 一定通过？
15. 为什么服务端组件不必先请求自己定义的接口才能查数据库？
16. `/tools` 正常是否证明所有页面已经接入 Supabase？

## 二十七、自测题标准答案

1. React 组织组件与交互；Next.js 在它之上提供路由、渲染、服务端能力和构建部署机制。
2. 由目录与 `page.tsx` 约定决定，组件函数名不决定网址。
3. 是当前页面或嵌套布局的内容，由共享布局包裹。
4. `.tsx` 可以包含 JSX 界面语法；普通类型和工具逻辑通常使用 `.ts`。
5. 它主要在服务端查询数据与组织界面，没有使用客户端状态和事件。
6. 它使用搜索状态、输入事件和分类按钮交互。
7. 不是。首次访问时可以参与服务端预生成 HTML，再由浏览器水合和处理交互。
8. 不是。渲染时机还受请求依赖、缓存和配置影响，不能只看 `async`。
9. 服务端中使用 `await params` 和 `await cookies()`，不照搬旧版同步写法。
10. 不能。它保护模块导入边界；RLS 保护数据库访问权限。
11. 用户可以绕过界面直接发请求，必须在服务端操作和数据库权限层验证。
12. 不是。它表示变量可能进入浏览器构建产物，不能放私密密钥。
13. 没有。当前 `next.config.ts` 未设置 `cacheComponents: true`，不能直接套用该模式的全部规则。
14. 不代表。lint、类型检查、构建、浏览器行为和数据库权限检查各有职责。
15. 它本来就在服务端，可以直接调用查询层；绕行自己的接口通常会增加不必要的网络步骤。
16. 不证明。首页和项目详情仍有静态数据来源，应逐页核对。

## 二十八、建议阅读顺序与掌握清单

第一遍：第一至十二节，弄懂目录、组件边界和 Tools 数据流。

第二遍：第十三至十九节，理解路由、页面状态、缓存与环境变量。

第三遍：第二十至二十四节，为管理员登录、写入与部署做准备。

最后完成练习和自测，能做到下面这些就算真正理解了基础：

- [ ] 能从网址找到对应页面文件。
- [ ] 能解释页面和布局的区别。
- [ ] 能判断逻辑该放服务端还是客户端。
- [ ] 能画出一次 /tools 请求的数据流。
- [ ] 能区分加载、空数据、错误与 404。
- [ ] 能解释私密凭据为什么不能传给浏览器。
- [ ] 能说清 lint、类型检查、build 与部署的区别。
- [ ] 看旧教程时会先核对版本与配置。

## 二十九、参考资料

本教材优先核对项目内 `node_modules/next/dist/docs/`，与已安装版本匹配。升级 Next.js 后，需要重新核对缓存、认证和异步接口写法。

- [官方：布局与页面](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [官方：服务端与客户端组件](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [官方：读取数据](https://nextjs.org/docs/app/getting-started/fetching-data)
- [官方：缓存组件模式](https://nextjs.org/docs/app/getting-started/caching)
- [官方：未启用缓存组件的缓存模型](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [官方：Proxy](https://nextjs.org/docs/app/getting-started/proxy)
- [官方：环境变量](https://nextjs.org/docs/app/guides/environment-variables)

## 一句话总结

Next.js 用目录组织路由，用 React 组件组织界面，用服务端代码读取和保护数据，再让客户端组件接管交互；写对代码之前，先弄清楚它在哪里执行、何时执行、给谁看。
