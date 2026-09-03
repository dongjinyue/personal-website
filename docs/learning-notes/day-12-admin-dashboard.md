# Day 12：Dashboard（管理后台）、共享布局与真实数据概览

状态：进行中

基于 Next.js 16.3.4、React 19、Supabase，日期：2026-09-03。

今天所有教学内容、实现参考、验收和标准答案一次性写在这份文档中。先理解目标，再按任务顺序实现，不必边等聊天边猜下一步。本文只提供教材，不表示下面的后台代码已经写入项目。

## 一、今天完成之后是什么样

Day 11 完成了“谁能进来”，Day 12 解决“进来之后看什么、怎么去其他页面”。

今天将 `/admin` 从一句登录成功提示，变成真正可用的只读后台：

- 共享侧边导航：概览、工具预览、项目预览；
- 当前登录账号与现有退出按钮；
- 来自数据库的项目数、工具数、标签数；
- 最近更新的工具预览；
- 工具与项目各自的只读预览页；
- 加载、空数据、局部失败和整体错误状态；
- 桌面两列、手机纵向排列；
- 所有后台数据查询先检查管理员身份。

今天不实现新增、编辑、删除，不创建无作用的按钮，不加入假趋势图或假增长百分比，不开放任何数据库写权限。Day 13/14 再做真正的管理操作。

## 二、Day 11 检查结论与前置事项

Day 11 的代码、类型与匿名跳转已检查，用户确认登录成功。详细证据见 [Day 11 检查记录](./day-11-admin-auth-and-session.md)。

今天开始前，建议亲自补测：

1. 退出后手动访问 `/admin`，应要求重新登录。
2. 普通 Auth 用户不能进入后台。
3. 错误密码应留在登录页，不出现后台内容。
4. 在你的终端运行 `npm run build`，记录结果。

真实过期刷新未测试时应保留“待验证”。这些结果不要靠“看起来能登录”推断。

表单显示/隐藏密码、应用内字段校验属于已记录的改进项，不是今天侧边栏任务的一部分；不要为了布局学习大范围重写认证模块。

## 三、今天要理解的核心概念

### 1. Dashboard 不是装饰大屏

后台概览的职责是快速回答：目前有多少内容、最近改动什么、可以去哪里继续工作。没有历史数据时，就不要显示“较昨日增长 20%”。

### 2. Layout（共享布局）与 Page（具体页面）

```text
app/layout.tsx：现有全站页头、页脚
└── app/admin/layout.tsx：后台导航、账号区、内容区域
    ├── /admin：概览
    ├── /admin/tools：工具只读预览
    └── /admin/projects：项目只读预览
```

共享布局避免每一页复制导航和退出按钮。今天保留全站页头页脚，不移动公开页面、不引入 Route Groups（路由分组）重构。

共享布局在客户端导航时可能复用，且页面与布局的数据读取可能并行。**不能只在布局中检查权限，就认为其下所有查询自动安全。** 查询入口本身仍要验证管理员。

