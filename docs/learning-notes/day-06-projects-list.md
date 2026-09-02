# Day 6：Projects 列表与项目卡片设计

状态：进行中

## 一、今天要完成什么

Day 5 已经让 Projects 页面从静态数据文件读取项目，但卡片目前只有名称和简介。

Day 6 要把它升级成真正的项目入口：

```text
ProjectCard
├── 封面区域或占位图
├── 项目状态
├── 项目名称
├── 项目简介
├── 技术/能力标签
├── GitHub（可选）
└── 打开项目（可选）
```

注意：今天不添加“查看详情”链接。详情页 `/projects/[slug]` 会在 Day 7 建立，在路由真实存在之前不应该展示一个点击后进入 404 的链接。

## 二、学习目标

完成 Day 6 后，应该理解：

1. 项目列表页和首页项目预览有什么区别；
2. 如何扩展 TypeScript 数据模型；
3. Union Type（联合类型）如何约束项目状态；
4. 如何根据可选数据进行 Conditional Rendering（条件渲染）；
5. 为什么不存在的操作不应该显示成可点击按钮；
6. 如何使用 `next/image` 处理本地项目封面；
7. 图片尺寸与 Layout Shift（布局偏移）的关系；
8. 如何渲染标签数组；
9. 如何设计 Empty State（空状态）；
10. 如何保持首页卡片与完整列表卡片的职责差异。

## 三、Projects 页面负责什么

首页的最近项目只需要快速预览：

```text
名称 + 简介
```

Projects 页面需要帮助用户判断：

```text
这个项目是什么？
目前是什么状态？
使用了哪些能力？
代码在哪里？
项目是否可以直接打开？
```

因此，同一个 ProjectCard 可以通过可选 Props 在不同场景显示不同信息，但不要让首页变得和完整列表一样复杂。

## 四、扩展项目数据模型

新增项目状态类型：

```ts
export type ProjectStatus = "building" | "completed" | "paused";
```

含义：

| 值 | 用户界面文案 | 含义 |
| --- | --- | --- |
| `building` | 开发中 | 正在继续开发 |
| `completed` | 已完成 | 当前版本已经完成 |
| `paused` | 已暂停 | 暂时停止推进 |

扩展 `Project`：

```ts
export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  coverImage?: string;
  projectUrl?: string;
  githubUrl?: string;
  isFeatured: boolean;
};
```

新增字段：

- `status`：项目当前状态；
- `tags`：项目涉及的技术或能力；
- `coverImage?`：可选封面图片路径；
- `projectUrl?`：可选的真实项目地址；
- `githubUrl?`：可选 GitHub 地址。

## 五、为什么状态使用英文代码

数据中保存：

```ts
status: "building"
```

界面显示：

```text
开发中
```

原因是数据值应该稳定，用户文案可以变化或翻译。

可以建立映射：

```ts
const statusLabels = {
  building: "开发中",
  completed: "已完成",
  paused: "已暂停",
};
```

这种结构叫 Lookup Map（查找映射）。使用时：

```tsx
statusLabels[status]
```

如果以后把“开发中”改成“持续开发”，只修改映射，不需要修改每条项目数据。

## 六、条件渲染

有些项目没有 GitHub 或部署地址，因此这些属性是可选的。

错误做法：

```tsx
<a href={githubUrl}>GitHub</a>
```

当 `githubUrl` 是 `undefined` 时，用户会看到一个无效操作。

正确做法：

```tsx
{githubUrl && (
  <a href={githubUrl} target="_blank" rel="noreferrer">
    查看 GitHub
  </a>
)}
```

执行逻辑：

```text
githubUrl 有值 → 渲染链接
githubUrl 没有值 → 不渲染链接
```

这叫 Short-circuit Rendering（短路条件渲染）。

## 七、为什么不能展示假按钮

如果项目没有部署地址，不应显示一个“打开项目”按钮却让它：

- 点击没有反应；
- 跳到 `#`；
- 进入 404；
- 显示成按钮但实际不可操作。

这叫 False Affordance（虚假可操作暗示）：界面看起来可以操作，实际上不行。

当前策略：

```text
存在 projectUrl → 显示“打开项目”
不存在 projectUrl → 不显示该操作
```

如果必须让用户知道项目尚未上线，可以显示普通文字“暂未部署”，但不要伪装成链接。

## 八、标签数组渲染

项目数据：

```ts
tags: ["Next.js", "TypeScript", "个人工具"]
```

组件渲染：

