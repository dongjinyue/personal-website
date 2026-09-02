# Day 5：TypeScript 数据模型与数据驱动页面

状态：已完成

## 一、今天要完成什么

前四天的项目和工具内容直接写在页面 JSX（页面结构）中：

```tsx
<ProjectCard
  title="AI Workspace Agent"
  description="我的 AI 工作空间项目"
/>
```

Day 5 要把内容从页面中分离出来：

```text
TypeScript 数据文件
↓
页面读取数据
↓
map 生成组件
↓
浏览器显示列表
```

计划创建：

```text
data/
├── projects.ts
└── tools.ts
```

最终目标是建立 Single Source of Truth（单一数据来源）：同一个项目只维护一次，首页和 Projects 页面都读取同一份数据。

## 二、为什么要分离数据和界面

如果数据直接写在多个页面：

```text
首页写一次 AI Workspace Agent
Projects 页面再写一次
```

修改名称时容易只改一处，导致两个页面显示不同内容。

分离后：

```text
data/projects.ts
└── AI Workspace Agent
       ├── 首页读取
       └── Projects 页面读取
```

好处：

1. 数据只维护一次；
2. 页面只负责组织界面；
3. 类型可以检查每条数据是否完整；
4. 将来迁移 Database（数据库）时，页面结构不需要完全推倒重写；
5. 测试和筛选数据更加容易。

这叫 Separation of Concerns（关注点分离）：

```text
数据文件负责“有什么”
组件负责“每一项长什么样”
页面负责“展示哪些以及怎样排列”
```

## 三、什么是数据模型

Data Model（数据模型）是对一类数据应包含哪些字段、每个字段是什么类型的描述。

例如一个项目：

```ts
type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  projectUrl?: string;
  githubUrl?: string;
  isFeatured: boolean;
};
```

它不会创建具体项目，只是在规定：

```text
每个 Project 必须有什么
每个字段允许放什么类型的值
哪些字段可以缺少
```

具体数据则是：

```ts
const project = {
  id: "ai-workspace-agent",
  slug: "ai-workspace-agent",
  name: "AI Workspace Agent",
  description: "我的 AI 工作空间项目",
  isFeatured: true,
};
```

## 四、字段设计原则

字段应该描述业务含义，而不是描述当前界面的位置。

推荐：

```ts
isFeatured: boolean;
```

它表达“是否为重点项目”。

不推荐：

```ts
showOnHomepageLeftCard: boolean;
```

它把数据与当前页面布局绑死。以后首页改版，这个字段就失去意义。

字段命名原则：

- 使用清楚的英文名称；
- 同类数据保持一致；
- Boolean（布尔值）常使用 `is`、`has`、`can` 开头；
- URL 字段使用 `Url` 结尾；
- 不提前加入近期完全不会使用的字段，避免 Over-engineering（过度设计）。

## 五、项目模型字段解释

```ts
export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  projectUrl?: string;
  githubUrl?: string;
  isFeatured: boolean;
};
```

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `id` | `string` | 稳定识别这一条数据 |
| `slug` | `string` | 将来生成项目详情 URL |
| `name` | `string` | 项目名称 |
| `description` | `string` | 项目简介 |
| `projectUrl?` | `string` | 可选的项目运行地址 |
| `githubUrl?` | `string` | 可选的 GitHub 地址 |
| `isFeatured` | `boolean` | 是否展示在首页最近项目中 |

### id 与 slug 的区别

当前两者可以相同，但职责不同：

```text
id：数据身份
slug：URL 中可读的路径片段
```

将来可能出现：

```text
id = "p_01JABC..."
slug = "ai-workspace-agent"
```

因此不要因为当前值相同就认为它们永远是同一个概念。

## 六、工具模型字段解释

```ts
export type ToolCategory = "AI" | "开发" | "学习" | "效率";

export type Tool = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: ToolCategory;
  tags: string[];
  isFavorite: boolean;
};
```

### 联合类型

