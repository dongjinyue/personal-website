# Day 3：首页设计、组件组合与数据渲染

状态：已完成

## 一、今天要完成什么

把首页建设成个人网站的入口页：

```text
首页
├── Hero（首屏介绍）
├── 快捷入口
├── 最近项目
└── 常用工具
```

完成后，首页负责展示少量重要信息，Projects（项目）和 Tools（工具集）页面负责展示完整内容。

## 二、今天的学习目标

完成 Day 3 后，应该理解：

1. 首页和列表页的职责为什么不同；
2. Information Architecture（信息架构）是什么；
3. 如何使用语义化 HTML（网页结构语言）组织内容；
4. 如何判断一个界面是否应该拆成 Component（组件）；
5. 父组件如何通过 Props（组件参数）向子组件传递数据；
6. 如何使用数组与 `map` 渲染重复内容；
7. 为什么组件在不同页面中可能需要不同标题层级；
8. CSS Modules（模块化样式）的基本工作方式；
9. 如何进行基础的可访问性和页面验收。

## 三、首页的职责

首页不是展示全部内容，而是回答：

```text
这是什么网站？
↓
用户可以去哪里？
↓
目前有哪些重要项目？
↓
有哪些常用工具？
```

合理的页面关系是：

```text
首页
├── 网站介绍
├── 少量最近项目
├── 少量常用工具
└── 前往完整列表的入口

Projects 页面 → 全部项目
Tools 页面 → 全部工具
```

决定“什么信息放在哪里、先展示什么、用户下一步去哪里”叫 Information Architecture（信息架构）。清晰的信息架构比装饰效果更重要。

## 四、当前首页结构

当前已经完成：

- Hero（首屏介绍）；
- 项目中心和工具集两个快捷入口；
- `lang="zh-CN"` 中文页面语言；
- CSS Modules（模块化样式）；
- 基础响应式布局；
- 键盘焦点样式；
- `prefers-reduced-motion` 减少动画支持。

仍需完成：最近项目、常用工具、可复用卡片的标题层级，以及运行和类型验收。

## 五、Hero 与内容层级

Hero 需要回答三个问题：这是谁的网站、网站有什么用途、用户接下来能做什么。

```text
眉题：PERSONAL WORKSPACE
↓
主标题：欢迎来到我的个人数字空间
↓
介绍：项目、工具和学习内容
↓
行动入口：浏览项目 / 打开工具集
```

Call to Action（行动入口）应使用“浏览项目”这样的明确文案，不应只写含义模糊的“点击这里”。

常用语义标签：

| 标签 | 含义 | 当前用途 |
| --- | --- | --- |
| `<main>` | 页面主要内容 | 包住整个首页 |
| `<section>` | 独立主题区域 | Hero、快捷入口、最近项目 |
| `<article>` | 可独立理解的内容 | 项目卡片和工具卡片 |
| `<h1>` | 页面最高级标题 | 首页主标题 |
| `<h2>` | 主要区域标题 | 快捷入口、最近项目、常用工具 |
| `<h3>` | 区域内项目标题 | 单个项目或工具名称 |

标题标签表达内容层级，而不是字体大小。正确层级是：

```text
h1：首页标题
├── h2：快捷入口
├── h2：最近项目
│   ├── h3：AI Workspace Agent
│   └── h3：Personal Website
└── h2：常用工具
    ├── h3：GitHub
    └── h3：ChatGPT
```

## 六、站内链接与外部链接

站内路由使用 Next.js 的 `Link`：

```tsx
<Link href="/projects">查看全部项目</Link>
```

外部网站使用 `<a>`：

```tsx
<a href="https://github.com" target="_blank" rel="noreferrer">
  打开 GitHub
</a>
```

- `target="_blank"`：在新标签页打开；
- `rel="noreferrer"`：减少来源信息传递，并配合新标签页改善安全性；
- `Link` 支持 Next.js 客户端导航与 Prefetching（预取）。

## 七、数组与 map 渲染

当前快捷入口数据被放在数组中，再通过 `map` 生成界面：

```tsx
{quickLinks.map((item) => (
  <Link href={item.href} key={item.href}>
    {item.title}
  </Link>
))}
```

数据流是：

```text
quickLinks 数据
↓
map 遍历每一项
↓
生成多个相同结构的 Link
```

`key` 帮助 React 识别列表中的每一项，应该在同一列表中保持唯一和稳定。

### `as const` 与 typeof

