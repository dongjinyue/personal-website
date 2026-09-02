# Day 4：CSS、Flexbox、Grid 与响应式设计

状态：已完成

## 一、今天要完成什么

Day 3 已经完成首页的内容结构。Day 4 要理解这些样式为什么有效，并把统一的视觉语言扩展到全站。

```text
Day 3：页面有什么内容
↓
Day 4：内容怎样排列、适配和保持一致
```

今天最终完成：

```text
全站 UI
├── 统一颜色与尺寸变量
├── Header（页头）
├── Footer（页脚）
├── 可复用项目/工具卡片
├── Projects 页面
├── Tools 页面
└── 桌面、平板、手机适配
```

## 二、学习目标

完成后应该理解：

1. CSS（层叠样式表）如何找到并修改 HTML 元素；
2. Cascade（层叠）、Inheritance（继承）和 Specificity（优先级）的基本关系；
3. Box Model（盒模型）如何计算元素尺寸；
4. `display: flex` 和 `display: grid` 分别适合什么场景；
5. `gap`、`minmax()`、`clamp()` 和 `min()` 的作用；
6. Media Query（媒体查询）如何根据屏幕宽度调整布局；
7. Mobile First（移动端优先）和 Desktop First（桌面端优先）的区别；
8. Global CSS（全局样式）和 CSS Modules（模块化样式）的职责；
9. Hover（鼠标悬停）、Focus（键盘焦点）和 Reduced Motion（减少动画）为什么都重要；
10. 如何验证页面没有横向溢出、文字遮挡和不可操作链接。

## 三、Day 4 的视觉方向

当前首页已经形成一个明确方向，Day 4 不重新设计：

```text
主题：个人数字工作空间
背景：安静的浅灰蓝
正文：深墨蓝
强调：数字感紫色
辅助：少量暖橙色
标志元素：Hero 中的轨道图形
```

建议统一 Design Tokens（设计变量）：

| 名称 | 值 | 用途 |
| --- | --- | --- |
| `--background` | `#f8f9fc` | 页面背景 |
| `--surface` | `#ffffff` | 卡片表面 |
| `--foreground` | `#172036` | 主要文字 |
| `--muted` | `#637089` | 次要文字 |
| `--line` | `#dce2eb` | 边框与分隔线 |
| `--accent` | `#5d63e7` | 主要强调色 |
| `--accent-soft` | `#eef0ff` | 浅强调背景 |

Token（设计变量）的意义是让设计决策拥有名称。以后更换颜色时修改变量，不需要逐个修改几十处颜色值。

## 四、CSS 基本语法

```css
.card {
  color: #172036;
  padding: 24px;
  border: 1px solid #dce2eb;
}
```

拆开理解：

- `.card`：Selector（选择器），找到类名为 `card` 的元素；
- `color`：Property（属性），表示要修改什么；
- `#172036`：Value（值），表示修改成什么；
- `{}`：包含该选择器的声明；
- `;`：结束一条声明。

在 React 中不能写 HTML 的 `class`，要写：

```tsx
<article className={styles.card}>
```

原因是 `class` 在 JavaScript 中有自己的语法含义，因此 JSX（JavaScript 中的页面语法）使用 `className`。

## 五、层叠、继承与优先级

CSS 全名包含“Cascading（层叠）”。同一个元素可能被多条规则匹配，浏览器需要决定最终使用哪一条。

简化理解：

```text
是否匹配元素
↓
规则优先级
↓
相同优先级时看出现顺序
↓
得到最终样式
```

例如：

```css
p {
  color: gray;
}

.intro {
  color: blue;
}
```

```tsx
<p className={styles.intro}>网站介绍</p>
```

`.intro` 比普通元素选择器 `p` 更具体，因此文字显示蓝色。

一些属性会继承，例如 `color` 和 `font-family`；一些通常不会继承，例如 `margin`、`padding` 和 `border`。

不要依赖越来越长的选择器解决冲突：

```css
body main section div article a { }
```

这种写法难以维护。优先使用清晰的 CSS Module 类名。

## 六、Box Model（盒模型）

浏览器中的大多数元素都可以理解为盒子：

