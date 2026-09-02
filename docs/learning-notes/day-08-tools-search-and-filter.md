# Day 8：Tools（工具集）、Client Component（客户端组件）与搜索筛选

状态：已完成

## 一、今天最终要完成什么

目前 Tools 页面只是把两条数据依次显示出来。Day 8 要把它升级成一个真正可使用的个人工具目录：

```text
工具集
├── 搜索框
│   └── 按名称、简介、分类和标签搜索
├── 分类筛选
│   ├── 全部
│   ├── AI
│   ├── 开发
│   ├── 学习
│   └── 效率
├── 结果数量
├── 工具卡片
│   ├── 分类
│   ├── 常用标记
│   ├── 名称和简介
│   ├── 标签
│   └── 打开工具
└── 无搜索结果状态
```

今天不是只追求“能筛选”，还要理解 React（前端界面库）的交互数据流：

```text
用户输入
↓
更新 State（状态）
↓
根据状态计算 filteredTools
↓
React 重新渲染结果
```

## 二、今天的学习目标

完成 Day 8 后，你应该能够解释：

1. Server Component（服务端组件）和 Client Component（客户端组件）的区别；
2. 为什么搜索组件需要 `'use client'`；
3. 为什么不应把整个页面都改成 Client Component；
4. `useState` 如何保存界面状态；
5. Controlled Input（受控输入框）是什么；
6. `filter()`、`includes()`、`some()` 各自解决什么问题；
7. 什么是 Derived State（派生状态）；
8. 为什么筛选结果不需要再放进一个 `useState`；
9. 如何组合“关键词”和“分类”两个筛选条件；
10. 如何正确设计清除按钮、筛选按钮和无结果状态；
11. 为什么本地搜索不需要 Debounce（防抖）；
12. 如何保持搜索交互的键盘可用性和可访问性。

## 三、为什么今天需要 Client Component

Next.js App Router（应用路由）中的页面默认是 Server Component。

服务端组件适合：

- 读取数据库或服务器数据；
- 使用不能暴露给浏览器的密钥；
- 输出静态内容；
- 减少发送给浏览器的 JavaScript；
- 改善首次页面加载。

但今天的搜索需要：

- `useState` 保存输入内容；
- `onChange` 响应用户输入；
- `onClick` 响应分类和清除操作；
- `useRef` 把焦点还给搜索框。

这些是浏览器中的交互，因此需要 Client Component。

在文件第一行写：

```tsx
"use client";
```

注意它必须位于所有 import 之前。

## 四、为什么不把整个 page.tsx 加上 use client

一种简单但范围过大的写法是：

```tsx
// app/tools/page.tsx
"use client";
```

这样整个页面及其导入的模块都会进入客户端模块树。当前页面的标题和介绍并不需要交互，因此更合理的结构是：

```text
ToolsPage                         Server Component
├── 页面标题和介绍               静态内容
└── ToolExplorer                 Client Component
    ├── 搜索框
    ├── 分类按钮
    └── 筛选结果
```

原则：把 `'use client'` 放到真正需要交互的最小边界。

## 五、服务端如何把数据交给客户端

`app/tools/page.tsx` 仍然从数据文件读取工具：

```tsx
import ToolExplorer from "@/components/ToolExplorer";
import { tools } from "@/data/tools";

export default function ToolsPage() {
  return (
    <main>
      {/* 静态标题 */}
      <ToolExplorer tools={tools} />
    </main>
  );
}
```

客户端组件接收 Props：

```tsx
type ToolExplorerProps = {
  tools: Tool[];
};
```

从 Server Component 传给 Client Component 的 Props 必须可以序列化，也就是能转换成可传输的数据。

当前 Tool 只有字符串、布尔值和字符串数组，可以安全传递。普通函数不能直接跨越这个边界。

## 六、useState 如何工作

搜索界面有两个会变化的值：

```tsx
const [query, setQuery] = useState("");
const [activeCategory, setActiveCategory] =
  useState<ToolFilterCategory>("全部");
```

拆解第一行：