```ts
"AI" | "开发" | "学习" | "效率"
```

表示 `category` 只能是四个值之一。下面会报错：

```ts
category: "随便写的分类"
```

联合类型能提前阻止分类拼写不一致。

### 字符串数组

```ts
tags: string[];
```

表示 `tags` 是数组，数组中的每一项都必须是字符串：

```ts
tags: ["代码", "Git", "协作"]
```

## 七、必填属性与可选属性

```ts
name: string;
```

表示 `name` 必须存在。

```ts
githubUrl?: string;
```

`?` 表示 Optional Property（可选属性），可以存在，也可以不写。

应该根据真实业务决定是否可选：

```text
每个项目都有名称 → name 必填
有些项目还没上传 GitHub → githubUrl 可选
```

不要为了消除 TypeScript 错误，把所有字段都加 `?`。那会失去类型检查的价值。

## 八、export 与 import

一个文件中的变量默认只能在当前文件使用。

导出类型和数据：

```ts
export type Project = { /* ... */ };
export const projects: Project[] = [ /* ... */ ];
```

其他文件导入：

```ts
import { projects } from "@/data/projects";
```

花括号表示 Named Export（命名导出），导入名称必须与导出名称一致。

```text
export const projects
↓
import { projects }
```

类型只在另一个类型定义中使用时，可以写：

```ts
import type { Project } from "@/data/projects";
```

`import type` 明确表示它只用于 TypeScript 类型，不会成为运行时代码。

## 九、数组类型

```ts
export const projects: Project[] = [];
```

`Project[]` 表示：

```text
这是一个数组
数组每一项都必须符合 Project
```

如果某一项漏掉必填的 `name`，TypeScript 会立即提示错误。

另一种等价写法是：

```ts
Array<Project>
```

当前项目统一使用较简洁的 `Project[]`。

## 十、map、filter 与 slice

### map：转换每一项

```tsx
{projects.map((project) => (
  <ProjectCard
    key={project.id}
    title={project.name}
    description={project.description}
  />
))}
```

`map` 不会修改原数组，而是根据每一项生成新的结果。这里把每个 Project 数据转换成 ProjectCard 组件。

### filter：筛选符合条件的数据

```ts
const featuredProjects = projects.filter(
  (project) => project.isFeatured,
);
```

只有回调函数返回 `true` 的项目会留下。

### slice：取数组的一部分

```ts
const recentProjects = projects.slice(0, 2);
```

表示从索引 `0` 开始，取到索引 `2` 之前，因此得到前两项。

组合使用：

```ts
const homepageProjects = projects
  .filter((project) => project.isFeatured)
  .slice(0, 2);
```

执行顺序是：

```text
先筛选重点项目
↓
再取前两个
```

## 十一、为什么 key 使用 id

React 列表需要稳定的 `key`：

```tsx
key={project.id}
```

不推荐：

```tsx
key={index}
```

数组顺序变化时，索引会变化，React 可能把旧组件状态错误地对应到另一项。稳定的 `id` 更能代表数据身份。

当前卡片没有本地状态，索引问题暂时不明显，但建立正确习惯能避免以后出现隐蔽错误。

## 十二、静态数据与数据库

Day 5 使用 TypeScript 文件保存数据：

```text
修改 projects.ts
↓
重新构建网站
↓
页面显示新数据
```

这不等于 Database（数据库）。

数据库阶段会变成：

```text
管理员在网页提交表单
↓
服务器保存到数据库
↓
页面查询数据库
↓
无需修改源代码
```

但页面使用数据的思想不会改变：

```text
数据源
↓
获取数据
↓
组件渲染
```

因此静态数据文件是理解数据库之前的重要过渡。

## 十三、Day 5 完整任务

### 任务 1：创建 projects 数据文件

创建：

```text
data/projects.ts
```

写入：

