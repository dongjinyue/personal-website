# Day 7：Project Detail（项目详情）与 Dynamic Route（动态路由）

状态：已完成

## 一、今天最终要完成什么

今天要把 Projects 列表真正接到项目详情页。

最终访问效果：

```text
/projects
  ↓ 点击“查看详情”
/projects/personal-website
  ↓ 根据 slug 查找数据
显示 Personal Website 的完整详情
```

如果用户输入不存在的地址：

```text
/projects/not-a-real-project
  ↓ 找不到对应项目
显示 404 页面，而不是空白页或程序报错
```

今天会完成以下内容：

1. 扩展项目详情数据；
2. 建立 `[slug]` 动态路由；
3. 根据 URL 中的 slug 查找项目；
4. 使用 `notFound()` 处理不存在的项目；
5. 使用 `generateStaticParams()` 声明已知项目路径；
6. 使用 `generateMetadata()` 生成独立页面标题；
7. 抽取共享的状态文案映射；
8. 在卡片中加入真实可用的“查看详情”链接；
9. 完成桌面端、手机端和 404 验收。

## 二、今天必须理解的核心概念

完成 Day 7 后，你应该能够解释：

1. Static Route（静态路由）和 Dynamic Route（动态路由）的区别；
2. `[slug]` 文件夹为什么能匹配多个 URL；
3. slug 和数据库 id 的职责差异；
4. Next.js 16 中为什么要 `await params`；
5. 为什么 URL 参数永远需要运行时校验；
6. `notFound()` 和普通 `return` 的区别；
7. `generateStaticParams()` 做了什么、没做什么；
8. `generateMetadata()` 为什么适合详情页；
9. 内部导航为什么使用 `Link`；
10. 为什么状态显示文案应该有一个共享来源。

## 三、先理解：什么是动态路由

普通静态路由的文件夹名是固定的：

```text
app/projects/page.tsx → /projects
app/tools/page.tsx    → /tools
```

如果每个项目都手写一份页面：

```text
app/projects/personal-website/page.tsx
app/projects/ai-workspace-agent/page.tsx
app/projects/learning-playground/page.tsx
```

虽然能工作，但项目越多，重复页面越多。

动态路由只需要一个模板：

```text
app/projects/[slug]/page.tsx
```

它可以匹配：

```text
/projects/personal-website
/projects/ai-workspace-agent
/projects/learning-playground
```

方括号 `[slug]` 的意思是：这一段不是固定文字，而是一个变量。

## 四、slug 是什么

以这个 URL 为例：

```text
/projects/personal-website
```

其中：

```text
projects          → 固定路由段
personal-website  → slug 动态路由段
```

slug 通常是适合放进 URL 的稳定字符串：

```ts
slug: "personal-website"
```

它通常具有这些特点：

- 使用小写英文；
- 单词用连字符 `-` 分隔；
- 不使用空格；
- 尽量简短、可读、稳定；
- 在所有项目中唯一。

### slug 和 id 有什么区别

当前数据里 id 和 slug 恰好相同，但职责不同：

| 字段 | 主要用途 | 是否面向用户 |
| --- | --- | --- |
| `id` | 程序或数据库识别一条记录 | 通常不是 |
| `slug` | 组成可读 URL | 是 |

以后数据库 id 可能变成随机字符串，slug 仍可以保持：

```ts
id: "cm123xyz"
slug: "personal-website"
```

不要因为现在两者相同，就认为它们永远是同一个概念。

## 五、Next.js 16 中的 params

动态页面会收到 `params`：

```ts
type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};
```

注意 `params` 是 Promise（异步结果），所以页面必须使用 `async` 和 `await`：

```tsx
export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;
}
```

这是当前项目所用 Next.js 16 的写法。不要照搬旧教程中的同步写法：

```ts
// 旧教程常见写法，不用于当前项目
const slug = params.slug;
```

### Promise 是什么

Promise 表示“这个值可能需要等待后才能取得”。`await` 会等待结果完成，再读取其中的 slug。

执行顺序：