| 部分 | 含义 |
| --- | --- |
| `query` | 当前搜索文字 |
| `setQuery` | 修改搜索文字的函数 |
| `useState("")` | 初始搜索文字为空 |

状态变化后 React 会重新执行组件函数，并根据最新状态生成界面。

不要直接修改：

```ts
query = "GitHub";
```

应该调用：

```ts
setQuery("GitHub");
```

## 七、什么是受控输入框

搜索框写法：

```tsx
<input
  id="tool-search"
  ref={searchInputRef}
  type="search"
  value={query}
  onChange={(event) => setQuery(event.target.value)}
  placeholder="搜索名称、标签或用途"
/>
```

这叫 Controlled Input（受控输入框）：

```text
输入框显示什么 → 由 query 决定
用户输入什么   → onChange 调用 setQuery
```

状态是唯一数据来源，所以清除输入、重置筛选和显示结果都更容易保持同步。

输入框必须有真实 `<label>`：

```tsx
<label htmlFor="tool-search">搜索工具</label>
```

`placeholder` 是输入示例，不是 label 的替代品。

## 八、建立筛选分类类型

数据分类已经存在：

```ts
export type ToolCategory = "AI" | "开发" | "学习" | "效率";
```

筛选界面还需要“全部”：

```ts
type ToolFilterCategory = "全部" | ToolCategory;

const categories: ToolFilterCategory[] = [
  "全部",
  "AI",
  "开发",
  "学习",
  "效率",
];
```

为什么不把“全部”加入 ToolCategory？

因为“全部”不是一个工具真实所属的分类，只是筛选器状态。数据类型和界面筛选类型职责不同。

## 九、搜索字符串标准化

用户可能输入大小写不同的英文或前后空格：

```text
GitHub
github
  github  
```

先标准化：

```ts
const normalizedQuery = query.trim().toLocaleLowerCase();
```

- `trim()`：移除开头和结尾空格；
- `toLocaleLowerCase()`：将英文转成小写；
- 中文不会因为转小写而损坏。

把可搜索字段合并：

```ts
const searchableText = [
  tool.name,
  tool.description,
  tool.category,
  ...tool.tags,
]
  .join(" ")
  .toLocaleLowerCase();
```

然后判断：

```ts
searchableText.includes(normalizedQuery)
```

## 十、组合关键词与分类筛选

完整逻辑：

```ts
const filteredTools = tools.filter((tool) => {
  const matchesCategory =
    activeCategory === "全部" || tool.category === activeCategory;

  const searchableText = [
    tool.name,
    tool.description,
    tool.category,
    ...tool.tags,
  ]
    .join(" ")
    .toLocaleLowerCase();

  const matchesQuery = searchableText.includes(normalizedQuery);

  return matchesCategory && matchesQuery;
});
```

这里的 `&&` 表示两个条件必须同时满足：

```text
分类符合 AND 关键词符合 → 显示
任意一个不符合           → 隐藏
```

当 `normalizedQuery` 是空字符串时，任何字符串都包含空字符串，因此全部工具可以通过关键词条件。这正好符合“搜索框为空时不过滤关键词”的需求。

## 十一、什么是派生状态

`filteredTools` 可以完全由这三个值计算出来：

```text
tools + query + activeCategory
```

所以它是 Derived State（派生状态），直接在渲染时计算即可。

不要这样写：

```tsx
const [filteredTools, setFilteredTools] = useState(tools);
```

否则你需要手动同步 query、category 和结果，很容易出现搜索框已经改变，但列表还是旧结果的问题。

当前只有少量本地工具，普通 `filter()` 足够快，不需要 `useMemo`，也不需要 `useEffect`。

## 十二、本地搜索为什么不需要防抖

Debounce（防抖）通常用于减少远程 API（接口）请求：用户连续输入时，等一小段时间再请求服务器。

今天的筛选只在浏览器内计算一个很小的数组：

```text
输入 → 立即 filter → 立即显示
```

没有网络请求，不需要故意等待。增加防抖反而让界面显得迟钝。

以后当搜索连接数据库或远程服务时，再学习 300ms 防抖、IME（输入法编辑过程）保护和取消旧请求。