`as const` 会让 TypeScript 保留精确的字面量类型。当前 `icon` 的类型会成为：

```ts
"folder" | "grid"
```

`|` 表示 Union Type（联合类型），即值只能是其中一种。

```tsx
(typeof quickLinks)[number]["icon"]
```

拆开理解：

- `typeof quickLinks`：取得整个数组的类型；
- `[number]`：取得数组单个元素的类型；
- `["icon"]`：取得元素中 `icon` 属性的类型。

这是进阶写法，现阶段重点是理解结果，不要求马上熟练手写。

## 八、CSS Modules

首页使用：

```tsx
import styles from "./page.module.css";
```

```tsx
<main className={styles.page}>
```

CSS Modules（模块化样式）为类名提供局部作用域，减少不同页面之间发生同名样式冲突。

当前样式还使用 CSS Custom Properties（CSS 自定义属性）：

```css
.page {
  --ink: #172036;
  --muted: #637089;
  --accent: #5d63e7;
}
```

使用时写：

```css
color: var(--ink);
```

这样颜色有统一名称，后续修改主题时不需要逐处查找颜色值。

## 九、组件复用中的标题层级

`ProjectCard` 当前固定使用 `<h2>`。在 Projects 页面中它是合理的，但在首页“最近项目”的 `<h2>` 下面，项目名称应该是 `<h3>`。

通过新的 Props 解决：

```tsx
type ProjectCardProps = {
  title: string;
  description: string;
  headingLevel?: "h2" | "h3";
};

export default function ProjectCard({
  title,
  description,
  headingLevel = "h2",
}: ProjectCardProps) {
  const Heading = headingLevel;

  return (
    <article>
      <Heading>{title}</Heading>
      <p>{description}</p>
    </article>
  );
}
```

- `?` 表示可选属性；
- `"h2" | "h3"` 限制只能传这两个值；
- `= "h2"` 是默认值；
- `Heading` 必须大写开头，React 才会把它当成组件或动态标签。

`ToolCard` 也应使用相同规则，保持两个卡片组件的 API（组件使用方式）一致。

## 十、Day 3 完整任务

### 任务 1：确认 Hero 与快捷入口（已完成）

- Hero 有眉题、`h1`、介绍和两个明确入口；
- 快捷入口包含项目中心和工具集；
- 不重复 Header 中的整套导航；
- `html` 使用 `lang="zh-CN"`。

### 任务 2：改造 ProjectCard

在 `components/ProjectCard.tsx`：

1. 增加 `headingLevel?: "h2" | "h3"`；
2. 默认值为 `"h2"`；
3. 创建 `const Heading = headingLevel`；
4. 把固定 `<h2>` 改成 `<Heading>`。

### 任务 3：改造 ToolCard

对 `components/ToolCard.tsx` 完成相同修改，保持两个组件使用方式一致。

### 任务 4：添加最近项目

在首页导入：

```tsx
import ProjectCard from "@/components/ProjectCard";
```

在“最近项目”区域使用：

```tsx
<ProjectCard
  title="AI Workspace Agent"
  description="集成知识库、RAG、Agent 和 MCP 的 AI 工作空间。"
  headingLevel="h3"
/>

<ProjectCard
  title="Personal Website"
  description="用于管理个人项目、常用工具和内容的长期数字空间。"
  headingLevel="h3"
/>

<Link href="/projects">查看全部项目</Link>
```

### 任务 5：添加常用工具

导入 `ToolCard`，展示 GitHub 和 ChatGPT：

```tsx
<ToolCard
  name="GitHub"
  description="用于保存代码、管理版本和协作开发。"
  url="https://github.com"
  headingLevel="h3"
/>

<ToolCard
  name="ChatGPT"
  description="用于学习、思考和辅助项目开发。"
  url="https://chatgpt.com"
  headingLevel="h3"
/>

<Link href="/tools">查看全部工具</Link>
```

### 任务 6：补充首页样式

在 `app/page.module.css` 中为最近项目和常用工具建立区域，要求：

- 优先使用已有颜色变量；
- 桌面端卡片可以并排；
- 手机端改为单列；
- 链接具有可见的 `:hover` 和 `:focus-visible`；
- 不要求复杂动画；
- 不通过隐藏滚动条掩盖布局错误。

Day 4 会系统学习 Flexbox（弹性布局）、Grid（网格布局）和 Responsive Design（响应式设计）。

### 任务 7：运行和检查