```text
Next.js 解析 URL
↓
生成 params Promise
↓
await params
↓
得到 { slug: "personal-website" }
```

## 六、为什么必须校验 URL 参数

TypeScript 只能告诉你 slug 是字符串：

```ts
slug: string
```

它不能保证字符串一定对应真实项目。用户可以在地址栏输入任何内容：

```text
/projects/abc
/projects/123
/projects/not-exist
```

因此需要运行时查找：

```ts
const project = projects.find((item) => item.slug === slug);
```

`find()` 的返回类型是：

```text
Project | undefined
```

含义是：

```text
找到     → 返回 Project
没有找到 → 返回 undefined
```

## 七、使用 notFound() 处理不存在的数据

导入：

```ts
import { notFound } from "next/navigation";
```

检查项目：

```ts
if (!project) {
  notFound();
}
```

`notFound()` 会停止当前路由渲染，并让 Next.js 显示最近的 `not-found.tsx`。

为什么不能只写：

```tsx
if (!project) {
  return <p>没有项目</p>;
}
```

因为这仍可能返回正常页面状态。404 表达的是“这个地址对应的资源不存在”，语义更准确，也方便浏览器和搜索引擎理解。

## 八、generateStaticParams() 是什么

当前项目数据在本地文件中，而且 slug 都已知，可以导出：

```ts
export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}
```

返回结果类似：

```ts
[
  { slug: "ai-workspace-agent" },
  { slug: "personal-website" },
  { slug: "learning-playground" },
]
```

它告诉 Next.js 构建阶段有哪些已知动态参数，可以预先生成相应页面。

### 它不能替代 notFound()

即使声明了三个合法 slug，用户仍能请求其他 URL。因此：

```text
generateStaticParams → 列出已知页面
notFound             → 防守无效输入
```

两者解决的问题不同。

## 九、generateMetadata() 是什么

如果所有详情页都使用同一个标题，浏览器标签页难以区分。动态 Metadata（页面元数据）可以根据项目生成标题和描述：

```tsx
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    return { title: "项目不存在" };
  }

  return {
    title: `${project.name} | 我的项目`,
    description: project.description,
  };
}
```

页面标题将变成：

```text
Personal Website | 我的项目
```

Metadata（页面元数据）不仅影响浏览器标签页，也能帮助搜索引擎和分享预览理解页面。

## 十、Day 7 的数据设计

列表页只需要简短简介，详情页需要更多内容。给 `Project` 增加：

```ts
longDescription: string;
highlights: string[];
```

职责：

```text
description     → 列表卡片的一两句话
longDescription → 详情页的完整说明
highlights      → 项目的主要能力或成果列表
```

为什么不把详情内容直接写死在 `page.tsx`？

因为页面应该负责“如何展示”，数据文件负责“展示什么”。这样以后增加项目只需增加数据，不需复制页面结构。

## 十一、共享状态文案

Day 6 的状态映射写在 `ProjectCard.tsx` 中：

```ts
const statusLabels = { ... };
```

Day 7 的详情页也需要显示状态。如果复制一份映射，以后可能出现：

```text
卡片：开发中
详情：正在制作
```

除非这是明确设计，否则属于跨页面不一致。

新建：

```text
lib/project-status.ts
```

内容：

```ts
import type { ProjectStatus } from "@/data/projects";

/**
 * 项目状态的统一中文文案。
 * 卡片和详情页共同使用，避免同一状态出现不同叫法。
 */
export const projectStatusLabels: Record<ProjectStatus, string> = {
  building: "开发中",
  completed: "已完成",
  paused: "已暂停",
};
```

这体现 Single Source of Truth（单一事实来源）：同一种信息只维护一个权威版本。

## 十二、今天的目录结构

完成后相关文件应是：

```text
personal-website/
├── app/
│   └── projects/
│       ├── [slug]/
│       │   ├── page.tsx
│       │   └── page.module.css
│       └── page.tsx
├── components/
│   ├── ProjectCard.tsx
│   └── Card.module.css
├── data/
│   └── projects.ts
└── lib/
    └── project-status.ts
```