## 十三、筛选按钮的语义

分类改变当前页面状态，因此使用 `<button>`，不是 `<a>`：

```tsx
<button
  type="button"
  aria-pressed={activeCategory === category}
  onClick={() => setActiveCategory(category)}
>
  {category}
</button>
```

`aria-pressed` 告诉 Screen Reader（屏幕阅读器）按钮当前是否处于选中状态。

原则：

```text
执行动作或改变当前状态 → button
前往另一个地址         → Link 或 a
```

## 十四、搜索清除按钮

搜索框有内容时显示清除按钮：

```tsx
const searchInputRef = useRef<HTMLInputElement>(null);

function clearSearch() {
  setQuery("");
  searchInputRef.current?.focus();
}
```

```tsx
{query && (
  <button
    type="button"
    onClick={clearSearch}
    aria-label="清除搜索内容"
  >
    ×
  </button>
)}
```

为什么清除后恢复焦点？

用户可以继续输入，不需要再次用鼠标点击搜索框。图标按钮只有“×”时，必须提供清晰的 `aria-label`。

## 十五、结果数量与无结果状态

结果数量会随输入变化，使用：

```tsx
<p aria-live="polite">找到 {filteredTools.length} 个工具</p>
```

`aria-live="polite"` 会让辅助技术在适当时机朗读变化，但不会粗暴打断当前内容。

没有匹配时不能只留一片空白：

```tsx
<section className={styles.emptyState}>
  <h2>没有找到匹配的工具</h2>
  <p>尝试更换关键词，或清除当前分类。</p>
  <button type="button" onClick={resetFilters}>
    清除全部筛选
  </button>
</section>
```

重置函数：

```ts
function resetFilters() {
  setQuery("");
  setActiveCategory("全部");
  searchInputRef.current?.focus();
}
```

需要区分：

- 数据本身为空：当前还没有收藏工具；
- 数据不为空但筛选后为空：没有符合当前条件的工具。

## 十六、Day 8 完整任务

先通读全部任务，再从任务 1 开始实现。

### 任务 1：扩充工具数据

当前只有 GitHub 和 ChatGPT。至少扩充到 6 个工具，并覆盖四种分类。

可以加入这些真实工具：

```ts
{
  id: "vscode",
  name: "Visual Studio Code",
  description: "用于编写、阅读和调试代码的开发编辑器。",
  url: "https://code.visualstudio.com",
  category: "开发",
  tags: ["编辑器", "调试", "插件"],
  isFavorite: true,
},
{
  id: "mdn",
  name: "MDN Web Docs",
  description: "查询 HTML、CSS 和 JavaScript Web 标准。",
  url: "https://developer.mozilla.org",
  category: "学习",
  tags: ["文档", "Web", "前端"],
  isFavorite: false,
},
{
  id: "notion",
  name: "Notion",
  description: "整理笔记、任务和长期知识内容。",
  url: "https://www.notion.so",
  category: "效率",
  tags: ["笔记", "知识管理", "任务"],
  isFavorite: false,
},
{
  id: "typescript-playground",
  name: "TypeScript Playground",
  description: "在浏览器中快速验证 TypeScript 类型和代码。",
  url: "https://www.typescriptlang.org/play",
  category: "学习",
  tags: ["TypeScript", "类型", "实验"],
  isFavorite: false,
},
```

要求：

- id 唯一；
- URL 使用真实 HTTPS 地址；
- 每个工具至少 2 个标签；
- 不要为了凑数量加入自己不会使用的虚假工具；
- 四个分类至少各有一个工具。

### 任务 2：扩展 ToolCard Props

修改 `components/ToolCard.tsx`：

```ts
type ToolCardProps = {
  name: string;
  description: string;
  url: string;
  category?: ToolCategory;
  tags?: string[];
  isFavorite?: boolean;
  headingLevel?: "h2" | "h3";
};
```

分类、标签和常用标记保持可选，因为首页仍然只展示简化卡片。

推荐结构：

```text
分类 · 常用
工具名称
简介
标签列表
打开工具 ↗
```