```ts
/**
 * 项目数据模型。
 * 当前使用本地静态数据，后续可以迁移到数据库。
 */
export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  projectUrl?: string;
  githubUrl?: string;
  isFeatured: boolean;
};

export const projects: Project[] = [
  {
    id: "ai-workspace-agent",
    slug: "ai-workspace-agent",
    name: "AI Workspace Agent",
    description: "集成知识库、RAG、Agent 和 MCP 的 AI 工作空间。",
    isFeatured: true,
  },
  {
    id: "personal-website",
    slug: "personal-website",
    name: "Personal Website",
    description: "用于管理个人项目、常用工具和内容的长期数字空间。",
    githubUrl: "https://github.com/dongjinyue/personal-website",
    isFeatured: true,
  },
];
```

### 任务 2：创建 tools 数据文件

创建：

```text
data/tools.ts
```

写入：

```ts
export type ToolCategory = "AI" | "开发" | "学习" | "效率";

/**
 * 工具数据模型。
 * category 用于分类，tags 为后续搜索和筛选做准备。
 */
export type Tool = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: ToolCategory;
  tags: string[];
  isFavorite: boolean;
};

export const tools: Tool[] = [
  {
    id: "github",
    name: "GitHub",
    description: "用于保存代码、管理版本和协作开发。",
    url: "https://github.com",
    category: "开发",
    tags: ["Git", "代码", "协作"],
    isFavorite: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "用于学习、思考和辅助项目开发。",
    url: "https://chatgpt.com",
    category: "AI",
    tags: ["AI", "学习", "开发"],
    isFavorite: true,
  },
];
```

### 任务 3：改造 Projects 页面

导入数据：

```tsx
import { projects } from "@/data/projects";
```

把手写的两个 ProjectCard 改成：

```tsx
{projects.map((project) => (
  <ProjectCard
    key={project.id}
    title={project.name}
    description={project.description}
  />
))}
```

注意：页面布局不变，只替换数据来源。

### 任务 4：改造 Tools 页面

导入：

```tsx
import { tools } from "@/data/tools";
```

使用：

```tsx
{tools.map((tool) => (
  <ToolCard
    key={tool.id}
    name={tool.name}
    description={tool.description}
    url={tool.url}
  />
))}
```

### 任务 5：改造首页最近项目

在首页导入 `projects`，并在组件函数外或函数开始位置获得重点项目：

```ts
const featuredProjects = projects
  .filter((project) => project.isFeatured)
  .slice(0, 2);
```

使用 `map` 替换两个手写 ProjectCard：

```tsx
{featuredProjects.map((project) => (
  <ProjectCard
    key={project.id}
    title={project.name}
    description={project.description}
    headingLevel="h3"
  />
))}
```

### 任务 6：改造首页常用工具

```ts
const favoriteTools = tools
  .filter((tool) => tool.isFavorite)
  .slice(0, 2);
```

```tsx
{favoriteTools.map((tool) => (
  <ToolCard
    key={tool.id}
    name={tool.name}
    description={tool.description}
    url={tool.url}
    headingLevel="h3"
  />
))}
```

### 任务 7：进行数据驱动验证

临时在 `projects` 数组中增加第三个项目：

```ts
{
  id: "learning-playground",
  slug: "learning-playground",
  name: "Learning Playground",
  description: "用于练习前端和 AI 应用开发的实验项目。",
  isFeatured: false,
}
```

验证：

- Projects 页面自动出现第三张卡片；
- 首页仍只显示 `isFeatured: true` 的项目；
- 没有修改任何 JSX 卡片结构。

这个验证完成后可以保留该项目，也可以删除测试数据。

### 任务 8：运行工程检查

```powershell
npm run lint
```

- 检查代码规范；
- 预期结果：没有错误。

```powershell
npx tsc --noEmit
```

- 检查数据是否符合 TypeScript 模型；
- `--noEmit` 表示不生成文件；
- 预期结果：通过时通常没有输出。

```powershell
npm run build
```

- 创建 Production Build（生产环境构建）；
- 预期结果：构建成功，三个页面均生成完成。

## 十四、故意制造一次类型错误