```tsx
<ul className={styles.tags} aria-label="项目标签">
  {tags.map((tag) => (
    <li key={tag}>{tag}</li>
  ))}
</ul>
```

为什么使用 `ul/li`？

因为标签在语义上是一组列表项目。视觉上可以显示成胶囊，但 HTML 仍然表达“这是一个列表”。

这里可以用 `tag` 作为 `key`，前提是同一个项目内标签不重复。

## 九、Next.js Image 组件

导入：

```tsx
import Image from "next/image";
```

本地公共图片放在：

```text
public/project-covers/example.png
```

数据路径写：

```ts
coverImage: "/project-covers/example.png"
```

使用：

```tsx
<Image
  src={coverImage}
  alt={`${title} 项目封面`}
  fill
  sizes="(max-width: 600px) 100vw, 50vw"
/>
```

### fill 的含义

`fill` 让图片填满父容器。父容器必须建立定位范围：

```css
.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
```

### 为什么要保留宽高比例

图片加载前如果浏览器不知道空间大小，图片出现时会把后续内容推开，造成 Layout Shift（布局偏移）。`aspect-ratio` 或明确宽高可以提前保留空间。

### alt 的作用

`alt` 是图片无法显示时的替代文字，也会被 Screen Reader（屏幕阅读器）读取。

如果图片只是纯装饰，没有传递额外信息，可使用：

```tsx
alt=""
```

项目封面通常能帮助识别项目，所以使用描述性 alt 更合适。

## 十、没有封面时怎么办

现在还没有真实项目截图，不要引用不存在的文件。使用可见的 Fallback（后备内容）：

```tsx
{coverImage ? (
  <Image ... />
) : (
  <div className={styles.coverFallback} aria-hidden="true">
    <span>{title.slice(0, 2).toUpperCase()}</span>
  </div>
)}
```

这会显示项目名称的前两个字符作为临时封面。

重点：Fallback 是真实可用的备用界面，不是坏掉的图片图标。

## 十一、卡片 Props 设计

Day 6 的 ProjectCard Props：

```ts
type ProjectCardProps = {
  title: string;
  description: string;
  status?: ProjectStatus;
  tags?: string[];
  coverImage?: string;
  projectUrl?: string;
  githubUrl?: string;
  headingLevel?: "h2" | "h3";
};
```

为什么 `status` 和 `tags` 在组件中可选，而在 Project 数据模型中必填？

```text
项目数据必须完整
但首页简化卡片可以选择不展示这些内容
```

数据完整性与组件展示需求是两个不同问题。

## 十二、空状态

现在项目数组有数据，但真实应用必须考虑空数组：

```tsx
{projects.length > 0 ? (
  <section className={styles.grid} aria-label="项目列表">
    {/* 项目卡片 */}
  </section>
) : (
  <section className={styles.emptyState}>
    <h2>还没有项目</h2>
    <p>完成第一个项目后，它会显示在这里。</p>
  </section>
)}
```

空状态不应该只写“暂无数据”。它应该解释当前情况和下一步会发生什么。

## 十三、Day 6 完整任务

### 任务 1：扩展项目数据模型

在 `data/projects.ts`：

1. 新增并导出 `ProjectStatus`；
2. 给 `Project` 新增 `status`、`tags`、`coverImage?`；
3. 为现有三个项目补齐 `status` 和 `tags`。

参考数据：

```ts
status: "completed",
tags: ["RAG", "Agent", "MCP", "FastAPI"],
```

```ts
status: "building",
tags: ["Next.js", "TypeScript", "个人工具"],
```

```ts
status: "building",
tags: ["学习", "实验", "前端"],
```

不要添加不存在的 `coverImage` 路径。真实截图准备好以后再添加。

### 任务 2：扩展 ProjectCard Props

在 `ProjectCard.tsx` 导入类型：

```ts
import type { ProjectStatus } from "@/data/projects";
```

新增可选 Props：

```ts
status?: ProjectStatus;
tags?: string[];
coverImage?: string;
projectUrl?: string;
githubUrl?: string;
```

保留已有 `title`、`description` 和 `headingLevel`。

### 任务 3：添加状态映射

```ts
const statusLabels: Record<ProjectStatus, string> = {
  building: "开发中",
  completed: "已完成",
  paused: "已暂停",
};
```

`Record<ProjectStatus, string>` 表示：

```text
必须包含每一种 ProjectStatus
每个状态对应一个 string
```

如果漏掉 `paused`，TypeScript 会提示错误。

### 任务 4：完善卡片结构