“常用”必须有文字，不能只用颜色或星形图标表达。

### 任务 3：完善 ToolCard 语义结构

分类与常用状态：

```tsx
{(category || isFavorite) && (
  <p className={styles.meta}>
    {category && <span>{category}</span>}
    {isFavorite && <span>常用</span>}
  </p>
)}
```

标签继续使用语义列表：

```tsx
{tags && tags.length > 0 && (
  <ul className={styles.tags} aria-label={`${name} 标签`}>
    {tags.map((tag) => (
      <li key={tag}>{tag}</li>
    ))}
  </ul>
)}
```

外部链接：

```tsx
<a href={url} target="_blank" rel="noreferrer">
  打开工具 <span aria-hidden="true">↗</span>
</a>
```

### 任务 4：补充卡片样式

在 `components/Card.module.css` 增加 `.meta` 等需要的样式。

要求：

- 复用 `--accent`、`--muted`、`--line` 等现有 CSS 变量；
- 卡片在不同内容长度下仍然稳定；
- 标签允许换行；
- 链接有 hover 和 `focus-visible`；
- 首页简化 ToolCard 不出现空白元信息区域；
- 不创建一套与 ProjectCard 冲突的新视觉语言。

### 任务 5：创建 ToolExplorer 客户端组件

新建：

```text
components/ToolExplorer.tsx
```

文件开头：

```tsx
"use client";

import { useRef, useState } from "react";
import type { Tool, ToolCategory } from "@/data/tools";
import ToolCard from "./ToolCard";
import styles from "./ToolExplorer.module.css";
```

建立 Props、筛选分类数组、query 和 activeCategory 状态。

### 任务 6：实现搜索逻辑

在 ToolExplorer 中：

1. 标准化 query；
2. 使用 `tools.filter()`；
3. 同时搜索 name、description、category 和 tags；
4. 同时判断分类；
5. 不要使用额外的 filteredTools 状态；
6. 不要使用 `useEffect` 同步结果。

### 任务 7：实现搜索框和清除按钮

要求：

- 有可见 label；
- input 的 value 绑定 query；
- onChange 更新 query；
- 内容不为空时显示清除按钮；
- 清除按钮 `type="button"`；
- 有 `aria-label="清除搜索内容"`；
- 清除后焦点回到 input。

### 任务 8：实现分类筛选

使用一组 button：

```tsx
<div className={styles.filters} aria-label="按分类筛选工具">
  {categories.map((category) => (
    <button
      key={category}
      type="button"
      aria-pressed={activeCategory === category}
      onClick={() => setActiveCategory(category)}
    >
      {category}
    </button>
  ))}
</div>
```

每个按钮需要：默认、hover、focus-visible、选中四种状态。

### 任务 9：渲染数量、结果和无结果状态

结果数量使用 `aria-live="polite"`。

有结果时：

```tsx
<section className={styles.grid} aria-label="工具搜索结果">
  {filteredTools.map((tool) => (
    <ToolCard
      key={tool.id}
      name={tool.name}
      description={tool.description}
      url={tool.url}
      category={tool.category}
      tags={tool.tags}
      isFavorite={tool.isFavorite}
    />
  ))}
</section>
```

没有结果时显示解释和“清除全部筛选”按钮。

如果 `tools.length === 0`，显示独立的初始空状态，不要显示“清除筛选”。因为此时没有数据，清除条件也无法产生结果。

### 任务 10：创建 ToolExplorer 样式

新建：

```text
components/ToolExplorer.module.css
```

至少设计：

- `.explorer`：与页面标题保持合理间距；
- `.searchRow`：搜索框和清除按钮的定位；
- `.label`：清楚但不过分抢眼；
- `.input`：至少 44px 高，有清晰焦点；
- `.clearButton`：可点击区域不能只有很小的 ×；
- `.filters`：Flexbox、允许换行；
- `.filterButton`：完整交互状态；
- `[aria-pressed="true"]`：清楚显示当前分类；
- `.resultCount`：稳定占据一行，避免结果变化时跳动；
- `.grid`：复用两列到一列的响应式规律；
- `.emptyState`：说明现状和下一步；
- `.resetButton`：有 hover、focus-visible。