路由关系：

```text
app/projects/page.tsx        → /projects
app/projects/[slug]/page.tsx → /projects/任意slug
```

## 十三、Day 7 完整任务

下面是今天的全部任务。先通读一遍，再从任务 1 开始逐步实现。

### 任务 1：扩展 Project 类型

在 `data/projects.ts` 的 `Project` 中加入：

```ts
longDescription: string;
highlights: string[];
```

为每个项目补齐数据，例如：

```ts
longDescription:
  "这是一个用于长期管理个人项目、常用工具与学习内容的网站。项目也作为我的 Next.js 和 TypeScript 学习实践。",
highlights: [
  "使用 App Router 组织页面与路由",
  "使用 TypeScript 建立项目和工具数据模型",
  "通过响应式布局适配桌面与手机设备",
],
```

另外两个项目也要写符合真实情况的内容，不要全部复制同一段文字。

验收：每个项目都有非空 `longDescription`，且 `highlights` 至少有 2 条。

### 任务 2：抽取状态映射

新建 `lib/project-status.ts`，写入前面给出的 `projectStatusLabels`。

在 `ProjectCard.tsx` 中：

1. 删除组件内部的 `statusLabels`；
2. 导入共享映射；
3. 把 `statusLabels[status]` 改成 `projectStatusLabels[status]`。

验收：首页与 Projects 页面的状态显示不能发生变化。

### 任务 3：让卡片支持详情链接

在 `ProjectCard.tsx` 导入：

```ts
import Link from "next/link";
```

Props 增加：

```ts
slug?: string;
```

解构 Props 时也加入 `slug`。

将操作区域的条件改成：

```tsx
{(slug || githubUrl || projectUrl) && (
  <div className={styles.actions}>
    {slug && (
      <Link className={styles.action} href={`/projects/${slug}`}>
        查看详情
      </Link>
    )}

    {/* 保留已有 GitHub 和打开项目链接 */}
  </div>
)}
```

注意：

- “查看详情”是站内导航，使用 Next.js 的 `Link`；
- GitHub 和项目地址是站外链接，继续使用 `<a>`；
- 站内链接不需要 `target="_blank"`；
- 不要把整个卡片包进 Link，因为卡片内还有其他不同目标的链接。

### 任务 4：在列表页传入 slug

修改 `app/projects/page.tsx`：

```tsx
<ProjectCard
  key={project.id}
  slug={project.slug}
  title={project.name}
  {/* 其他 Props 保持不变 */}
/>
```

此时链接已经生成，但详情页面还未建立。完成后立即继续任务 5，不要停在临时 404 状态。

### 任务 5：建立动态详情页面

创建：

```text
app/projects/[slug]/page.tsx
```

先写最小可运行版本：

```tsx
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <main>
      <h1>{project.name}</h1>
      <p>{project.longDescription}</p>
    </main>
  );
}
```

先访问三个合法地址，确认标题和说明正确，再继续增加完整结构。

### 任务 6：添加静态参数

在同一个 `page.tsx` 中加入：

```ts
export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}
```

它是命名导出，不是默认导出。

### 任务 7：添加动态 Metadata

导入：

```ts
import type { Metadata } from "next";
```

加入前面第九节给出的 `generateMetadata()`。

注意：`generateMetadata()` 和页面函数都需要读取 params，因此两处都要 `await params`。这不是错误，也不需要把结果放进全局变量。

### 任务 8：完成详情页语义结构

详情页面建议结构：

```tsx
<main className={styles.page}>
  <Link className={styles.backLink} href="/projects">
    ← 返回项目列表
  </Link>

  <article className={styles.project}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>PROJECT DETAIL</p>
      <p className={styles.status}>
        {projectStatusLabels[project.status]}
      </p>
      <h1>{project.name}</h1>
      <p className={styles.lead}>{project.longDescription}</p>
    </header>

    <section className={styles.section} aria-labelledby="highlights-title">
      <h2 id="highlights-title">项目亮点</h2>
      <ul className={styles.highlights}>
        {project.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
    </section>

    <section className={styles.section} aria-labelledby="stack-title">
      <h2 id="stack-title">相关技术与能力</h2>
      <ul className={styles.tags} aria-label="项目标签">
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </section>

    {(project.githubUrl || project.projectUrl) && (
      <nav className={styles.actions} aria-label="项目外部链接">
        {/* 根据真实地址条件渲染外部链接 */}
      </nav>
    )}
  </article>
</main>
```