```text
margin：盒子与外部元素的距离
└── border：盒子的边框
    └── padding：边框与内容的距离
        └── content：文字、图片等内容
```

项目已经设置：

```css
* {
  box-sizing: border-box;
}
```

`border-box` 表示声明的宽度包含 content、padding 和 border，尺寸更容易推算。

例如：

```css
.card {
  width: 300px;
  padding: 24px;
  border: 1px solid;
}
```

使用 `border-box` 时，最终外部宽度仍然是 `300px`，而不是再额外增加 padding 和 border。

## 七、Flexbox（弹性布局）

Flexbox 主要解决“一条轴线上的排列”。适合：

- Header 中横向导航；
- 标题与右侧链接；
- 一组按钮；
- 图标与文字；
- Footer 中两端对齐。

```css
.navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
```

- `display: flex`：启用弹性布局；
- `align-items`：控制交叉轴对齐，默认横排时就是垂直方向；
- `justify-content`：控制主轴排列，默认横排时就是水平方向；
- `gap`：子元素之间的统一距离。

### 主轴和交叉轴

```css
flex-direction: row;
```

```text
主轴：水平
交叉轴：垂直
```

```css
flex-direction: column;
```

```text
主轴：垂直
交叉轴：水平
```

因此 `justify-content` 不是永远控制水平，必须先看 `flex-direction`。

## 八、Grid（网格布局）

Grid 适合同时管理行和列，尤其适合卡片列表和页面分区。

```css
.cardGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
```

拆开理解：

- `repeat(2, ...)`：重复两列；
- `1fr`：占用一份可用空间；
- 两个 `1fr`：两列平均分配；
- `minmax(0, 1fr)`：最小可以收缩到 0，最大占一份空间；
- `gap`：行列之间的距离。

为什么不只写 `1fr 1fr`？

某些长文本或子元素可能拥有默认最小宽度，`minmax(0, 1fr)` 允许网格列真正收缩，再配合 `overflow-wrap` 避免溢出。

## 九、Flexbox 与 Grid 如何选择

```text
主要是一行或一列 → Flexbox
需要明确控制多行多列 → Grid
```

例如：

```text
Header 导航 → Flexbox
Hero 左右两部分 → Grid
卡片列表 → Grid
按钮组 → Flexbox
卡片内部图标、文字、箭头 → Grid 或 Flexbox 都可以
```

不要问“哪一个更高级”，而要问“当前布局是一维还是二维”。

## 十、响应式设计

Responsive Design（响应式设计）不是缩小字体，而是根据可用空间重新组织内容。

桌面端：

```text
Hero 文案 | 轨道图形
卡片      | 卡片
```

手机端：

```text
Hero 文案
轨道图形
卡片
卡片
```

当前项目使用 Media Query（媒体查询）：

```css
@media (max-width: 600px) {
  .contentGrid {
    grid-template-columns: 1fr;
  }
}
```

含义是：视口宽度不超过 `600px` 时，卡片改成一列。

### 不要按具体手机型号设计

断点应该来自“内容什么时候放不下”，而不是记住某款手机的尺寸。

当前可以使用：

```text
大于 820px：桌面布局
601px ～ 820px：平板/窄桌面布局
不超过 600px：手机布局
```

## 十一、min、max、clamp

### `min()`

```css
width: min(1180px, calc(100% - 48px));
```

浏览器从两个值中选择更小的一个：

- 大屏幕最多 `1180px`；
- 小屏幕保留左右共 `48px` 空间。

### `clamp()`

```css
font-size: clamp(3.4rem, 6.4vw, 6.25rem);
```

参数是：

```text
clamp(最小值, 理想变化值, 最大值)
```

标题会随视口变化，但不会小于最小值，也不会无限变大。

### `calc()`

```css
width: calc(100% - 48px);
```

让浏览器计算不同单位和值之间的结果。

## 十二、Global CSS 与 CSS Modules

### `app/globals.css`

适合真正影响全站的内容：

- 全局颜色变量；
- `box-sizing`；
- `body` 背景和字体；
- 滚动条；
- 文本选择颜色；
- 全站基础重置。

### `*.module.css`