不要隐藏滚动条，也不要用固定高度截断工具内容。

### 任务 11：更新 Tools 页面

`app/tools/page.tsx` 仍保持 Server Component，不添加 `'use client'`。

替换原来的 map：

```tsx
<ToolExplorer tools={tools} />
```

页面标题与介绍继续由 page.tsx 负责，交互列表由 ToolExplorer 负责。

### 任务 12：确认首页兼容性

首页继续这样使用 ToolCard：

```tsx
<ToolCard
  key={tool.id}
  name={tool.name}
  description={tool.description}
  url={tool.url}
  headingLevel="h3"
/>
```

验收：

- 首页仍只显示 2 个常用工具；
- 不传 category 和 tags 时没有空白区域；
- 卡片标题层级仍是 h3；
- 打开工具链接仍正常。

### 任务 13：运行检查

```powershell
npm run lint
```

作用：检查 React、TypeScript 和代码规范问题。

```powershell
npx tsc --noEmit
```

作用：检查 Tool、ToolCategory、Props 和状态的类型。

```powershell
npm run build
```

作用：确认 Server/Client Component 边界和生产构建正确。

## 十七、完整代码逻辑参考

下面是 ToolExplorer 的核心参考。建议先自己实现，遇到困难时再对照：

```tsx
"use client";

import { useRef, useState } from "react";
import type { Tool, ToolCategory } from "@/data/tools";
import ToolCard from "./ToolCard";
import styles from "./ToolExplorer.module.css";

type ToolExplorerProps = {
  tools: Tool[];
};

type ToolFilterCategory = "全部" | ToolCategory;

const categories: ToolFilterCategory[] = [
  "全部",
  "AI",
  "开发",
  "学习",
  "效率",
];

export default function ToolExplorer({ tools }: ToolExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ToolFilterCategory>("全部");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase();

  // 筛选结果完全由原始数据和两个状态计算，不保存重复状态。
  const filteredTools = tools.filter((tool) => {
    const matchesCategory =
      activeCategory === "全部" || tool.category === activeCategory;
    const searchableText = [
      tool.name,
      tool.description,
      tool.category,
      ...tool.tags,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return matchesCategory && searchableText.includes(normalizedQuery);
  });

  function clearSearch() {
    setQuery("");
    searchInputRef.current?.focus();
  }

  function resetFilters() {
    setQuery("");
    setActiveCategory("全部");
    searchInputRef.current?.focus();
  }

  if (tools.length === 0) {
    return (
      <section className={styles.emptyState}>
        <h2>还没有收藏工具</h2>
        <p>添加第一个常用工具后，它会显示在这里。</p>
      </section>
    );
  }

  return (
    <section className={styles.explorer} aria-label="浏览工具">
      <div className={styles.controls}>
        <label className={styles.label} htmlFor="tool-search">
          搜索工具
        </label>
        <div className={styles.searchRow}>
          <input
            ref={searchInputRef}
            id="tool-search"
            className={styles.input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、标签或用途"
          />
          {query && (
            <button
              className={styles.clearButton}
              type="button"
              onClick={clearSearch}
              aria-label="清除搜索内容"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filters} aria-label="按分类筛选工具">
          {categories.map((category) => (
            <button
              key={category}
              className={styles.filterButton}
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.resultCount} aria-live="polite">
        找到 {filteredTools.length} 个工具
      </p>

      {filteredTools.length > 0 ? (
        <div className={styles.grid}>
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              name={tool.name}
              description={tool.description}
              url={tool.url}
              category={tool.category}
              tags={tool.tags}
              isFavorite={tool.isFavorite}
            />
          ))}
        </div>
      ) : (
        <section className={styles.emptyState}>
          <h2>没有找到匹配的工具</h2>
          <p>尝试更换关键词，或清除当前分类。</p>
          <button type="button" onClick={resetFilters}>
            清除全部筛选
          </button>
        </section>
      )}
    </section>
  );
}
```