依据：[Next.js 布局与页面](https://nextjs.org/docs/app/getting-started/layouts-and-pages)。

### 3. Server Component 与 Client Component

服务端组件负责管理员验证、数据库查询和生成内容；客户端组件只负责当前路径高亮、刷新按钮等交互。

不要给整个后台布局加 `"use client"`。否则容易把服务端查询模块错误导入浏览器。

### 4. Count（总数）与 Preview（预览）

总数由数据库计算，预览最多读取 10 行。不能用 `rows.length` 冒充全表总数，因为行数可能受分页或接口限制。

`0` 表示成功查询到零条记录；`null` 表示未取得可靠数量。统计失败必须显示“暂不可用”，不能用 `count ?? 0` 把错误画成零。

### 5. 局部失败与整体失败

如果项目统计失败，但工具统计成功，可以保留工具数并标注项目数不可用。若管理员身份无法确认，不能继续展示后台数据，应进入错误或登录流程。

## 四、设计与复用约定

设计依据：项目根目录 `DESIGN.md`，运行时颜色来源是 `app/globals.css`。

- 保持现有浅灰蓝背景、白色内容面、紫色强调，不引入第二套主题。
- 复用 `LogoutButton`，不要写另一套退出操作。
- 后台导航统一由 `AdminNav` 管理。
- 工具和项目预览共用 `AdminPreview`，保持表格、错误和空状态一致。
- 用户只读浏览，因此使用普通链接和语义化表格，不用伪装成标签页的 `role="tab"`。
- 桌面使用侧边栏，手机直接变为上方换行导航。今天不引入弹出抽屉，避免增加焦点陷阱、遮罩和滚动锁。
- 页面整体保持自然滚动，只有表格必要时横向滚动，不给整个后台设置固定高度或 `overflow: hidden`。
- 预览不是完整管理列表：明确显示“最多 10 条”，以后新增分页时再扩展。

## 五、今天的任务总览

1. 新建后台共享样式。
2. 创建后台路径导航和刷新按钮。
3. 创建共享后台布局，保留管理员验证与退出。
4. 添加带权限检查的数据概览查询层。
5. 创建统计组件和只读预览组件。
6. 实现概览、工具预览、项目预览三个页面。
7. 设置加载与错误界面。
8. 验证数据、权限、窄屏、导航和失败状态。
9. 运行 lint、类型检查与构建。

没有数据库结构变更，因此今天不运行迁移、不执行 Seed、不重新生成数据库类型。不要借本日任务顺便升级依赖。

## 任务 1：共享后台样式

新建 `app/admin/admin.module.css`：

```css
.shell {
  width: min(calc(100% - 2rem), var(--content-width));
  margin: 2rem auto;
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  gap: 1.5rem;
  position: relative;
}
.sidebar, .panel, .stat {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.25rem;
  min-width: 0;
}
.sidebar { align-self: start; }
.workspace, .content { min-width: 0; }
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1.5rem;
}
.nav { display: grid; gap: 0.5rem; margin-block: 1rem; }
.navLink, .link, .button { cursor: pointer; }
.navLink {
  display: block;
  padding: 0.75rem;
  color: var(--foreground);
  text-decoration: none;
  border-radius: 0.5rem;
}
.navLink:hover { background: var(--accent-soft); }
.navLink[aria-current="page"] {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  box-shadow: inset 3px 0 var(--accent);
}
.link { color: var(--accent); text-underline-offset: 0.2em; }
.link:hover { text-decoration-thickness: 2px; }
.navLink:active, .link:active { opacity: 0.8; }
.heading { margin: 0 0 0.75rem; font-size: clamp(1.5rem, 4vw, 2rem); }
.hint { color: var(--muted); line-height: 1.7; overflow-wrap: anywhere; }
.stack { display: grid; gap: 1.5rem; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.value { margin: 0.5rem 0; font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.stat { min-height: 9rem; }
.tableWrap { overflow-x: auto; max-width: 100%; scrollbar-gutter: stable; }
.table { width: 100%; min-width: 34rem; border-collapse: collapse; text-align: left; }
.table caption { text-align: left; padding-bottom: 0.75rem; color: var(--muted); }
.table th, .table td { padding: 0.9rem 0.75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
.table th { font-weight: 700; }
.table td { overflow-wrap: anywhere; max-width: 24rem; }
.state { min-height: 8rem; display: grid; align-content: center; gap: 0.5rem; }
.button {
  min-height: 2.75rem;
  min-width: 8rem;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  padding: 0.65rem 1rem;
  color: var(--foreground);
  background: var(--surface);
  font: inherit;
}
.button:hover:not(:disabled) { background: var(--accent-soft); }
.button:active:not(:disabled) { border-color: var(--accent); }
.button:disabled { opacity: 0.65; cursor: wait; }
.navLink:focus-visible, .link:focus-visible, .button:focus-visible,
.tableWrap:focus-visible, .content:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.skipLink {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-200vh);
  padding: 0.75rem;
  background: var(--surface);
  color: var(--foreground);
}
.skipLink:focus { transform: none; z-index: 10; outline: 3px solid var(--accent); }
@media (max-width: 760px) {
  .shell { grid-template-columns: minmax(0, 1fr); }
  .nav { display: flex; flex-wrap: wrap; }
  .stats { grid-template-columns: minmax(0, 1fr); }
}
```

解释：`minmax(0, 1fr)` 允许内容列缩小，长表格才不会把整个页面撑宽；横向滚动只属于表格容器。所有文字保留中文标签，手机上不隐藏重要操作。

样式没有额外动画，因此不需要靠动画等待信息；全局已有减少动态效果与滚动条规则，继续复用。

## 任务 2：导航和刷新按钮

新建 `components/admin/AdminNav.tsx`：

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

const links = [
  { href: "/admin", label: "概览" },
  { href: "/admin/tools", label: "工具预览" },
  { href: "/admin/projects", label: "项目预览" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="后台导航" className={styles.nav}>
      {links.map((item) => {
        // 概览只精确匹配，不能让每个后台页面都同时高亮概览。
        const active = item.href === "/admin"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={styles.navLink}
            aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

导航不是普通按钮：链接可以复制地址、开新标签、使用浏览器前进后退。

新建 `components/admin/RefreshButton.tsx`：

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" className={styles.button} disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}>
      {pending ? "正在刷新…" : "刷新数据"}
    </button>
  );
}
```

`router.refresh()` 重新请求当前路由的服务端结果，不等于写数据库，也不是所有缓存的万能失效命令。本课程没有给后台查询添加共享数据缓存；以后引入缓存时要一起设计失效策略。

## 任务 3：共享后台布局

新建 `app/admin/layout.tsx`：

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import RefreshButton from "@/components/admin/RefreshButton";
import LogoutButton from "@/components/LogoutButton";
import { requireAdmin } from "@/lib/auth/admin";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: { default: "管理后台 | MY SPACE", template: "%s | 管理后台" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className={styles.shell}>
      <a href="#admin-content" className={styles.skipLink}>跳到后台内容</a>
      <aside className={styles.sidebar}>
        <h2>管理后台</h2>
        <p className={styles.hint}>个人内容工作台</p>
        <AdminNav />
        <Link className={styles.link} href="/">返回公开网站</Link>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.hint}>当前账号：{user.email}</p>
            <RefreshButton />
          </div>
          <LogoutButton />
        </header>
        <main id="admin-content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

布局已经提供 `<main>`，后面的后台页面和后台错误组件使用 `<section>`，不要再嵌套第二个 `<main>`。

退出按钮从 Day 11 复用；不要改成 GET（读取请求）链接触发退出。不要把整个 `user` 或会话对象传给客户端导航，只在服务端呈现需要的邮箱文字。

## 任务 4：后台数据查询层

新建 `lib/admin-repository.ts`：

```ts
import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminMetric = {
  id: string;
  label: string;
  value: number | null;
};

export type AdminPreviewRow = {
  id: string;
  name: string;
  description: string;
  updated_at: string;
};

export type AdminPreviewResult = {
  rows: AdminPreviewRow[];
  total: number | null;
  error: string | null;
};

/** 查询入口自身鉴权，不能只假设父布局已经保护了请求。 */
export async function getAdminMetrics(): Promise<AdminMetric[]> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  // 三项独立读取并行执行；这不是数据库一致性快照。
  const [projects, tools, tags] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("tools").select("id", { count: "exact", head: true }),
    supabase.from("tags").select("id", { count: "exact", head: true }),
  ]);

  return [
    { id: "projects", label: "项目总数", value: projects.error ? null : projects.count },
    { id: "tools", label: "工具总数", value: tools.error ? null : tools.count },
    { id: "tags", label: "标签总数", value: tags.error ? null : tags.count },
  ];
}

/** 只允许两张指定业务表，返回最新 10 条，不提供任意表名查询入口。 */
export async function getAdminPreview(
  kind: "tools" | "projects",
): Promise<AdminPreviewResult> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from(kind)
    .select("id, name, description, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(10);

  if (error || !data || count === null) {
    return { rows: [], total: null, error: "暂时无法读取预览，请点击刷新数据重试。" };
  }

  return { rows: data, total: count, error: null };
}
```

逐项解释：

- `requireAdmin()` 必须在开始读取后台数据前执行；身份失败不能降级成匿名查询。
- `count: "exact"` 请求数据库精确计数，`head: true` 不返回所有记录正文，适合统计卡片。
- `Promise.all` 并发等待独立请求，避免依次串行等待；若某个查询以返回错误对象的方式失败，其他统计仍可呈现。
- `updated_at` 倒序表示最近更新，不是最近创建；第二排序键 `id` 让时间相同时顺序稳定。
- `.limit(10)` 避免无边界加载全部数据。本预览不是完整分页列表，界面必须明确数量范围。
- 预览 `total` 是数据库计数，不是 `rows.length`。
- 各次读取之间如果有并发写入，统计与预览可能短暂不完全同步，不应把概览当作财务对账式快照。

未来记录很多时，精确计数也会有成本；需要结合数据量设计索引、估算计数或汇总，而不是永久认为统计免费。[Supabase 查询与计数说明](https://supabase.com/docs/reference/javascript/select)

新建 `lib/format-admin-date.ts`：

```ts
/** 固定时区，避免本机和部署服务器使用不同时区导致显示不一致。 */
export function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}
```

数据库仍存真实时间点，格式化只决定显示，不修改存储值。界面注明北京时间。

## 任务 5：可复用统计与预览

新建 `components/admin/StatCard.tsx`：

```tsx
import type { AdminMetric } from "@/lib/admin-repository";
import styles from "@/app/admin/admin.module.css";