语义说明：

- `main`：本页主要内容；
- `article`：一个可以独立理解的项目详情；
- `header`：项目详情的开头信息；
- `section`：各自有标题的内容分区；
- `nav`：一组用于导航到外部资源的链接；
- `ul/li`：亮点和标签都是列表。

### 任务 9：添加详情页样式

创建：

```text
app/projects/[slug]/page.module.css
```

设计原则：详情页属于现有个人网站，不重新发明一套颜色和按钮。

必须完成：

- `.page` 使用与 Projects 列表页相同的内容宽度变量；
- `.backLink` 有 hover 和 `focus-visible`；
- `.header h1` 沿用现有衬线标题风格；
- `.lead` 控制行宽和行高，避免长文本铺满屏幕；
- `.project`、`.section` 使用现有 `--line`、`--surface` 等变量；
- `.highlights` 有清楚的列表层次；
- `.tags` 使用 Flexbox 并允许换行；
- `.actions` 中外部链接有明确焦点样式；
- 600px 以下减小左右间距；
- 不得出现横向滚动。

可以从这个骨架开始：

```css
.page {
  width: min(var(--content-width), calc(100% - 48px));
  margin: 0 auto;
  padding: clamp(64px, 9vw, 104px) 0 112px;
}

.backLink {
  display: inline-flex;
  color: var(--accent);
  font-weight: 700;
  text-underline-offset: 4px;
}

.backLink:focus-visible,
.action:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 38%, transparent);
  outline-offset: 4px;
  border-radius: 3px;
}

.project {
  margin-top: 36px;
}

.header {
  max-width: 780px;
}

.header h1 {
  margin: 14px 0 0;
  font-family: "Noto Serif SC", "Songti SC", STSong, serif;
  font-size: clamp(2.7rem, 6vw, 5rem);
  line-height: 1.08;
  overflow-wrap: anywhere;
}

.lead {
  max-width: 720px;
  margin: 24px 0 0;
  color: var(--muted);
  font-size: 1.06rem;
  line-height: 1.9;
}

.section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--line);
}

.tags,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 600px) {
  .page {
    width: min(100% - 28px, var(--content-width));
    padding-bottom: 80px;
  }
}
```

这只是结构骨架。你仍需补全 `.eyebrow`、`.status`、`.highlights`、`.tags li`、`.actions` 和 `.action`。

### 任务 10：决定首页是否增加详情入口

推荐给首页精选项目也传入 slug：

```tsx
<ProjectCard
  key={project.id}
  slug={project.slug}
  title={project.name}
  description={project.description}
  headingLevel="h3"
/>
```

这样首页仍然不显示状态、标签、封面和外部链接，只增加一个真实的详情入口。

但是要检查 `showsDetails`：如果 slug 也应该让操作区出现，需要把它纳入判断：

```ts
const showsDetails = Boolean(
  slug || status || tags?.length || coverImage || projectUrl || githubUrl,
);
```

这里会带来一个设计问题：加入 slug 后首页可能同时出现封面 Fallback。若你希望首页仍无封面，应把“显示封面”和“显示操作”的条件拆开：

```ts
const showsCover = Boolean(
  status || tags?.length || coverImage || projectUrl || githubUrl,
);
```

封面使用 `showsCover`，操作区单独判断 `slug || githubUrl || projectUrl`。

这是今天一个重要练习：一个 Boolean（布尔值）不应该同时承担两个不同的业务含义。

### 任务 11：测试 404

手动访问：

```text
http://localhost:3000/projects/this-project-does-not-exist
```

预期：