这里故意没有给完整 CSS 答案，因为今天需要你自己把既有视觉变量应用到新的交互控件。结构和验收标准已经明确，不需要猜设计方向。

## 十八、推荐实现顺序

```text
1. 扩充 tools 数据
↓
2. 扩展 ToolCard Props 和内容
↓
3. 确认首页没有被破坏
↓
4. 创建 ToolExplorer.tsx
↓
5. 先实现 query 搜索
↓
6. 再加入 activeCategory 分类筛选
↓
7. 添加清除搜索和重置全部
↓
8. 添加结果数量与两种空状态
↓
9. 编写 ToolExplorer.module.css
↓
10. 更新 ToolsPage
↓
11. 浏览器测试全部交互
↓
12. 运行 lint、类型检查和构建
```

## 十九、浏览器验收步骤

### 初始状态

- 页面显示全部工具；
- “全部”按钮处于选中状态；
- 结果数量等于工具总数；
- 每个分类至少有一个工具；
- 首页仍只显示两个常用工具。

### 搜索测试

依次输入：

```text
github
AI
代码
不存在的内容
```

检查名称、简介、分类和标签都能参与匹配；大小写和前后空格不影响英文搜索。

### 分类测试

- 点击“开发”只显示开发工具；
- 点击“学习”只显示学习工具；
- 点击“全部”恢复全部；
- `aria-pressed` 随选中分类改变；
- 关键词和分类同时生效。

### 清除与空状态

- 输入内容后出现清除按钮；
- 清除后输入框为空并保持焦点；
- 无匹配结果时显示解释和重置按钮；
- 重置后恢复全部工具和“全部”分类。

### 可访问性与响应式

- Tab 键可以依次到达输入框、清除按钮、分类按钮和工具链接；
- 所有交互元素都有清楚的焦点轮廓；
- 选中状态不只依赖颜色；
- 390px 宽度没有横向滚动；
- 长标签会换行；
- 浏览器控制台没有错误。

## 二十、常见错误

### 1. use client 没写在第一行

它必须出现在 import 之前，否则不能正确建立客户端边界。

### 2. 给整个 app 或 page 添加 use client

只有交互区域需要客户端 JavaScript。边界过大会增加客户端代码并模糊职责。

### 3. 直接修改 query

必须调用 `setQuery()`，React 才会知道状态发生了变化。

### 4. filteredTools 也使用 useState

它可以从现有数据和状态直接计算。存储重复状态会制造同步问题。

### 5. 只搜索工具名称

用户可能记得用途或标签而不记得名称。应同时搜索简介、分类和标签。

### 6. 分类和关键词使用 `||`

这里需要同时满足分类与关键词，因此组合条件应使用 `&&`。

### 7. 用链接做筛选按钮

筛选改变当前界面状态，不是导航，应该使用 button。

### 8. 只有 placeholder 没有 label

placeholder 输入后会消失，也不能可靠代替输入框名称。

### 9. 清除按钮只有 × 且没有可访问名称

图形对辅助技术含义不明确，需要 `aria-label="清除搜索内容"`。

### 10. input type=search 后完全依赖浏览器自带清除按钮

不同浏览器行为和样式不同。项目需要自己的明确清除操作和焦点恢复。

### 11. 无结果时什么都不显示

用户会以为页面坏了。应该解释没有匹配，并提供恢复全部结果的操作。

### 12. 为小数组加入 useMemo 或防抖

这会增加理解和维护成本，却没有实际性能收益。先选择最简单且正确的方案。

### 13. 忘记检查首页

ToolCard 是共享组件。扩展列表卡片后必须验证首页的简化用法没有出现空区域或错误层级。

## 二十一、自测题

先独立作答，再查看标准答案：