在 ProjectCard 中依次渲染：

```text
封面/Fallback
状态
标题
简介
标签
外部操作
```

状态、标签、GitHub、项目地址都使用条件渲染。首页没有传入时，保持 Day 5 的简洁卡片。

### 任务 5：添加封面与标签样式

在 `Card.module.css` 增加：

- `.cover`：16:9、相对定位、隐藏溢出；
- `.coverFallback`：使用现有紫色变量，不能随机建立新视觉体系；
- `.status`：小号状态文本；
- `.tags`：Flexbox、自动换行、去除默认列表样式；
- `.actions`：外部操作链接排列；
- hover 和 focus-visible；
- 手机端不溢出。

不要让整个卡片变成外部链接，因为卡片内部可能同时包含 GitHub 和打开项目两个不同目的地。

### 任务 6：更新 Projects 页面传参

```tsx
<ProjectCard
  key={project.id}
  title={project.name}
  description={project.description}
  status={project.status}
  tags={project.tags}
  coverImage={project.coverImage}
  projectUrl={project.projectUrl}
  githubUrl={project.githubUrl}
/>
```

页面负责决定完整列表展示哪些信息。

### 任务 7：保持首页简洁

首页仍只传：

```tsx
title
description
headingLevel="h3"
```

不要给首页卡片加入所有标签和外部按钮。复用组件不代表每个场景必须展示全部功能。

### 任务 8：添加空状态

Projects 页面使用 `projects.length > 0` 判断：

- 有项目时显示网格；
- 没有项目时显示指导性的空状态。

测试时可以临时使用：

```ts
const visibleProjects = [];
```

确认空状态后立即恢复为 `projects`，不要把测试空数组留在最终代码。

### 任务 9：运行检查

```powershell
npm run lint
```

检查代码规范。

```powershell
npx tsc --noEmit
```

检查 ProjectStatus、Props 和数据是否符合类型。

```powershell
npm run build
```

验证 Production Build（生产环境构建）。

## 十四、浏览器验收

检查首页和 Projects 页面：

- 首页仍然只有两个简洁项目卡片；
- Projects 页面显示三个完整项目卡片；
- 每张完整卡片显示状态和标签；
- 没有封面时显示 Fallback，而不是损坏图片；
- 有 GitHub 地址时显示链接；
- 没有项目地址时不显示“打开项目”；
- 外部链接在新标签页打开；
- Tab 键焦点清晰；
- 390px 手机宽度无横向溢出；
- 空状态测试通过并已经恢复真实数据；
- 浏览器控制台没有错误。

## 十五、常见错误

### 1. 数据模型新增必填字段但没有补齐旧数据

为 `Project` 增加 `status` 后，所有项目都必须添加状态，否则 TypeScript 会报错。

### 2. 使用不存在的图片路径

浏览器会请求文件并得到 404。没有真实图片时应暂时不传 `coverImage`。

### 3. Image 使用 fill，但父容器没有定位

父容器需要 `position: relative` 和明确尺寸或 `aspect-ratio`。

### 4. 条件渲染方向写反

应该在 URL 存在时显示链接，而不是缺少时显示。

### 5. tags 可能为空却始终渲染空 ul

可以判断：

```tsx
{tags && tags.length > 0 && (...)}
```

### 6. 把项目状态颜色作为唯一信息

状态必须有可读文字，不能只显示绿点或橙点。

### 7. 提前加入详情链接

Day 7 之前 `/projects/[slug]` 不存在。不要展示会进入 404 的链接。

### 8. 首页和列表页完全一样

首页负责预览，列表页负责完整浏览。复用组件时可以通过可选 Props 控制信息密度。

## 十六、自测题

1. 为什么 Projects 页面需要比首页展示更多项目信息？
2. 为什么 ProjectStatus 适合使用联合类型？
3. 为什么数据保存 `building`，界面显示“开发中”？
4. `Record<ProjectStatus, string>` 表示什么？
5. 什么是条件渲染？
6. 为什么不能显示链接到 `#` 的假按钮？
7. `fill` 模式下 Image 的父容器需要什么？
8. `aspect-ratio` 解决什么问题？
9. 为什么项目标签适合使用 `ul/li`？
10. 为什么数据模型中的 status 必填，而组件 Props 中可以可选？
11. 空状态应该提供什么信息？
12. 为什么 Day 6 不添加“查看详情”链接？

## 十七、自测题参考答案

### 1. 为什么列表页信息更多？