适合某个页面或组件的样式：

- `page.module.css`：首页；
- `Header.module.css`：Header；
- `Footer.module.css`：Footer；
- `Card.module.css`：卡片；
- `collection.module.css`：Projects 和 Tools 列表页。

Next.js 会为 CSS Module 生成局部类名，减少 `.card`、`.title` 等常用名称发生冲突。

Day 4 继续使用 CSS Modules，不同时把所有代码改写成 Tailwind。一次只掌握一套主要表达方式，更容易理解 CSS 原理。

## 十三、交互状态与无障碍

一个链接不能只有默认状态：

```css
.link:hover {
  color: var(--accent);
}

.link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 38%, transparent);
  outline-offset: 4px;
}
```

- `:hover`：鼠标移到元素上；
- `:focus-visible`：键盘导航焦点；
- `outline`：焦点轮廓，不要无理由删除；
- 颜色之外还可以使用边框、下划线或位移，避免只依赖颜色传递状态。

动画必须尊重用户的系统设置：

```css
@media (prefers-reduced-motion: reduce) {
  .link {
    transition: none;
  }
}
```

## 十四、Day 4 完整任务

### 任务 1：整理全局设计变量

在 `app/globals.css` 的 `:root` 中统一变量：

```css
:root {
  --background: #f8f9fc;
  --surface: #ffffff;
  --foreground: #172036;
  --muted: #637089;
  --line: #dce2eb;
  --accent: #5d63e7;
  --accent-soft: #eef0ff;
  --content-width: 1180px;
}
```

然后把 `page.module.css` 中可以共用的同名颜色改为读取这些全局变量。不要一次删除所有页面局部变量，修改后逐项检查效果是否一致。

### 任务 2：给 Header 添加模块化样式

创建：

```text
components/Header.module.css
```

在 `Header.tsx` 导入：

```tsx
import styles from "./Header.module.css";
```

建议结构：

```tsx
<header className={styles.header}>
  <nav className={styles.navigation} aria-label="主要导航">
    <Link className={styles.brand} href="/">MY SPACE</Link>

    <div className={styles.links}>
      <Link href="/">首页</Link>
      <Link href="/projects">项目</Link>
      <Link href="/tools">工具集</Link>
    </div>
  </nav>
</header>
```

样式目标：

- 内容最大宽度与首页一致；
- 使用 Flexbox 横向排列；
- 品牌名称和导航分居两侧；
- 链接有 hover 和 focus-visible；
- 手机端间距收紧，但不能挤出屏幕；
- 不使用固定高度裁切文字。

### 任务 3：给 Footer 添加模块化样式

创建：

```text
components/Footer.module.css
```

Footer 至少包含：

```tsx
<footer className={styles.footer}>
  <div className={styles.inner}>
    <p>© 2026 我的个人网站</p>
    <p>持续学习，持续构建。</p>
  </div>
</footer>
```

桌面端可以两端对齐，手机端可以改为垂直排列。

### 任务 4：为卡片建立共享样式

创建：

```text
components/Card.module.css
```

`ProjectCard.tsx` 与 `ToolCard.tsx` 都导入同一份样式：

```tsx
import styles from "./Card.module.css";
```

卡片基础结构：

```tsx
<article className={styles.card}>
  <Heading className={styles.title}>{title}</Heading>
  <p className={styles.description}>{description}</p>
</article>
```

ToolCard 的外部链接增加：

```tsx
className={styles.action}
```

共享样式的目的不是少写几行，而是保证同类内容在首页、Projects 和 Tools 页面拥有一致语言。

### 任务 5：样式化 Projects 和 Tools 页面

创建共享页面样式：

```text
app/collection.module.css
```

在两个页面分别导入：

```tsx
import styles from "../collection.module.css";
```

页面结构建议：

```tsx
<main className={styles.page}>
  <header className={styles.heading}>
    <p className={styles.eyebrow}>PROJECTS</p>
    <h1>我的项目</h1>
    <p>整理正在推进和已经完成的项目。</p>
  </header>

  <section className={styles.grid} aria-label="项目列表">
    {/* 卡片 */}
  </section>
</main>
```

