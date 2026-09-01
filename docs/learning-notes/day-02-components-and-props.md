# Day 2：TypeScript、Component（组件）与 Props（组件参数）

状态：进行中

> 这份文档先记录 Day 2 当前已经学习的知识。完成代码和验收后，再把状态改为“已完成”，并勾选验收清单。

## 今天的目标

理解下面这条关系：

```text
把重复界面拆成 Component（组件）
↓
通过 Props（组件参数）传入不同数据
↓
使用 TypeScript（类型化 JavaScript）检查数据是否正确
```

计划建立：

```text
components/
├── Header.tsx
├── Footer.tsx
├── ProjectCard.tsx
└── ToolCard.tsx
```

## 核心知识一：Component（组件）

React 组件可以先理解成“返回一部分用户界面的函数”。

如果把整个网站都写进一个 `page.tsx`，代码会越来越长，重复内容也会越来越多。拆分组件能让代码：

- 更容易阅读；
- 可以重复使用；
- 修改时只需要改一个位置；
- 每个文件只负责一类界面。

例如网站可以拆成：

```text
页面
├── Header
├── 页面主体
│   ├── ProjectCard
│   └── ToolCard
└── Footer
```

## 核心知识二：共用组件放在哪里

`Header` 和 `Footer` 会出现在多个页面，所以适合放入 `app/layout.tsx`：

```tsx
<body>
  <Header />
  {children}
  <Footer />
</body>
```

这里的 `children` 不是固定页面，它会根据当前 URL 替换成首页、项目页或工具页。

这样设计的原因是避免在每个 `page.tsx` 中复制相同的页头和页脚。

## 核心知识三：Props（组件参数）

Props 是父组件传给子组件的数据。它让同一个组件结构能够显示不同内容。

```tsx
type ProjectCardProps = {
  title: string;
  description: string;
};

export default function ProjectCard({
  title,
  description,
}: ProjectCardProps) {
  return (
    <article>
      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  );
}
```

使用组件时传入具体数据：

```tsx
<ProjectCard
  title="AI Workspace Agent"
  description="我的 AI 工作空间项目"
/>
```

核心关系是：

```text
ProjectCard = 可重复使用的界面结构
title、description = 每次使用时传入的数据
```

## 核心知识四：TypeScript 类型约束

```ts
title: string;
```

表示 `title` 必须是字符串。如果误传数字，TypeScript 会在开发阶段提示错误，从而减少运行后才发现问题的情况。

```ts
githubUrl?: string;
```

属性名后的 `?` 表示 Optional Property（可选属性）：

- 有 GitHub 地址时可以传入；
- 没有地址时可以不传；
- 不会因为缺少这个属性而产生类型错误。

目前使用 `type` 描述 Props 的数据结构即可。`type` 和 `interface` 都能描述对象结构，现阶段不需要急着深入它们的区别。

## 核心知识五：数据解构

下面的写法：

```tsx
function ProjectCard({ title, description }: ProjectCardProps)
```

会直接从 Props 对象中取出 `title` 和 `description`。它等价于先接收整个 `props`，再读取 `props.title` 和 `props.description`，但写法更简洁。

## 常见错误

### 忘记导出组件

如果没有 `export default`，其他文件就不能用默认导入的方式引入该组件。

### 组件名称使用小写字母开头

React 组件名称应使用大写字母开头，例如 `ProjectCard`。小写名称通常会被 React 当作普通 HTML（网页结构语言）标签。

### Props 名称不一致

类型中写的是 `description`，使用组件时也必须写 `description`，不能随意写成 `desc`。

### 必填属性没有传入

如果 `title` 没有 `?`，它就是必填属性。使用 `ProjectCard` 时漏掉 `title`，TypeScript 会提示错误。

## 自测题

1. 为什么不应该把所有页面内容都写进一个 `page.tsx`？
2. 为什么 Header 和 Footer 适合放在 `layout.tsx`？
3. Props 的作用是什么？
4. `title: string` 表示什么？
5. `githubUrl?: string` 中的 `?` 表示什么？
6. 同一个 `ProjectCard` 为什么能显示不同项目？

## Day 2 验收清单

- [ ] 已创建 `components/Header.tsx`；
- [ ] 已创建 `components/Footer.tsx`；
- [ ] 已创建 `components/ProjectCard.tsx`；
- [ ] 已创建 `components/ToolCard.tsx`；
- [ ] Header 和 Footer 在全站显示；
- [ ] Projects 页面复用了 ProjectCard；
- [ ] Tools 页面复用了 ToolCard；
- [ ] TypeScript 没有明显报错；
- [ ] `/`、`/projects`、`/tools` 均可正常访问；
- [ ] 能用自己的话解释为什么要拆分组件。

## 完成后需要补充

Day 2 验收通过后，在这份文档中完成三件事：

1. 把顶部状态改为“已完成”；
2. 勾选实际通过的验收项目；
3. 记录当天遇到的错误及解决方法。

## 一句话总结

Component（组件）负责复用界面结构，Props（组件参数）负责传入不同数据，TypeScript（类型化 JavaScript）负责提前检查这些数据是否符合要求。