1. Server Component 和 Client Component 的主要区别是什么？
2. 为什么 ToolExplorer 需要 `'use client'`？
3. 为什么 ToolsPage 应继续保持 Server Component？
4. `useState("")` 返回的两个值分别是什么？
5. 什么是受控输入框？
6. 为什么“全部”不应该加入 ToolCategory？
7. `trim()` 和 `toLocaleLowerCase()` 分别解决什么问题？
8. `filter()` 的返回结果是什么？
9. 关键词条件和分类条件为什么使用 `&&`？
10. 什么是派生状态？
11. 为什么 filteredTools 不需要 useState？
12. 为什么今天不需要防抖？
13. 分类筛选为什么使用 button 而不是 a？
14. `aria-pressed` 表达什么？
15. 清除搜索后为什么要恢复输入框焦点？
16. 初始空数据和无搜索结果有什么不同？

## 二十二、自测题标准答案

### 1. 两种组件有什么区别？

标准答案：Server Component 主要在服务端执行，适合数据读取、静态输出和减少客户端 JavaScript；Client Component 能在浏览器中使用状态、事件和浏览器 API，实现交互。

判断关键词：服务端、浏览器交互、状态和事件。

### 2. 为什么 ToolExplorer 需要 use client？

标准答案：它使用 useState、useRef、onChange 和 onClick，这些交互能力需要在浏览器中运行，所以必须声明客户端边界。

判断关键词：状态、事件、浏览器运行。

### 3. 为什么 ToolsPage 保持服务端组件？

标准答案：页面标题和静态结构不需要交互。只把 ToolExplorer 设为客户端组件可以缩小客户端边界，保持职责清晰并减少不必要的 JavaScript。

判断关键词：最小边界、静态内容、减少客户端代码。

### 4. useState 返回什么？

标准答案：返回当前状态值和更新状态的函数。例如 query 是当前搜索文字，setQuery 用于修改它并触发重新渲染。

判断关键词：状态值、更新函数、重新渲染。

### 5. 什么是受控输入框？

标准答案：输入框的 value 由 React 状态决定，用户输入通过 onChange 更新该状态，因此界面值和程序状态始终同步。

判断关键词：value、状态、onChange、同步。

### 6. 为什么“全部”不属于 ToolCategory？

标准答案：“全部”只是筛选器的界面状态，不是任何工具真实拥有的分类。把两种职责分开能保证数据语义准确。

判断关键词：筛选状态、真实数据分类、职责不同。

### 7. 两个字符串方法做什么？

标准答案：trim 移除搜索词前后空格，toLocaleLowerCase 统一英文大小写，从而让不同输入形式获得相同匹配结果。

判断关键词：去除空格、统一大小写。

### 8. filter 返回什么？

标准答案：返回一个新数组，其中只包含回调函数返回 true 的项目；它不会修改原数组。

判断关键词：新数组、保留符合条件项、不修改原数组。

### 9. 为什么使用 &&？

标准答案：工具必须同时符合当前分类和搜索关键词才应该显示。&& 表示两个条件都为 true。

判断关键词：同时满足、两个条件。

### 10. 什么是派生状态？

标准答案：可以由现有数据或状态计算得到的值。例如 filteredTools 完全由 tools、query 和 activeCategory 计算得出。

判断关键词：由现有值计算、不独立存储。

### 11. 为什么不用 useState 保存 filteredTools？

标准答案：保存它会产生重复数据，并需要额外同步。直接计算可以始终反映最新输入和分类，逻辑更简单、更可靠。

判断关键词：避免重复、避免同步、直接计算。

### 12. 为什么不需要防抖？

标准答案：今天只过滤一个很小的本地数组，没有网络请求，计算开销很低。立即筛选反馈更快，防抖只会增加延迟和复杂度。

判断关键词：本地小数组、无网络、立即反馈。

### 13. 为什么筛选使用 button？

标准答案：筛选是在当前页面执行动作并改变状态，不是前往新地址。button 对这种操作具有正确的 HTML 语义和键盘行为。

判断关键词：当前页面动作、非导航、正确语义。

### 14. aria-pressed 表达什么？

标准答案：它向辅助技术说明一个可切换按钮当前是否处于按下或选中状态。

判断关键词：辅助技术、按钮选中状态。

### 15. 为什么清除后恢复焦点？

标准答案：让键盘用户可以立即继续输入，不需要重新寻找或点击搜索框，保持操作连续性。