Tools 页面采用相同结构，但使用自己的真实文案。这里复用的是布局规则，不是把两个页面写成同一个组件。

### 任务 6：完成响应式规则

检查并补齐三个宽度层级：

```css
/* 默认：桌面 */
.grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 平板 */
@media (max-width: 820px) {
  /* 只调整确实放不下的内容 */
}

/* 手机 */
@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

手机端重点检查：

- Header 不溢出；
- Hero 标题不会被裁切；
- 卡片变成单列；
- 按钮和链接容易点击；
- Footer 不拥挤；
- 页面没有横向滚动。

### 任务 7：理解并整理现有 page.module.css

当前 `page.module.css` 很紧凑，多条规则写在同一行，不利于学习和维护。把你本次需要修改的规则格式化成易读形式：

```css
.contentGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  padding-top: 22px;
}
```

不要求今天手动格式化整个文件，但以后新增或修改的 CSS 必须保持一行一个属性、层级清晰。

### 任务 8：运行工程检查

启动网站：

```powershell
npm run dev
```

- `npm`：Node Package Manager（Node 包管理器）；
- `run`：运行 `package.json` 中定义的脚本；
- `dev`：development（开发环境）；
- 预期结果：显示本地地址，通常为 `http://localhost:3000`。

代码规范检查：

```powershell
npm run lint
```

- 运行 ESLint（代码规范检查工具）；
- 预期结果：没有错误。

类型检查：

```powershell
npx tsc --noEmit
```

- `npx`：运行项目依赖中的命令；
- `tsc`：TypeScript Compiler（TypeScript 编译器）；
- `--noEmit`：只检查类型，不生成文件；
- 通过时通常没有输出。

生产构建：

```powershell
npm run build
```

- `build`：生成 Production（生产环境）版本；
- 它能发现只在正式构建阶段出现的问题；
- Next.js 可能以与开发环境不同的顺序合并和拆分 CSS，所以必须检查构建；
- 预期结果：构建成功，所有路由生成完成。

## 十五、浏览器验收矩阵

检查三个页面：

```text
/
/projects
/tools
```

检查三个宽度：

```text
1280px：桌面
768px：平板
390px：手机
```

每个宽度确认：

- Header 和 Footer 正常；
- 文字没有被裁切；
- 卡片没有超出容器；
- 没有横向滚动条；
- 链接可以点击；
- 使用 Tab 键时焦点可见；
- 鼠标悬停有明确反馈；
- 页面内容顺序保持合理；
- 放大浏览器文字后仍可阅读。

## 十六、常见错误

### 1. 使用固定宽度导致手机溢出

危险写法：

```css
width: 1180px;
```

更安全：

```css
width: min(1180px, calc(100% - 48px));
```

### 2. 用 overflow hidden 隐藏问题

不要为了消除横向滚动直接给整个页面添加：

```css
overflow-x: hidden;
```

这只会隐藏超出的内容。应该找到真正过宽的元素。

### 3. 删除 outline

不要写：

```css
outline: none;
```

除非同时提供清晰的替代焦点样式，否则键盘用户不知道当前焦点在哪里。

### 4. Flexbox 主轴理解错误

`justify-content` 控制主轴，主轴会受到 `flex-direction` 影响，并不永远代表水平方向。

### 5. Media Query 相互覆盖

相同优先级时，后出现的规则可能覆盖前面的规则。断点顺序必须保持一致。

### 6. 全部写进 globals.css

全局样式过多容易影响不相关页面。只把真正全站共享的规则放入 `globals.css`。

### 7. 同时重写成 Tailwind

项目支持 Tailwind，不代表今天必须重写。Day 4 的目标是理解布局原理，而不是比较谁的类名更短。

## 十七、自测题

1. CSS 规则由哪三个主要部分组成？
2. 哪些样式通常可以继承？
3. `box-sizing: border-box` 解决什么问题？
4. `margin` 和 `padding` 有什么区别？
5. Flexbox 的主轴由什么决定？
6. 什么场景更适合 Grid？
7. `repeat(2, minmax(0, 1fr))` 表示什么？
8. `gap` 与分别给子元素设置 margin 相比有什么优点？
9. `clamp()` 的三个参数分别是什么？
10. Media Query 的断点应该根据设备型号还是内容选择？
11. Global CSS 和 CSS Modules 的职责有什么区别？
12. 为什么不能只设计 hover，而忽略 focus-visible？
13. 为什么不应该用 `overflow-x: hidden` 掩盖溢出？
14. 为什么生产构建也需要检查 CSS？