- 显示 404；
- 不出现红色开发错误覆盖层；
- 控制台没有未处理异常；
- 不能渲染一个标题为空的详情模板。

Day 7 先使用 Next.js 默认 404 即可。自定义 404 页面可以以后单独学习。

### 任务 12：运行代码检查

```powershell
npm run lint
```

作用：检查代码风格和常见错误。

```powershell
npx tsc --noEmit
```

作用：执行 TypeScript 类型检查，但不生成 JavaScript 文件。重点检查 `params`、`Project` 新字段和 ProjectCard Props。

```powershell
npm run build
```

作用：执行 Production Build（生产环境构建）。构建输出中应能看到项目详情动态路由。

## 十四、推荐实现顺序

请严格按下面顺序做，遇到错误更容易定位：

```text
1. 扩展 projects 数据
↓
2. 抽取状态映射
↓
3. ProjectCard 增加 slug 和 Link
↓
4. Projects 页面传入 slug
↓
5. 创建 [slug]/page.tsx 最小版本
↓
6. 测试三个合法详情地址
↓
7. 添加 generateStaticParams
↓
8. 添加 generateMetadata
↓
9. 完成详情页结构与 CSS
↓
10. 测试不存在的 slug
↓
11. 测试首页、列表页、详情页和手机端
↓
12. 执行 lint、类型检查和构建
```

## 十五、浏览器验收标准

### Projects 列表页

- 3 张卡片都有“查看详情”；
- 点击后进入各自正确的 URL；
- GitHub 链接仍然可用；
- 站内详情链接不打开新标签页；
- 站外链接仍打开新标签页。

### 详情页

- 三个 slug 分别显示正确项目；
- 页面只有一个 `h1`；
- 状态中文与卡片一致；
- 长说明、亮点和标签来自数据文件；
- 可选链接只在地址存在时显示；
- 返回项目列表链接可用；
- 浏览器标签标题包含项目名称；
- Tab 键可以访问全部链接；
- 焦点轮廓清楚可见。

### 异常与响应式

- 无效 slug 显示 404；
- 390px 宽度无横向滚动；
- 长标题和长标签不会撑破容器；
- 浏览器控制台没有错误；
- 首页没有因为新 Props 意外变成完整项目卡片。

## 十六、常见错误与原因

### 1. 把文件夹写成 `slug`

错误：

```text
app/projects/slug/page.tsx
```

这只会匹配固定地址 `/projects/slug`。动态路由必须使用方括号：

```text
app/projects/[slug]/page.tsx
```

### 2. 忘记 await params

当前 Next.js 16 的 params 是 Promise。页面函数需要 `async`，读取时需要 `await params`。

### 3. 使用 filter() 查找一个项目

`filter()` 返回数组，`find()` 返回第一条匹配记录。详情页只需要一个项目，因此使用 `find()`。

### 4. project 可能是 undefined 却直接使用

应先执行 `notFound()`。完成判断后，TypeScript 才知道后面的 project 一定存在。

### 5. 认为 generateStaticParams 会自动处理所有无效地址

它声明已知参数，不等于运行时数据校验。仍然需要 `find()` 和 `notFound()`。

### 6. 用 `<a href="/projects/...">` 做内部导航

它通常会导致完整页面刷新。站内 Next.js 页面之间优先使用 `Link`，获得客户端导航和预加载能力。

### 7. 给内部 Link 加 target="_blank"

普通站内详情导航应该在当前标签页进行。新标签页会打断正常浏览流程。

### 8. 在卡片和详情页复制状态映射

这会产生两个维护点。应该抽到共享模块。

### 9. 把所有链接条件合并错误

项目没有 GitHub 时不能渲染空 `href`。每个可选链接都要单独判断。

### 10. 用数组下标作为亮点 key

如果列表内容本身在同一项目中唯一，优先使用 `highlight`，比下标更稳定。

### 11. 为详情页重新创建一套颜色

详情页是现有网站的一部分，应复用 CSS Variables（CSS 变量），保持跨页面一致。

### 12. 一个 showsDetails 控制了不相关的界面