参考答案：首页负责快速预览和引导，Projects 页面负责让用户比较、理解并打开项目，因此需要状态、标签和外部链接等更完整信息。

判断关键词：首页预览、列表页完整浏览。

### 2. 为什么状态使用联合类型？

参考答案：状态只能来自有限集合。联合类型能阻止拼写错误和未定义状态，使每个项目状态保持一致。

判断关键词：有限集合、类型约束、防止拼写错误。

### 3. 为什么数据值和显示文案分离？

参考答案：英文状态代码稳定，中文文案可能调整或国际化。通过映射分离后，修改文案不需要修改每条数据。

判断关键词：稳定数据、可变文案、集中映射。

### 4. Record 表示什么？

参考答案：要求对象为每一种 ProjectStatus 提供一个属性，并且每个属性值都是字符串；漏掉状态或值类型错误都会被检查。

判断关键词：覆盖所有状态、值为 string。

### 5. 什么是条件渲染？

参考答案：根据数据或条件决定某段 JSX 是否出现，例如只有 githubUrl 存在时才渲染 GitHub 链接。

判断关键词：根据条件决定是否显示。

### 6. 为什么不能显示假按钮？

参考答案：它让用户误以为可以操作，点击后却没有有效结果，破坏信任和可用性。没有目标地址时应隐藏操作或显示普通说明。

判断关键词：虚假暗示、无有效结果、隐藏或说明。

### 7. fill 的父容器需要什么？

参考答案：需要 `position: relative` 建立定位范围，并通过固定尺寸或 `aspect-ratio` 提供可计算的空间。

判断关键词：relative、明确空间。

### 8. aspect-ratio 解决什么问题？

参考答案：它按比例提前保留图片区域，保持不同宽度下的形状稳定，并减少图片加载后推动内容造成的布局偏移。

判断关键词：保持比例、预留空间、减少布局偏移。

### 9. 为什么标签使用 ul/li？

参考答案：标签在语义上是一组项目，`ul/li` 能让浏览器和辅助技术理解其列表关系，视觉仍然可以用 CSS 设计成胶囊。

判断关键词：列表语义、辅助技术。

### 10. 为什么数据必填、组件可选？

参考答案：每个项目数据应该拥有完整状态和标签；但组件在首页等简化场景中不一定展示全部信息，所以展示 Props 可以可选。

判断关键词：数据完整、场景展示可选。

### 11. 空状态应提供什么？

参考答案：说明为什么当前没有内容，并提供下一步方向，例如“完成第一个项目后，它会显示在这里”，而不是只有“暂无数据”。

判断关键词：解释现状、指导下一步。

### 12. 为什么不添加详情链接？

参考答案：Day 7 才会创建动态详情路由。在目标页面存在前显示链接会导致 404，形成虚假可操作暗示。

判断关键词：路由尚不存在、避免 404、避免假操作。

## 十八、Day 6 验收清单

- [ ] 已定义 `ProjectStatus` 联合类型；
- [ ] Project 数据包含 `status` 和 `tags`；
- [ ] 每条项目数据都符合扩展后的模型；
- [ ] ProjectCard 支持状态、标签和外部链接；
- [ ] 状态通过集中映射显示中文；
- [ ] 标签使用 `ul/li` 和 `map`；
- [ ] 标签使用稳定 key；
- [ ] coverImage 缺少时显示 Fallback；
- [ ] 没有引用不存在的图片文件；
- [ ] GitHub 链接只在地址存在时显示；
- [ ] 打开项目链接只在地址存在时显示；
- [ ] 没有添加尚不能使用的详情链接；
- [ ] 首页保持简洁卡片；
- [ ] Projects 页面展示完整卡片；
- [ ] 空状态已测试并恢复真实数据；
- [ ] 390px 宽度没有横向溢出；
- [ ] 键盘焦点清晰可见；
- [ ] `npm run lint` 通过；
- [ ] `npx tsc --noEmit` 通过；
- [ ] `npm run build` 通过；
- [ ] 完成自测并对照参考答案。

## 十九、Git 提交建议

```powershell
git status
```

确认修改范围。

```powershell
git add .
```

把当前修改加入暂存区。

```powershell
git commit -m "feat: enrich project cards"
```

- `feat`：新增项目卡片功能；
- `enrich`：表示补充和丰富；
- `-m`：设置提交说明。

## 一句话总结

Day 6 的核心是用更完整的项目模型驱动卡片，根据真实数据条件展示状态、标签和有效操作，同时为缺少封面、缺少链接和空列表提供可靠的后备界面。