## 十八、自测题参考答案

> 建议先独立回答，再展开对照。答案不要求逐字相同，只要包含“判断关键词”并且逻辑正确即可。

### 1. CSS 规则由哪三个主要部分组成？

参考答案：CSS 规则主要由 Selector（选择器）、Property（属性）和 Value（值）组成。

```css
.card {
  padding: 24px;
}
```

- `.card` 是选择器，决定修改哪个元素；
- `padding` 是属性，决定修改什么；
- `24px` 是值，决定修改成什么。

判断关键词：选择器、属性、值。

### 2. 哪些样式通常可以继承？

参考答案：与文字表现相关的属性通常可以从父元素继承，例如 `color`、`font-family`、`font-size` 和 `line-height`。布局和盒模型属性通常不会自动继承，例如 `margin`、`padding`、`border`、`width` 和 `display`。

判断关键词：文字属性通常继承；布局和盒模型通常不继承。

### 3. `box-sizing: border-box` 解决什么问题？

参考答案：它让元素声明的 `width` 和 `height` 包含 content（内容）、padding（内边距）和 border（边框），避免最终尺寸因为增加 padding 或 border 而意外变大，使布局尺寸更容易计算。

判断关键词：宽高包含 padding 和 border、避免尺寸意外增加。

### 4. `margin` 和 `padding` 有什么区别？

参考答案：`margin` 是元素边框外部的距离，用于控制当前元素与其他元素的间隔；`padding` 是边框内部到内容之间的距离，用于控制内容与自身边框的间隔。元素的背景通常会覆盖 padding 区域，但不会覆盖 margin 区域。

判断关键词：margin 在边框外；padding 在边框内。

### 5. Flexbox 的主轴由什么决定？

参考答案：主轴由 `flex-direction` 决定。默认的 `row` 表示主轴水平，`column` 表示主轴垂直。`justify-content` 控制主轴方向的排列，`align-items` 控制交叉轴方向的对齐。

判断关键词：`flex-direction`、`justify-content` 控制主轴。

### 6. 什么场景更适合 Grid？

参考答案：当布局需要同时管理行和列，或者需要形成明确的二维网格时更适合 Grid，例如项目卡片列表、工具卡片列表和 Hero 左右分区。只处理一行或一列的排列时通常更适合 Flexbox。

判断关键词：二维布局、同时管理行和列。

### 7. `repeat(2, minmax(0, 1fr))` 表示什么？

参考答案：创建两列相同的网格轨道。每列最小可以收缩到 `0`，最大各占一份可用空间，因此两列通常平均分配容器宽度。`minmax(0, 1fr)` 还能减少长内容撑破网格的风险。

判断关键词：两列、平均分配、允许收缩。

### 8. `gap` 与分别给子元素设置 margin 相比有什么优点？

参考答案：`gap` 专门控制布局项目之间的距离，不会给容器最外侧额外增加间距，也不需要处理第一个或最后一个元素的特殊 margin。它在 Flexbox 和 Grid 中都更直观、更容易维护。

判断关键词：只控制项目之间、无需处理首尾元素。

### 9. `clamp()` 的三个参数分别是什么？

参考答案：依次是最小值、理想变化值和最大值。

```css
font-size: clamp(2rem, 5vw, 5rem);
```

字体会尽量根据 `5vw` 随视口变化，但不会小于 `2rem`，也不会大于 `5rem`。

判断关键词：最小值、理想值、最大值。

### 10. Media Query 的断点应该根据设备型号还是内容选择？

参考答案：应该根据内容什么时候开始拥挤、溢出或难以使用来选择，而不是绑定某个具体手机型号。设备尺寸会不断变化，但内容能否正常展示才是断点存在的真正原因。