为了真正理解类型检查，可以临时把：

```ts
isFeatured: true
```

改成：

```ts
isFeatured: "yes"
```

运行：

```powershell
npx tsc --noEmit
```

TypeScript 应提示字符串不能赋值给 boolean。观察错误后立即改回 `true`。

这个练习的意义是亲眼看到：

```text
类型模型不是文档
它会真实阻止错误数据进入项目
```

## 十五、常见错误

### 1. 忘记 export

没有导出的 `projects` 无法在页面中导入。

### 2. 命名导入不一致

导出 `projects`，就必须导入 `{ projects }`，不能写成 `{ project }`。

### 3. map 使用花括号却忘记 return

错误：

```tsx
projects.map((project) => {
  <ProjectCard />;
});
```

使用 `{}` 后需要明确 `return`。当前推荐使用圆括号隐式返回：

```tsx
projects.map((project) => (
  <ProjectCard />
));
```

### 4. key 放错位置

`key` 应放在 `map` 直接返回的最外层组件上。

### 5. filter 忘记返回条件

```ts
projects.filter((project) => project.isFeatured)
```

回调必须产生 boolean 结果。

### 6. 直接修改原数组

不要为了展示前两项使用会修改原数组的方法。`filter`、`map`、`slice` 都会返回新数组，适合当前场景。

### 7. 所有字段都加问号

这会让缺失名称和描述也不报错，削弱数据模型的保护能力。

### 8. 把静态数据误认为数据库

TypeScript 文件需要修改代码并重新部署，不能通过网站后台直接维护。

## 十六、自测题

1. 为什么要把项目数据从页面 JSX 中分离出来？
2. Data Model（数据模型）的作用是什么？
3. 数据、组件、页面分别负责什么？
4. `Project[]` 表示什么？
5. 必填属性和可选属性有什么区别？
6. `"AI" | "开发" | "学习" | "效率"` 表示什么？
7. `string[]` 表示什么？
8. `export` 和 `import` 的关系是什么？
9. `map`、`filter`、`slice` 分别有什么作用？
10. 为什么 React 列表优先使用数据 `id` 作为 `key`？
11. 为什么 `isFeatured` 比 `showOnHomepageLeftCard` 更合理？
12. 静态 TypeScript 数据文件和数据库有什么区别？

## 十七、自测题参考答案

### 1. 为什么要分离数据？

参考答案：避免同一数据在多个页面重复维护，建立单一数据来源；页面专注布局，组件专注单项外观，数据文件专注内容，也为以后迁移数据库做准备。

判断关键词：避免重复、单一数据来源、关注点分离。

### 2. 数据模型的作用是什么？

参考答案：规定一类数据有哪些字段、字段是什么类型、哪些必填或可选，让 TypeScript 在开发阶段发现缺失字段和错误类型。

判断关键词：字段结构、类型约束、提前发现错误。

### 3. 数据、组件、页面分别负责什么？

参考答案：数据负责“有什么内容”；组件负责“单项内容怎样显示”；页面负责“选择哪些数据以及如何组织多个组件”。

判断关键词：内容、单项外观、页面组织。

### 4. `Project[]` 表示什么？

参考答案：表示一个数组，并且数组中的每一项都必须符合 `Project` 类型。

判断关键词：数组、每项符合 Project。

### 5. 必填和可选属性有什么区别？

参考答案：没有 `?` 的属性必须提供；带 `?` 的属性可以省略。是否可选应该由真实业务决定，而不是为了消除错误随意添加。

判断关键词：`?`、可以省略、根据业务决定。

### 6. 分类联合类型表示什么？

参考答案：`category` 只能是列出的四个字符串之一，其他字符串会产生类型错误，从而防止分类名称拼写不一致。

判断关键词：只能四选一、限制可用值。

### 7. `string[]` 表示什么？

参考答案：表示字符串数组，数组中的每个元素都必须是字符串。

判断关键词：数组、元素必须是字符串。

### 8. export 和 import 的关系是什么？

