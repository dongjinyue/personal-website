# Day 1：Next.js 基础与 App Router（应用路由）

状态：已完成

## 今天完成了什么

- 创建了 Next.js（React 全栈框架）项目；
- 启用了 TypeScript（类型化 JavaScript）；
- 启用了 Tailwind CSS（原子化 CSS 框架）；
- 使用 App Router（应用路由）；
- 创建了首页、项目页和工具集页面；
- 使用 Link（链接）在页面之间导航；
- 启动了本地开发服务器；
- 将本地代码仓库与 GitHub 远程代码仓库连接；
- 将主分支调整为 `main`，并合并了本地和远程的 Git 历史。

## 核心知识一：Next.js 是什么

React（前端界面库）主要负责构建页面中的用户界面。Next.js 在 React 的基础上补充了路由、构建、服务端能力等项目所需功能。

可以先简单理解为：

```text
React
负责组织和显示界面

Next.js
负责把 React 界面组织成一个完整网站
```

## 核心知识二：文件系统路由

App Router（应用路由）会根据 `app` 目录中的文件夹和 `page.tsx` 自动生成 URL（网页地址）。

```text
app/page.tsx
→ /

app/projects/page.tsx
→ /projects

app/tools/page.tsx
→ /tools
```

这叫 File-system Routing（文件系统路由）。它的好处是页面目录和网页地址具有直接对应关系，项目结构更容易理解和维护。

## 核心知识三：page.tsx 与 layout.tsx

### `page.tsx`

`page.tsx` 表示某一个 URL 对应的页面内容。例如 `app/tools/page.tsx` 就负责 `/tools` 页面。

### `layout.tsx`

`layout.tsx` 表示多个页面共同使用的外层布局。以后可以把 Header（页头导航）和 Footer（页脚）放在根布局中，这样不需要在每个页面重复编写。

根布局可以理解为：

```text
共同的页面外壳
├── Header
├── 当前页面内容
└── Footer
```

其中 `children` 代表当前路由对应的具体页面内容。

## 核心知识四：localhost:3000

运行开发服务器后，浏览器通过 `http://localhost:3000` 访问网站。

- `localhost`：当前这台电脑；
- `3000`：开发服务器使用的 Port（端口）；
- 这个地址只能在本地开发时使用，并不是公开网站地址。

## 核心知识五：Link 导航

Next.js 提供的 `Link` 用来在站内页面之间跳转：

```tsx
import Link from "next/link";

<Link href="/projects">项目</Link>
```

- `href` 表示目标地址；
- `/projects` 对应 `app/projects/page.tsx`；
- 使用 `Link` 可以让 Next.js 进行更流畅的站内导航。

## Git（版本控制工具）知识回顾

项目已经完成本地 Repository（代码仓库）与 GitHub 远程仓库的连接。

因为本地和远程最初各自拥有独立的 Initial Commit（初始提交），所以曾使用：

```powershell
git pull origin main --allow-unrelated-histories
```

- `git pull`：拉取远程内容并合并到当前分支；
- `origin`：远程仓库的默认名称；
- `main`：要拉取的远程分支；
- `--allow-unrelated-histories`：允许合并两个没有共同历史的仓库。

这个参数只用于处理当时的特殊历史问题，平常推送代码时不需要重复使用。

## 常见错误

### 页面访问不到

检查文件名是否准确写成 `page.tsx`，并检查文件夹是否位于 `app` 目录中。

### 点击链接后出现 404

检查 `href` 和目录是否对应。例如 `href="/tools"` 必须有 `app/tools/page.tsx`。

### 本地地址打不开

确认开发服务器是否仍在运行。如果终端已经关闭，网站也会停止。

## 自测题

先不看上文，尝试回答：

1. `app/projects/page.tsx` 对应哪个 URL？
2. `page.tsx` 和 `layout.tsx` 的职责有什么不同？
3. 为什么 `localhost:3000` 不是公开网站地址？
4. 如果要创建 `/notes` 页面，目录应该怎样建立？
5. `Link` 中的 `href` 有什么作用？

## 动手复习

不修改现有项目，先在纸上或脑中推导下面的对应关系：

```text
app/about/page.tsx → ?
app/projects/demo/page.tsx → ?
```

答案分别是 `/about` 和 `/projects/demo`。

## Day 1 验收清单

- [x] `/` 可以访问；
- [x] `/projects` 可以访问；
- [x] `/tools` 可以访问；
- [x] 能解释文件系统路由；
- [x] 能说出 `page.tsx` 与 `layout.tsx` 的区别；
- [x] 已建立本地 Git 与 GitHub 的连接。

## 一句话总结

在 App Router（应用路由）中，`app` 目录结构决定网页地址，`page.tsx` 提供具体页面，`layout.tsx` 提供多个页面共用的外层布局。