判断关键词：根据内容和布局，不根据具体设备型号。

### 11. Global CSS 和 CSS Modules 的职责有什么区别？

参考答案：Global CSS（全局样式）适合全站共同使用的规则，例如颜色变量、body、字体、盒模型和滚动条。CSS Modules 适合具体页面或组件的局部样式，会生成局部类名，降低不同页面之间的类名冲突和意外覆盖。

判断关键词：全站基础规则；组件局部规则；减少冲突。

### 12. 为什么不能只设计 hover，而忽略 focus-visible？

参考答案：`hover` 主要服务鼠标操作，键盘用户通过 Tab 键移动焦点时不会获得同样反馈。`:focus-visible` 可以清楚显示当前操作位置，是键盘可访问性的重要基础。触摸设备也不能依赖 hover 才显示必要信息。

判断关键词：键盘用户、显示当前焦点、不能只支持鼠标。

### 13. 为什么不应该用 `overflow-x: hidden` 掩盖溢出？

参考答案：它只会把超出视口的内容裁掉，并没有修复真正过宽的元素。被裁掉的文字、链接或按钮可能无法查看和操作。正确做法是找到造成溢出的固定宽度、长文本、网格最小宽度或定位元素并修复它。

判断关键词：隐藏不等于修复、可能裁掉可操作内容、查找真正原因。

### 14. 为什么生产构建也需要检查 CSS？

参考答案：开发环境和生产环境处理 CSS 的方式可能不同。Next.js 在生产构建时会合并、压缩并进行 Code Splitting（代码拆分），样式加载顺序也可能出现差异。因此开发服务器正常不代表生产构建一定正常，必须运行 `npm run build` 验证。

判断关键词：合并、压缩、拆分、加载顺序可能不同。

## 十九、Day 4 验收清单

- [x] 全局设计变量已整理；
- [x] Header 使用 CSS Module；
- [x] Header 使用 Flexbox；
- [x] Header 在手机宽度不溢出；
- [x] Footer 使用 CSS Module；
- [x] Footer 在手机宽度布局合理；
- [x] ProjectCard 和 ToolCard 使用共享样式；
- [x] Projects 页面拥有清晰页面结构；
- [x] Tools 页面拥有清晰页面结构；
- [x] 卡片列表使用 Grid；
- [x] 1280px 桌面宽度通过；
- [x] 768px 平板宽度通过；
- [x] 390px 手机宽度通过；
- [x] 页面没有横向溢出；
- [x] 链接具有 hover 和 focus-visible；
- [x] 减少动画设置仍然有效；
- [ ] `npm run lint` 通过；
- [ ] `npx tsc --noEmit` 通过；
- [ ] `npm run build` 通过；
- [ ] 能解释 Flexbox 与 Grid 的选择；
- [ ] 能解释 Global CSS 与 CSS Modules 的区别。

### 验收记录

- `ProjectCard` 缺少的 `Card.module.css` 导入已经修正；
- 严格 UI 静态审计通过，0 个问题；
- `/`、`/projects`、`/tools` 已在 1280px、768px、390px 三种宽度验收；
- 9 种路由和视口组合均不存在横向溢出；
- Header、Footer 和页面主要内容均正常渲染；
- 浏览器控制台未发现警告或错误；
- 当前自动检查终端无法找到 `npm` 和 `npx`，lint、TypeScript 和生产构建仍需在本机 Node.js 终端确认；
- 当前页面 `document.title` 为空，属于后续 Metadata（页面元数据）完善项，不属于本日布局验收范围。

## 二十、Git 提交建议

全部验收通过后：

```powershell
git status
```

先确认没有无关文件。

```powershell
git add .
```

- `git add`：加入 Staging Area（暂存区）；
- `.`：当前目录下所有修改。

```powershell
git commit -m "style: add responsive site layout"
```

- `style`：表示主要是样式调整，没有改变业务逻辑；
- `-m`：设置提交说明。

## 一句话总结

Day 4 的核心是根据内容选择 Flexbox 或 Grid，用可维护的 CSS 变量和模块化样式建立统一视觉，并通过媒体查询让同一套内容在桌面、平板和手机上都清晰可用。