参考答案：`export` 让文件中的类型、变量或函数可以被其他模块使用；`import` 在其他文件中引入这些导出内容。命名导入的名称必须与命名导出一致。

判断关键词：导出供外部使用、导入到当前文件。

### 9. map、filter、slice 分别有什么作用？

参考答案：`map` 把每一项转换成新结果；`filter` 只保留符合条件的项；`slice` 取数组指定范围的一部分。三者都会返回新数组，不直接修改原数组。

判断关键词：转换、筛选、截取、不修改原数组。

### 10. 为什么优先用 id 作为 key？

参考答案：`id` 稳定代表数据身份。数组排序或插入数据后，索引可能改变，使用索引可能让 React 错误复用组件状态。

判断关键词：稳定身份、索引会随顺序变化。

### 11. 为什么 `isFeatured` 更合理？

参考答案：`isFeatured` 描述项目本身的业务属性，与具体页面位置无关；`showOnHomepageLeftCard` 把数据绑定到当前布局，页面改版后字段就可能失去意义。

判断关键词：业务含义、避免绑定具体布局。

### 12. 静态数据文件和数据库有什么区别？

参考答案：静态 TypeScript 数据存放在源代码中，修改后需要重新构建部署；数据库在运行时保存和查询数据，可以通过后台表单修改，而不必直接编辑源代码。

判断关键词：源代码与运行时存储、是否需要重新部署。

## 十八、Day 5 验收清单

- [x] 已创建 `data/projects.ts`；
- [x] 已创建 `data/tools.ts`；
- [x] 已定义并导出 `Project` 类型；
- [x] 已定义并导出 `Tool` 和 `ToolCategory` 类型；
- [x] `projects` 数组受到 `Project[]` 约束；
- [x] `tools` 数组受到 `Tool[]` 约束；
- [x] Projects 页面使用 `projects.map`；
- [x] Tools 页面使用 `tools.map`；
- [x] 首页最近项目通过 `filter` 和 `slice` 获得；
- [x] 首页常用工具通过 `filter` 和 `slice` 获得；
- [x] React 列表使用稳定的 `id` 作为 `key`；
- [x] 页面中不再重复手写同一项目和工具数据；
- [x] 增加一条数据后对应列表可以自动显示；
- [ ] 故意制造的 boolean 类型错误能够被 TypeScript 发现；
- [x] `/`、`/projects`、`/tools` 均正常访问；
- [ ] `npm run lint` 通过；
- [ ] `npx tsc --noEmit` 通过；
- [ ] `npm run build` 通过；
- [ ] 能解释数据 → 页面 → 组件的完整流程；
- [ ] 已完成自测题并对照参考答案。

### 验收记录

- 首页数据来自 `projects` 和 `tools`，通过 `filter + slice` 控制数量；
- Projects 页面通过 `map` 自动渲染三个项目；
- `Learning Playground` 的 `isFeatured` 为 `false`，因此没有进入首页；
- Tools 页面通过 `map` 渲染两个工具；
- 三个页面均无构建错误，浏览器控制台没有警告或错误；
- 当前自动检查终端无法找到 `npm` 和 `npx`，lint、类型检查和生产构建仍需在本机 Node.js 终端确认。

## 十九、Git 提交建议

```powershell
git status
```

查看修改和新增文件。

```powershell
git add .
```

- `git add`：加入 Staging Area（暂存区）；
- `.`：当前目录下所有修改。

```powershell
git commit -m "refactor: move projects and tools into data models"
```

- `refactor`：Refactor（重构），表示调整代码组织，但不改变主要功能；
- `-m`：设置提交说明；
- 这里使用 `refactor`，因为页面功能不变，数据来源从 JSX 移到了 TypeScript 文件。

## 一句话总结

Day 5 的核心是用 TypeScript 数据模型建立单一数据来源，再通过 `filter`、`slice` 和 `map` 把数据交给组件渲染，让数据、组件和页面各自承担清晰职责。