export default function StatCard({ label, value }: AdminMetric) {
  return (
    <article className={styles.stat}>
      <h2>{label}</h2>
      <p className={styles.value}>
        {value === null ? "—" : value.toLocaleString("zh-CN")}
      </p>
      {value === null && <p className={styles.hint}>暂不可用，请刷新重试。</p>}
    </article>
  );
}
```

卡片不是按钮，没有跳转行为就不加指针、悬停浮起或空链接。

新建 `components/admin/AdminPreview.tsx`：

```tsx
import type { AdminPreviewResult } from "@/lib/admin-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Props = {
  result: AdminPreviewResult;
  label: string;
};

export default function AdminPreview({ result, label }: Props) {
  if (result.error) {
    return <div className={styles.state} role="status"><p>{result.error}</p></div>;
  }
  if (result.rows.length === 0) {
    return (
      <div className={styles.state}>
        <p>暂时没有{label}。</p>
        <p className={styles.hint}>本页只读，后续课程会加入新增功能。</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={`${label}数据预览，可横向滚动`}>
      <table className={styles.table}>
        <caption>
          当前显示 {result.rows.length} 条，共 {result.total} 条；最多预览 10 条，按最近更新排序。
        </caption>
        <thead>
          <tr>
            <th scope="col">名称</th>
            <th scope="col">简介</th>
            <th scope="col">更新时间（北京时间）</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              <td>{row.description}</td>
              <td>{formatAdminDate(row.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

这是服务端展示组件，不需要 `useState`。`import type` 只导入类型，构建后会消除；不要误把服务端查询函数导入客户端组件。

表头没有排序交互，所以不伪装成可点击按钮；今天排序固定。以后增加用户可控排序时，再使用真正的按钮、可访问状态和 URL（网址）查询参数。

## 任务 6：完成三个真实路由

### 6.1 概览

替换 `app/admin/page.tsx`。注意退出与用户信息已经移动到布局，不在页面重复显示。

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import AdminPreview from "@/components/admin/AdminPreview";
import { getAdminMetrics, getAdminPreview } from "@/lib/admin-repository";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "概览" };

export default async function AdminPage() {
  // 两个查询函数都带管理员验证，不依赖布局执行时序。
  const [metrics, tools] = await Promise.all([
    getAdminMetrics(), getAdminPreview("tools"),
  ]);

  return (
    <section className={styles.stack} aria-labelledby="overview-title">
      <header>
        <h1 className={styles.heading} id="overview-title">内容概览</h1>
        <p className={styles.hint}>查看当前内容数量与最近更新。今天仅开放只读预览。</p>
      </header>
      <div className={styles.stats}>
        {metrics.map((metric) => <StatCard key={metric.id} {...metric} />)}
      </div>
      <section className={styles.panel} aria-labelledby="recent-tools-title">
        <h2 id="recent-tools-title">最近更新的工具</h2>
        <AdminPreview result={tools} label="工具" />
        <p><Link className={styles.link} href="/admin/tools">前往工具预览</Link></p>
      </section>
    </section>
  );
}
```

布局与查询层可能各检查一次身份，是为了把责任放在安全边界上。当前数据量下先保证正确，后续如需优化，可以研究请求内去重；不要用跨用户全局缓存保存身份。

### 6.2 工具预览

新建 `app/admin/tools/page.tsx`：

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import AdminPreview from "@/components/admin/AdminPreview";
import { getAdminPreview } from "@/lib/admin-repository";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "工具预览" };

export default async function AdminToolsPage() {
  const result = await getAdminPreview("tools");
  return (
    <section className={styles.panel} aria-labelledby="tools-title">
      <h1 className={styles.heading} id="tools-title">工具预览</h1>
      <p className={styles.hint}>查看数据库最新 10 条记录。Day 13 再加入分页与增删改。</p>
      <AdminPreview result={result} label="工具" />
      <p><Link className={styles.link} href="/tools">查看公开工具页</Link></p>
    </section>
  );
}
```

### 6.3 项目预览

新建 `app/admin/projects/page.tsx`：

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import AdminPreview from "@/components/admin/AdminPreview";
import { getAdminPreview } from "@/lib/admin-repository";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "项目预览" };

export default async function AdminProjectsPage() {
  const result = await getAdminPreview("projects");
  return (
    <section className={styles.panel} aria-labelledby="projects-title">
      <h1 className={styles.heading} id="projects-title">项目预览</h1>
      <p className={styles.hint}>这里读取云端项目表。公开项目页目前仍使用静态数据，后续再统一接入。</p>
      <AdminPreview result={result} label="项目" />
      <p><Link className={styles.link} href="/projects">查看公开项目页</Link></p>
    </section>
  );
}
```

这两个页面都是能真正访问的只读路由，不是点了就 404 的占位链接。公开项目页与后台项目预览的数据源暂时不同，要明确说明，不能把这种差异隐藏起来。

## 任务 7：加载与错误处理

新建 `app/admin/loading.tsx`：

```tsx
import styles from "./admin.module.css";

export default function AdminLoading() {
  return (
    <section className={`${styles.panel} ${styles.state}`} role="status" aria-live="polite">
      <p>正在读取后台数据…</p>
      <p className={styles.hint}>请稍候，导航会在可用时保持显示。</p>
    </section>
  );
}
```

没有真实进度就不显示假百分比。加载界面只显示通用文字，不包含未授权的内容。

替换 `app/admin/error.tsx`，不再复用返回 `<main>` 的登录错误组件，避免嵌套主内容区域：

```tsx
"use client";

import Link from "next/link";
import styles from "./admin.module.css";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className={`${styles.panel} ${styles.state}`}>
      <h1 className={styles.heading}>后台内容暂时无法加载</h1>
      <p>请重试；如果持续失败，检查登录状态、网络和服务端终端。</p>
      <button type="button" className={styles.button} onClick={() => reset()}>重新加载</button>
      <Link className={styles.link} href="/">返回公开网站</Link>
    </section>
  );
}
```

边界知识：此 `error.tsx` 处理子页面相关错误，不保证捕获同层 `layout.tsx` 的所有异常，也不捕获发生在 Proxy 的错误。布局身份检查失败若不是跳转而是异常，需要更上层边界处理；今天先如实保留这个限制。

页面查不到数据不应被包装成“数据库故障”；只有查询返回错误时才显示失败状态。

## 六、文件变更清单

```text
新增：
app/admin/layout.tsx
app/admin/admin.module.css
app/admin/loading.tsx
app/admin/tools/page.tsx
app/admin/projects/page.tsx
components/admin/AdminNav.tsx
components/admin/RefreshButton.tsx
components/admin/StatCard.tsx
components/admin/AdminPreview.tsx
lib/admin-repository.ts
lib/format-admin-date.ts

修改：
app/admin/page.tsx
app/admin/error.tsx

不需要修改：
app/layout.tsx、公开页面、登录操作、Supabase 密钥、数据库迁移和 RLS
```

`proxy.ts` 已匹配 `/admin/:path*`，因此今天两个子页面在覆盖范围内，不需要重复添加 Proxy。

## 七、必须理解的安全边界

1. 布局鉴权保护共享账号区；查询层鉴权保护实际读取入口。
2. 公开业务表目前仍允许匿名读取，但后台将来可能包含私有数据，必须从现在开始明确后台查询边界。
3. 顶部账号邮箱只在管理员验证之后展示，不向公开导航传递完整用户对象。
4. 不缓存跨用户身份，不使用 Service Role Key 绕过数据库策略。
5. 今天没有写入操作，绝不能为了“准备后续功能”提前写 `for all using (true)`。
6. 隐藏后台链接、设置 noindex（不索引）都不是权限保护。

## 八、验收：看起来对还不够

### 1. 数据检查

若未修改初始数据，预期：项目 3、工具 6、标签 24。但这是对当前种子数据的预期，不是应该写死在页面里的数字。

在控制台只读核对实际行数；不要通过重新 Seed 覆盖数据来强行匹配数字。

- 工具预览显示当前 6 条，说明“最多 10 条”；
- 项目预览显示当前 3 条；
- 名称、简介、更新时间来自数据库；
- 时间按北京时间显示；
- 同一更新时间下顺序稳定。

### 2. 导航和权限

- 未登录分别直接打开 `/admin`、`/admin/tools`、`/admin/projects`，都应被拒绝。
- 管理员能访问三页，刷新不丢失正确路由。
- 当前导航只高亮一个条目，概览不会在所有子页都高亮。
- 浏览器前进、后退与手动输入路径可用。
- 退出后重新输入后台地址，不能看到后台内容。
- 退出后 `/tools` 仍公开可读。

### 3. 空数据、失败和长内容

不要删除真实云端数据来测试空页面。可以在本地临时用纯展示夹具调用 `AdminPreview`，验证后恢复：

```tsx
<>
  <AdminPreview label="工具" result={{ rows: [], total: 0, error: null }} />
  <AdminPreview label="工具" result={{ rows: [], total: null, error: "暂时无法读取预览，请刷新重试。" }} />
</>
```

这些是可选本地展示测试，不要替代最终真实查询，也不要绕过页面权限检查。最终交付前必须删除测试夹具调用。

统计失败的测试可临时给单个 `StatCard` 传入 `value: null`，预期显示“暂不可用”，其他卡片保持正常；数值 `0` 则必须显示数字 0。

### 4. 交互与窄屏

- 390px 下侧栏转为顶部导航，页面整体不横向溢出；
- 表格需要时在自己的区域横向滚动，字段不被静默隐藏；
- Tab 可以走过导航、刷新、退出、表格滚动区和链接；
- “跳到后台内容”链接能帮助跳过重复导航；
- 刷新等待时按钮不可重复触发，宽度不明显跳动；
- 长邮箱、长工具名、长简介不会把布局撑坏；
- 不存在无功能按钮、空链接或虚构统计。

### 5. 工程检查

在项目终端依次运行：

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

- lint：检查代码规范；
- `tsc --noEmit`：检查类型、不输出 JavaScript，可能更新类型缓存；
- build：创建 `.next` 生产产物，预期正常结束并列出路由。

构建会写生成目录，不修改 Supabase 数据。如果卡住或失败，保留终端输出，不要把“命令启动了”当作构建通过。

## 九、常见错误

### 后台有两个退出按钮或两份账号信息

旧 `app/admin/page.tsx` 中的内容没有移走。共享内容归布局，每个页面只显示自己的主体。

### /admin/tools 高亮了两个导航

概览使用了宽泛 `startsWith('/admin')`。概览必须精确匹配。

### 页面报 server-only 导入错误

把查询层导入了客户端组件。让服务端页面查询，把普通结果传入展示组件；客户端只保留路径与按钮交互。

### 手机页面整体横向滚动

检查 Grid（网格）内容列是否可缩小、是否有 `min-width: 0`、表格滚动容器是否在正确位置。不要给 body 设置隐藏溢出来遮住问题。

### 查询出错但显示 0

不要对失败结果无条件 `?? 0`。成功的 0 与无法取得值的 null 必须区分。

### 所有更新时间都相同

初始 Seed 在同一事务写入时可能相同；这不是排序错误。使用 ID 作为第二排序键以稳定结果。

### 为什么概览没显示增删改按钮

因为对应功能与数据库授权尚未实现。真实可用入口比假按钮更重要。

### 后台项目与公开项目页内容不一致

数据源暂时不同：后台读取云端，公开项目页仍有本地静态数组。Day 14 会统一，不要偷偷手改两份内容维持表面一致。

## 十、自测题

1. Day 11 与 Day 12 的主要区别是什么？
2. 为什么侧边栏应该放在布局，而不是复制到每一页？
3. 只在布局调用 requireAdmin 是否足够？
4. 为什么 AdminNav 需要客户端组件，而统计页不需要？
5. 数据库总数为什么不能直接用预览数组长度？
6. count: exact 与 head: true 各做什么？
7. 为什么统计失败使用 null，而不是 0？
8. Promise.all 是否保证数据库一致性快照？
9. 为什么更新时间之外还要按 ID 排序？
10. 手机端为什么让表格局部滚动，而不是隐藏整页溢出？
11. router.refresh 是否会修改数据库？
12. 今天为什么不需要新迁移？
13. 为什么工具预览和项目预览共用一个展示组件？
14. 后台登录成功是否意味着能写数据库？
15. 为什么无功能按钮和假增长图不该出现在后台？
16. error.tsx 是否能捕获所有 Proxy 和布局错误？

## 十一、自测题标准答案

1. Day 11 解决身份、会话与管理员授权；Day 12 组织后台导航与只读内容概览。
2. 布局让共享导航、账号与退出操作保持一致，避免多份代码漂移。
3. 不足够。布局可能复用、数据读取可能并行，每个后台数据入口也应验证权限。
4. 导航要读取浏览器当前路径；统计可以在服务端查询后直接渲染。
5. 预览有上限，数组长度只能表示当前返回多少行，不能代表全表数量。
6. exact 请求精确计数；head 不返回记录正文，适合只取数量。
7. 0 表示查询成功且没有记录；null 表示未取得可靠结果，应该显示不可用。
8. 不保证。它只并发等待独立请求，不是数据库事务快照。
9. 多条记录可能在同一时间更新，第二排序键让结果顺序稳定。
10. 局部滚动保留完整数据和键盘访问，隐藏整页溢出只是遮住布局问题。
11. 不会，它重新请求当前路由结果；如果以后有数据缓存，还需另外设计失效。
12. 只读已有表，没有新增表、字段或策略，也没有开放写权限。
13. 统一数量提示、空状态、错误处理、表格语义和时间格式，减少重复。
14. 不意味着。服务器后台授权与数据库 RLS 写授权是不同层次。
15. 它们误导用户对真实能力和数据的判断，后台必须诚实呈现状态。
16. 不能。同层布局和 Proxy 有不同执行边界，需要对应层次的错误处理。

## 十二、当天完成清单

- [ ] 已补充或如实记录 Day 11 未完成的验证。
- [ ] 后台布局复用现有账号与退出逻辑。
- [ ] 三个后台路由真实可访问且有各自页面标题。
- [ ] 每个后台查询入口在读数据前验证管理员。
- [ ] 概览总数来自数据库，没有写死数字。
- [ ] 统计失败和数值 0 显示不同。
- [ ] 预览最多 10 行，明确说明总数与当前显示数量。
- [ ] 无数据和错误状态已用安全本地夹具验证并恢复真实查询。
- [ ] 手机布局、长文本和键盘访问通过。
- [ ] 加载和错误组件没有重复嵌套 main。
- [ ] 公开页面和登录行为没有退化。
- [ ] 没有新增数据库写权限，没有使用高级私密密钥。
- [ ] lint、类型检查、生产构建均有实际结果。
- [ ] 自测题已核对答案。

完成后回复：

```text
Day 12 完成，请检查。
统计：项目 X、工具 X、标签 X。
匿名拒绝 / 子路由访问 / 退出 / 手机布局 / 构建：实际结果……
Day 11 待补验证：实际结果……
```

不要发密码、Cookie 值、访问令牌或 `.env.local` 内容。

## 十三、参考资料与复习

- [Next.js：布局与页面](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Next.js：服务端与客户端组件](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js：错误处理](https://nextjs.org/docs/app/getting-started/error-handling)
- [Supabase：查询与计数](https://supabase.com/docs/reference/javascript/select)
- [Next.js 基础教材](./nextjs-beginner-guide.md)
- [Supabase 基础教材](./supabase-beginner-guide.md)

## 一句话总结

后台不是多画几张卡片，而是通过共享布局、独立授权、真实查询和清楚的状态，让管理员可靠地理解当前内容并进入下一步工作。