判断关键词：键盘用户、继续输入、操作连续。

### 16. 两种空状态有什么区别？

标准答案：初始空数据表示系统中根本没有工具，需要添加数据；无搜索结果表示有数据但当前条件不匹配，可以通过修改或清除筛选恢复结果。

判断关键词：没有数据、条件不匹配、不同下一步。

## 二十三、Day 8 验收清单

- [ ] 工具数据至少有 6 条；
- [ ] 四个 ToolCategory 都至少有一个工具；
- [ ] id 唯一且 URL 真实有效；
- [ ] ToolCard 支持 category、tags 和 isFavorite；
- [ ] 扩展 Props 保持可选，不破坏首页；
- [ ] 标签使用 ul/li 和稳定 key；
- [ ] 外部链接使用新标签页并包含 rel；
- [ ] 已创建 ToolExplorer.tsx；
- [ ] use client 位于文件第一行；
- [ ] ToolsPage 仍是 Server Component；
- [ ] tools 通过 Props 传给客户端组件；
- [ ] query 和 activeCategory 使用 useState；
- [ ] 输入框是受控输入框；
- [ ] 输入框有可见 label；
- [ ] 搜索覆盖名称、简介、分类和标签；
- [ ] 英文大小写和前后空格不影响搜索；
- [ ] 分类和关键词可以组合筛选；
- [ ] filteredTools 直接计算，没有重复 State；
- [ ] 没有为本地筛选添加不必要的 useEffect 或防抖；
- [ ] 分类使用 button 和 aria-pressed；
- [ ] 清除按钮只在有输入时显示；
- [ ] 清除按钮有 aria-label；
- [ ] 清除或重置后焦点回到搜索框；
- [ ] 结果数量使用 aria-live；
- [ ] 初始空数据与无结果状态有不同说明；
- [ ] 无结果状态提供清除全部筛选按钮；
- [ ] 首页仍只显示两个简化常用工具；
- [ ] 所有按钮和链接有清晰焦点样式；
- [ ] 390px 宽度无横向溢出；
- [ ] 浏览器控制台没有错误；
- [ ] `npm run lint` 通过；
- [ ] `npx tsc --noEmit` 通过；
- [ ] `npm run build` 通过；
- [ ] 已独立完成自测并对照标准答案。

### Codex 检查记录（2026-09-02）

- 静态 UI 审查：严格模式通过，0 个错误、警告或违规；
- 代码检查：ESLint、TypeScript 类型检查和 Next.js 生产构建均通过；
- 初始状态：显示 6 个工具，“全部”分类正确选中；
- 搜索：输入带空格的大写 `GITHUB` 后，只显示 GitHub；
- 清除搜索：恢复 6 个工具，并把焦点返回搜索框；
- 分类筛选：“学习”正确显示 MDN Web Docs 和 TypeScript Playground；
- 组合筛选：“学习 + TypeScript”只显示 TypeScript Playground；
- 无结果：显示解释和“清除全部筛选”，重置后恢复全部工具；
- 首页兼容：仍然只显示 2 个简化工具卡片；
- 响应式：390px 宽度无横向溢出。

## 二十四、完成后如何提交检查

全部完成后告诉我：

```text
Day 8 完成，请检查
```

我会实际检查：

1. Server/Client Component 边界；
2. State 与派生筛选逻辑；
3. ToolCard 对首页的兼容性；
4. 搜索、分类、组合条件、清除和无结果交互；
5. 键盘焦点与响应式；
6. lint、TypeScript 类型检查和生产构建。

## 二十五、Git 提交建议

```powershell
git status
```

查看本次修改文件。

```powershell
git add .
```

把 Day 8 修改加入暂存区。

```powershell
git commit -m "feat: add tool search and filters"
```

- `feat`：新增功能；
- `tool search and filters`：工具搜索和分类筛选；
- `-m`：指定提交说明。

## 一句话总结

Day 8 的核心是把交互限制在一个小型 Client Component 中，用 State 保存用户选择、用派生计算得到筛选结果，并为搜索、分类、清除、无结果和键盘操作提供完整可靠的界面反馈。