```powershell
npm run dev
```

- `npm`：Node Package Manager（Node 包管理器）；
- `run`：执行 `package.json` 中的脚本；
- `dev`：development（开发环境）脚本；
- 预期输出：本地地址通常为 `http://localhost:3000`。

```powershell
npm run lint
```

- `lint`：运行 ESLint（代码规范检查工具）；
- 预期输出：没有错误。

```powershell
npx tsc --noEmit
```

- `npx`：运行项目依赖中的命令；
- `tsc`：TypeScript Compiler（TypeScript 编译器）；
- `--noEmit`：只检查类型，不生成 JavaScript 文件；
- 通过时通常没有输出。

## 十一、浏览器验收

检查 `/`、`/projects` 和 `/tools`：

- 首页只有一个 `<h1>`；
- Hero、快捷入口、最近项目和常用工具都已显示；
- 站内链接可以跳转；
- 外部工具在新标签页打开；
- 标题层级为 `h1 → h2 → h3`；
- 使用 Tab 键可以看见链接焦点；
- 缩窄浏览器后没有横向溢出；
- 中文长文本不会遮挡或撑破布局。

## 十二、常见错误

- 忘记导入组件：使用 `<ProjectCard />` 前必须导入；
- Props 名称写错：`ProjectCard` 使用 `title`，`ToolCard` 使用 `name`；
- `map` 缺少 `key`：React 会产生警告；
- 动态标签变量使用小写：应写 `Heading` 而不是 `heading`；
- 首页重复全站导航：Header 已经负责全局导航；
- 只用鼠标检查：还要使用 Tab 键和手机宽度测试。

## 十三、自测题

1. 首页和 Projects 列表页的职责有什么不同？
2. Information Architecture（信息架构）解决什么问题？
3. 为什么首页通常只有一个 `<h1>`？
4. 为什么最近项目中的项目名称应该使用 `<h3>`？
5. `headingLevel?: "h2" | "h3"` 中的 `?` 和 `|` 分别表示什么？
6. `map` 和 `key` 分别有什么作用？
7. `as const` 对 `icon` 类型产生了什么影响？
8. CSS Modules 如何减少样式冲突？
9. 为什么站内链接优先使用 `Link`？
10. 为什么还需要用键盘测试页面？

## 十四、最终验收清单

- [x] 首页使用 `lang="zh-CN"`；
- [x] 首页只有一个 `<h1>`；
- [x] 已完成 Hero；
- [x] 已完成快捷入口；
- [x] 没有重复 Header 中的整套导航；
- [x] 站内跳转使用 `Link`；
- [x] `ProjectCard` 支持 `h2` 和 `h3`；
- [x] `ToolCard` 支持 `h2` 和 `h3`；
- [x] 已完成最近项目区域；
- [x] 已完成常用工具区域；
- [x] 项目和工具名称的标题层级正确；
- [x] 桌面和手机宽度均无明显问题；
- [x] 页面主要链接具有清晰的键盘焦点样式；
- [ ] `npm run lint` 通过；
- [ ] `npx tsc --noEmit` 通过；
- [x] `/`、`/projects`、`/tools` 均正常访问；
- [ ] 能解释组件组合和 Props 数据流。

### 验收记录

- 浏览器桌面端与 390px 手机宽度验收通过；
- 手机宽度不存在横向溢出；
- 标题层级检查结果为一个 `h1`、三个 `h2`、四个 `h3`；
- 首页前往 Projects 和 Tools 的站内链接跳转正常；
- 浏览器控制台未发现警告或错误；
- UI 严格静态审计通过，0 个问题；
- 当前自动检查终端无法找到 `npm` 和 `npx`，因此上面的 lint 与 TypeScript 两项需在安装了 Node.js 的本机终端自行确认。

## 十五、Git 提交建议

全部验收通过后再执行：

```powershell
git status
```

查看修改和新增文件，不会修改代码。

```powershell
git add .
```

- `git add`：把修改加入 Staging Area（暂存区）；
- `.`：当前目录下所有修改；
- 执行前确认没有无关文件。

```powershell
git commit -m "feat: build personal homepage sections"
```

- `commit`：创建本地版本记录；
- `-m`：指定提交说明；
- `feat`：表示新增功能。

## 一句话总结

Day 3 的核心不是把首页堆满内容，而是通过清晰的信息架构、正确的语义标签、可复用组件和 Props 数据流，把首页组织成通往项目与工具的长期个人入口。