“是否显示封面”和“是否显示操作”是两个不同问题。条件含义开始分叉时，应拆成两个命名清晰的布尔值。

## 十七、自测题

先不看答案，尝试用自己的话回答：

1. 什么是动态路由？
2. `[slug]` 中的方括号表示什么？
3. slug 和 id 的职责有什么不同？
4. 为什么 Next.js 16 中需要 `await params`？
5. 为什么 `slug: string` 仍不能保证项目存在？
6. `find()` 找不到数据时返回什么？
7. `notFound()` 解决什么问题？
8. `generateStaticParams()` 返回什么结构？
9. 为什么使用了 `generateStaticParams()` 仍需要 `notFound()`？
10. `generateMetadata()` 在详情页有什么作用？
11. 为什么内部详情链接使用 Link，GitHub 使用 a？
12. 为什么要抽取 `projectStatusLabels`？
13. 为什么项目简介要分成 description 和 longDescription？
14. 为什么不能用一个含义模糊的 showsDetails 控制所有附加内容？
15. 合法 slug 与无效 slug 的完整处理流程分别是什么？

## 十八、自测题标准答案

### 1. 什么是动态路由？

标准答案：动态路由使用一个带变量的页面模板匹配多个不同 URL，并根据 URL 参数加载相应数据。例如一个 `[slug]` 页面可以显示多个项目详情。

判断关键词：一个模板、多个 URL、根据参数加载数据。

### 2. 方括号表示什么？

标准答案：方括号表示这一段是动态参数而不是固定路径。`[slug]` 会把对应 URL 段作为 `params.slug` 传给页面。

判断关键词：动态参数、URL 段、params.slug。

### 3. slug 和 id 有什么不同？

标准答案：id 主要供程序或数据库唯一识别记录，slug 主要构成面向用户的可读 URL。两者可以相同，但职责不同。

判断关键词：内部识别、可读 URL、职责不同。

### 4. 为什么 await params？

标准答案：在当前 Next.js 16 中，params 是 Promise，需要页面使用 async，并通过 await 等待后才能读取 slug。

判断关键词：Next.js 16、Promise、async/await。

### 5. 为什么字符串类型不能保证项目存在？

标准答案：TypeScript 只约束 slug 是字符串，但用户能输入任意字符串。数据是否存在必须在程序运行时通过查找来确认。

判断关键词：类型只保证字符串、任意输入、运行时查找。

### 6. find() 找不到时返回什么？

标准答案：返回 `undefined`，因此结果类型是 `Project | undefined`，使用项目前必须处理找不到的情况。

判断关键词：undefined、联合结果、先处理。

### 7. notFound() 做什么？

标准答案：它停止当前路由继续渲染，并让 Next.js 显示对应的 404 界面，准确表达该 URL 的资源不存在。

判断关键词：停止渲染、404、资源不存在。

### 8. generateStaticParams() 返回什么？

标准答案：返回动态参数对象组成的数组，例如 `[{ slug: "personal-website" }]`，让 Next.js 知道构建时有哪些已知动态路径。

判断关键词：对象数组、slug、已知路径。

### 9. 为什么仍需要 notFound()？

标准答案：generateStaticParams 负责列出已知参数，不能阻止用户请求其他地址；notFound 负责运行时处理不存在的数据。

判断关键词：构建时列举、运行时防守、职责不同。

### 10. generateMetadata() 有什么作用？

标准答案：它根据当前项目动态生成页面标题和描述，让浏览器标签、搜索引擎和分享预览获得正确的详情页信息。

判断关键词：动态标题、描述、搜索与分享。

### 11. 为什么使用两种链接？

标准答案：Link 用于 Next.js 站内页面导航，可提供客户端导航和预加载；普通 a 用于 GitHub 等站外地址，并可明确设置新标签页与安全属性。

判断关键词：站内 Link、站外 a、客户端导航。

### 12. 为什么抽取状态映射？

标准答案：卡片和详情页需要使用相同状态文案。抽取为共享模块能建立单一事实来源，避免复制后产生不一致。

判断关键词：共享、单一事实来源、避免不一致。

### 13. 为什么分两种简介？

标准答案：卡片空间有限，需要简短 description；详情页承担完整理解，需要 longDescription。数据字段分别匹配两个不同展示场景。

判断关键词：卡片简短、详情完整、场景不同。

### 14. 为什么拆分模糊布尔值？

标准答案：显示封面和显示链接是两个独立条件。一个布尔值同时控制两者会造成修改一个功能时意外改变另一个功能，拆分后职责更清楚。

判断关键词：独立条件、避免连带变化、职责清楚。

### 15. 两种 slug 的处理流程是什么？

标准答案：合法 slug 经 `await params` 取得后，由 `find()` 找到项目并渲染详情；无效 slug 查找得到 undefined，随后调用 `notFound()` 显示 404。

判断关键词：await、find、渲染或 notFound。

## 十九、Day 7 验收清单

- [x] Project 增加 `longDescription` 和 `highlights`；
- [x] 三个项目都补齐真实详情数据；
- [x] 状态映射已经抽到共享模块；
- [x] 卡片和详情页使用同一状态映射；
- [x] ProjectCard 新增可选 `slug`；
- [x] 内部详情导航使用 `Link`；
- [x] Projects 页面向卡片传入 slug；
- [x] 已创建 `app/projects/[slug]/page.tsx`；
- [x] params 类型为 `Promise<{ slug: string }>`；
- [x] 页面通过 `await params` 读取 slug；
- [x] 使用 `find()` 查找项目；
- [x] 找不到项目时调用 `notFound()`；
- [x] 已实现 `generateStaticParams()`；
- [x] 已实现 `generateMetadata()`；
- [x] 三个合法项目详情地址均可访问；
- [x] 无效地址显示 404；
- [x] 详情页状态、说明、亮点和标签正确；
- [x] 可选外部链接按真实数据条件显示；
- [x] 返回项目列表链接可用；
- [x] 首页仍保持合适的信息密度；
- [x] 390px 宽度无横向溢出；
- [x] 键盘焦点清晰可见；
- [x] 浏览器控制台没有错误；
- [x] `npm run lint` 通过；
- [x] `npx tsc --noEmit` 通过；
- [x] `npm run build` 通过；
- [x] 已独立回答自测题并对照标准答案。

### Codex 检查记录（2026-09-02）

- 静态 UI 审查：严格模式通过，0 个错误、警告或违规；
- 代码检查：ESLint、TypeScript 类型检查与 Next.js 生产构建均通过；
- 列表入口：首页显示 2 个详情链接，Projects 页面显示 3 个详情链接；
- 动态路由：三个合法 slug 均显示对应项目、3 条亮点和正确标签；
- Metadata：三个详情页的浏览器标题均包含对应项目名称；
- 404：不存在的 slug 正确进入 Next.js 404 页面；
- 交互：从 Projects 页面点击第一个“查看详情”，正确进入 `/projects/ai-workspace-agent`；
- 响应式：390px 宽度下详情页和 404 页面均无横向溢出。

## 二十、完成后如何向我提交检查

完成后直接告诉我：

```text
Day 7 完成，请检查
```

我会检查：

1. 数据模型是否合理；
2. 路由和 params 是否符合 Next.js 16；
3. 404 是否正确；
4. 详情链接是否语义正确；
5. 页面结构和 CSS 是否一致、响应式；
6. 浏览器真实交互是否通过；
7. 再决定是否进入 Day 8。

## 二十一、Git 提交建议

检查修改：

```powershell
git status
```

暂存文件：

```powershell
git add .
```

提交：

```powershell
git commit -m "feat: add project detail routes"
```

提交说明含义：

- `feat`：新增功能；
- `project detail routes`：项目详情路由；
- `-m`：指定本次提交说明。

## 一句话总结

Day 7 的核心是让一个 `[slug]` 页面模板根据 URL 加载不同项目，并用 `notFound()` 防守无效输入、用 Metadata 描述页面、用真实 Link 串起列表与详情，形成完整可靠的导航闭环。
