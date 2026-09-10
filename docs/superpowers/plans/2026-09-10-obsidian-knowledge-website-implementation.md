# Obsidian 知识库网站集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 MY SPACE 从服务器私有 Obsidian 仓库安全读取 Markdown，为游客提供公开知识库，为管理员提供包含私密和草稿内容的个人检索工作台。

**Architecture:** Next.js 服务端以知识库当前 Git 提交哈希为一致性边界，从固定提交的 Git 对象建立不可变索引，并在提交变化时原子替换内存缓存。页面只调用 `lib/knowledge` Repository（数据访问层）；所有列表、搜索、链接关系和附件响应都先按服务端身份过滤。

**Tech Stack:** Next.js 16.3.4 App Router（应用路由）、React 19.2.8、TypeScript、Node.js test runner、tsx、gray-matter、react-markdown、remark-gfm、rehype-highlight、rehype-slug、rehype-sanitize、unist-util-visit、Git、PM2

**Spec:** `docs/superpowers/specs/2026-09-10-obsidian-knowledge-website-design.md`

## Global Constraints

- Obsidian 仍是唯一编辑后台，Markdown 文件仍是权威数据源。
- 默认知识库目录固定为 `/home/ubuntu/content/obsidian-vault`；本地只通过 `OBSIDIAN_VAULT_DIR` 覆盖。
- 游客只能读取 `visibility: public` 且 `status: published` 的笔记。
- 管理员身份必须在服务端依据 `lib/auth/admin.ts` 判断。
- 页面、Client Component（客户端组件）和附件 URL 不得包含私密笔记元数据、服务器绝对路径、密钥或令牌。
- Markdown、附件和索引必须从同一个完整 Git 提交读取，不读取正在更新的工作区快照。
- 原始 HTML 不渲染；附件只允许 JPG、JPEG、PNG、WebP、GIF、AVIF。
- 第一版不引入笔记数据库、不提供网页编辑器、不增加注册、会员或付费功能。
- 页面使用简体中文，并复用 `app/globals.css`、`DESIGN.md` 与 `UX-CONTRACT.md` 的现有视觉和行为语言。
- Next.js 页面保持 Server Component（服务端组件）优先；只有搜索交互、代码复制和图片查看使用 Client Component。
- Next.js 16 的 `params` 与 `searchParams` 按 Promise 读取；Route Handler（路由处理器）默认按请求执行。

---

### Task 1: 建立知识库领域模型与 Frontmatter 校验

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/knowledge/types.ts`
- Create: `lib/knowledge/frontmatter.ts`
- Create: `lib/knowledge/text.ts`
- Create: `tests/knowledge/frontmatter.test.ts`
- Create: `tests/fixtures/knowledge-vault/notes/programming/public-note.md`
- Create: `tests/fixtures/knowledge-vault/notes/ai/private-note.md`
- Create: `tests/fixtures/knowledge-vault/notes/projects/draft-note.md`
- Create: `tests/knowledge/prepare-fixture-vault.ps1`

**Interfaces:**
- Produces: `KnowledgeVisibility`, `KnowledgeStatus`, `KnowledgeNoteSource`, `KnowledgeDiagnostic`。
- Produces: `parseKnowledgeNote(path: string, markdown: string): ParseKnowledgeNoteResult`。
- Produces: `normalizeSearchText(value: string): string` 与 `createExcerpt(value: string, query?: string): string`。

- [ ] **Step 1: 安装运行时与测试依赖**

Run:

```powershell
npm install gray-matter react-markdown remark-gfm rehype-highlight rehype-slug rehype-sanitize unist-util-visit
npm install --save-dev tsx
```

Expected: `package.json` 和 `package-lock.json` 更新，不修改 Supabase 依赖。

- [ ] **Step 2: 增加知识库测试命令**

在 `package.json` 的 `scripts` 中加入：

```json
"test:knowledge": "node --import tsx --conditions=react-server --test tests/knowledge/*.test.ts"
```

Run:

```powershell
npm run test:knowledge
```

Expected: FAIL，因为测试目录尚不存在。`react-server` condition（运行条件）让 Node 测试可以加载带 `server-only` 边界的模块，但不会改变生产构建行为。

- [ ] **Step 3: 创建最小测试知识库**

`public-note.md` 使用：

```markdown
---
title: React 服务端组件
slug: react-server-components
visibility: public
status: published
tags: [React, Next.js]
created_at: 2026-09-01
updated_at: 2026-09-10
description: 理解服务端组件的数据边界。
---

# React 服务端组件

服务端组件可以直接读取服务器数据。
```

`private-note.md` 与 `draft-note.md` 分别使用 `visibility: private` 和 `status: draft`，正文放入唯一测试词 `私密检索词` 与 `草稿检索词`。

`prepare-fixture-vault.ps1` 将夹具复制到系统临时目录中的固定子目录，校验目标路径后清理旧副本，初始化 `main` 并提交：

```powershell
$temporaryBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$fixtureRoot = [System.IO.Path]::GetFullPath((Join-Path $temporaryBase "my-space-knowledge-fixture"))
if ([System.IO.Path]::GetDirectoryName($fixtureRoot) -ne $temporaryBase.TrimEnd("\\")) {
  throw "夹具路径不在系统临时目录中"
}
if (Test-Path -LiteralPath $fixtureRoot) { Remove-Item -LiteralPath $fixtureRoot -Recurse -Force }
New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
Copy-Item -LiteralPath "tests/fixtures/knowledge-vault/notes" -Destination $fixtureRoot -Recurse
git -C $fixtureRoot init --initial-branch=main
git -C $fixtureRoot config user.name "Knowledge Fixture"
git -C $fixtureRoot config user.email "knowledge-fixture@example.invalid"
git -C $fixtureRoot add notes
git -C $fixtureRoot commit -m "fixture"
Write-Output $fixtureRoot
```

- [ ] **Step 4: 编写 Frontmatter 失败测试**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseKnowledgeNote } from "../../lib/knowledge/frontmatter";

test("解析合法笔记并从第一层目录得到分类", () => {
  const result = parseKnowledgeNote(
    "notes/programming/react.md",
    `---
title: React
slug: react
visibility: public
status: published
tags: [React]
created_at: 2026-09-01
updated_at: 2026-09-10
---
# 正文`,
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.note.category, "programming");
});

test("拒绝重复 slug 之外的单篇非法字段", () => {
  const result = parseKnowledgeNote("notes/ai/bad.md", "---\ntitle: Bad\n---\n正文");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostic.message, /slug/);
});
```

Run: `npm run test:knowledge`

Expected: FAIL，提示找不到 `lib/knowledge/frontmatter`。

- [ ] **Step 5: 实现领域类型和严格解析**

`types.ts` 定义：

```ts
export type KnowledgeVisibility = "public" | "private";
export type KnowledgeStatus = "published" | "draft";

export type KnowledgeNoteSource = {
  path: string;
  title: string;
  slug: string;
  visibility: KnowledgeVisibility;
  status: KnowledgeStatus;
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  markdown: string;
};

export type KnowledgeDiagnostic = {
  path: string;
  code: "invalid-frontmatter" | "duplicate-slug" | "broken-link" | "missing-asset" | "source-error";
  message: string;
};
```

`frontmatter.ts` 使用 `gray-matter`，逐字段检查字符串、枚举、标签数组、日期顺序和 slug 正则 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。YAML 日期允许解析为 ISO 字符串或 `Date`，随后统一输出 `YYYY-MM-DD`，确保模板中的未加引号日期可用。返回判别联合：

```ts
export type ParseKnowledgeNoteResult =
  | { ok: true; note: KnowledgeNoteSource }
  | { ok: false; diagnostic: KnowledgeDiagnostic };
```

`text.ts` 使用 `normalize("NFKC")`、小写化和连续空白折叠实现中文可预测匹配；摘要最大 160 个字符。

- [ ] **Step 6: 验证并提交**

Run:

```powershell
npm run test:knowledge
npx tsc --noEmit
git diff --check
```

Expected: Frontmatter 与文本测试通过，类型检查退出码为 0。

```powershell
git add -- package.json package-lock.json lib/knowledge tests/knowledge tests/fixtures/knowledge-vault
git commit -m "feat: 建立知识库内容模型"
```

---

### Task 2: 从固定 Git 提交读取并缓存知识库快照

**Files:**
- Create: `lib/knowledge/git-source.ts`
- Create: `lib/knowledge/snapshot.ts`
- Create: `tests/knowledge/git-source.test.ts`
- Create: `tests/knowledge/snapshot.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `parseKnowledgeNote` 与领域类型。
- Produces: `GitKnowledgeSource.getHead(): Promise<string>`、`listFiles(commit, prefix): Promise<string[]>`、`readText(commit, path): Promise<string>`、`readBinary(commit, path): Promise<Buffer>`。
- Produces: `getKnowledgeSnapshot(): Promise<KnowledgeSnapshot>`。
- Produces: `resetKnowledgeSnapshotForTests(): void`，只在测试中清空模块缓存。

- [ ] **Step 1: 编写固定提交读取失败测试**

测试创建临时 Git 仓库并提交 v1，在取得 v1 哈希后再提交 v2；随后断言 `readText(v1, path)` 仍返回 v1：

```ts
assert.equal(await source.readText(firstCommit, "notes/programming/a.md"), firstMarkdown);
assert.equal(await source.readText(secondCommit, "notes/programming/a.md"), secondMarkdown);
```

再加入非法路径用例：

```ts
await assert.rejects(() => source.readText(firstCommit, "../secret"), /不安全/);
```

Run: `npm run test:knowledge`

Expected: FAIL，提示 `GitKnowledgeSource` 不存在。

- [ ] **Step 2: 实现 Git 对象读取器**

`git-source.ts` 顶部加入 `import "server-only"`，并使用参数数组调用 `execFile`，禁止拼接 Shell 命令：

```ts
const DEFAULT_VAULT_DIR = "/home/ubuntu/content/obsidian-vault";
const vaultDir = process.env.OBSIDIAN_VAULT_DIR?.trim() || DEFAULT_VAULT_DIR;

await execGit(["rev-parse", "HEAD"]);
await execGit(["ls-tree", "-r", "--name-only", "-z", commit, "--", prefix]);
await execGitBuffer(["show", `${commit}:${safePath}`]);
```

所有路径先统一为 `/`，拒绝空段、`.`、`..`、反斜杠和绝对路径。Git 进程错误转换为不含绝对路径的中文错误。

- [ ] **Step 3: 编写快照缓存与重复 slug 测试**

```ts
const first = await getKnowledgeSnapshot();
const second = await getKnowledgeSnapshot();
assert.strictEqual(second, first);

await commitAnotherValidNote();
const third = await getKnowledgeSnapshot();
assert.notEqual(third.version, first.version);
```

加入两个文件使用相同 slug 的夹具，断言两篇都不进入有效 notes，且 diagnostics 含两个相对路径。

- [ ] **Step 4: 实现原子快照缓存**

`KnowledgeSnapshot` 包含：

```ts
export type KnowledgeSnapshot = {
  version: string;
  generatedAt: string;
  notes: readonly KnowledgeNoteSource[];
  diagnostics: readonly KnowledgeDiagnostic[];
};
```

`snapshot.ts` 使用模块级 `lastSuccessfulSnapshot` 和按提交哈希保存的 `inFlightBuild`。流程固定为：

1. 读取 HEAD。
2. 与成功快照版本相同时直接返回同一对象。
3. 从该提交列出 `notes/**/*.md`。
4. 全部通过 `commit:path` 读取，不访问工作区正文。
5. 校验重复 slug，冻结结果后一次性替换缓存。
6. 新版本构建失败且存在旧快照时返回旧快照，同时记录只供管理员状态页读取的 source error。

- [ ] **Step 5: 验证并提交**

Run:

```powershell
npm run test:knowledge
npx tsc --noEmit
git diff --check
```

Expected: 固定提交、缓存复用、提交切换、重复 slug 和失败回退测试全部通过。

```powershell
git add -- lib/knowledge/git-source.ts lib/knowledge/snapshot.ts tests/knowledge
git commit -m "feat: 添加知识库 Git 快照缓存"
```

---

### Task 3: 解析 Markdown、Obsidian 链接与内容关系

**Files:**
- Create: `lib/knowledge/markdown.ts`
- Create: `lib/knowledge/obsidian-plugin.ts`
- Create: `lib/knowledge/relations.ts`
- Create: `components/knowledge/KnowledgeMarkdown.tsx`
- Create: `tests/knowledge/markdown.test.ts`
- Create: `tests/knowledge/relations.test.ts`

**Interfaces:**
- Consumes: Task 2 的不可变 `KnowledgeSnapshot`。
- Produces: `analyzeMarkdown(markdown: string): MarkdownAnalysis`，包含纯文本、目录、内部链接和附件引用。
- Produces: `buildKnowledgeRelations(notes): KnowledgeRelations`，按 slug 返回有效出链、失效出链和反向链接。
- Produces: `KnowledgeMarkdown({ note, relations }: Props)` 服务端渲染组件。

- [ ] **Step 1: 编写 Obsidian 语法与安全失败测试**

```ts
test("识别双向链接、别名、图片、目录和 Callout", () => {
  const result = analyzeMarkdown(`
# 一级标题
参见 [[target-note|目标笔记]]。
![[diagram.png]]
> [!WARNING]
> 注意权限。
`);
  assert.deepEqual(result.links, [{ target: "target-note", label: "目标笔记" }]);
  assert.deepEqual(result.assets, ["diagram.png"]);
  assert.equal(result.outline[0].text, "一级标题");
});

test("原始 HTML 与危险协议不进入渲染结果", () => {
  const result = analyzeMarkdown("<script>alert(1)</script> [危险](javascript:alert(1))");
  assert.doesNotMatch(result.safeText, /alert\(1\)/);
});
```

Run: `npm run test:knowledge`

Expected: FAIL，提示分析函数不存在。

- [ ] **Step 2: 实现 Obsidian remark 插件**

`obsidian-plugin.ts` 使用 `unist-util-visit` 只处理文本节点：

- `[[target]]` 转为 `link` 节点，地址为 `/knowledge/target`。
- `[[target|label]]` 使用 label 作为可见文字。
- `![[asset.png]]` 转为带 `data-knowledge-asset` 的 image 节点。
- Blockquote（引用块）第一行匹配 `[!NOTE]`、`[!TIP]`、`[!WARNING]`、`[!ERROR]` 时附加对应安全类型。
- 代码节点和行内代码节点不做替换。

- [ ] **Step 3: 实现分析与关系索引**

`analyzeMarkdown` 输出：

```ts
export type MarkdownAnalysis = {
  plainText: string;
  outline: Array<{ id: string; text: string; depth: 2 | 3 }>;
  links: Array<{ target: string; label: string }>;
  assets: string[];
};
```

`relations.ts` 以合法 slug 集合解析链接，生成：

```ts
export type KnowledgeRelations = {
  outgoingBySlug: ReadonlyMap<string, readonly string[]>;
  backlinksBySlug: ReadonlyMap<string, readonly string[]>;
  brokenBySlug: ReadonlyMap<string, readonly string[]>;
};
```

反向链接只保存 slug，不复制正文。

- [ ] **Step 4: 实现安全 Markdown 渲染组件**

`KnowledgeMarkdown.tsx` 使用 `react-markdown`、`remark-gfm`、自定义 Obsidian 插件、`rehype-slug`、`rehype-highlight` 和受限 `rehype-sanitize` schema。schema 只为代码节点放行 `language-*` 与 `hljs-*` className，不放行事件属性；不要启用 `rehype-raw`。

内部链接统一映射到 `/knowledge/{slug}`；失效链接由页面传入的关系结果决定，管理员渲染“链接不存在”，游客渲染普通文字。附件 URL 固定为：

```ts
`/knowledge-assets/${encodeURIComponent(note.slug)}/${encodedSegments}`
```

- [ ] **Step 5: 验证并提交**

Run:

```powershell
npm run test:knowledge
npx tsc --noEmit
git diff --check
```

Expected: Markdown、危险内容、链接关系和附件引用测试通过。

```powershell
git add -- lib/knowledge components/knowledge/KnowledgeMarkdown.tsx tests/knowledge
git commit -m "feat: 支持 Obsidian Markdown 与链接关系"
```

---

### Task 4: 建立权限过滤、全文搜索、分页与安全附件 Repository

**Files:**
- Create: `lib/knowledge/access.ts`
- Create: `lib/knowledge/repository.ts`
- Create: `lib/knowledge/assets.ts`
- Create: `tests/knowledge/access.test.ts`
- Create: `tests/knowledge/repository.test.ts`
- Create: `tests/knowledge/assets.test.ts`
- Create: `app/knowledge-assets/[slug]/[...path]/route.ts`

**Interfaces:**
- Consumes: Task 2 快照和 Task 3 分析结果。
- Produces: `getKnowledgeListForCurrentUser(query): Promise<KnowledgeListResult>`。
- Produces: `getKnowledgeNoteForCurrentUser(slug): Promise<KnowledgeDetail | null>`。
- Produces: `getKnowledgeAssetForCurrentUser(slug, path): Promise<KnowledgeAsset | null>`。
- Produces: `getKnowledgeStatusForAdmin(): Promise<KnowledgeAdminStatus>`。

- [ ] **Step 1: 编写权限泄露失败测试**

覆盖游客和管理员完整矩阵：

```ts
assert.deepEqual(filterVisibleNotes(notes, "guest").map((note) => note.slug), [
  "react-server-components",
]);
assert.equal(searchKnowledge(notes, "私密检索词", "guest").items.length, 0);
assert.equal(searchKnowledge(notes, "私密检索词", "admin").items.length, 1);
```

再断言游客分类计数、标签计数、反向链接、上一篇和下一篇都不包含 private 或 draft slug。

Run: `npm run test:knowledge`

Expected: FAIL，提示访问过滤函数不存在。

- [ ] **Step 2: 实现唯一权限入口**

`access.ts` 定义：

```ts
export type KnowledgeViewer = { role: "guest" } | { role: "admin"; userId: string };

export function canReadKnowledgeNote(note: KnowledgeNoteSource, viewer: KnowledgeViewer) {
  return viewer.role === "admin"
    || (note.visibility === "public" && note.status === "published");
}
```

`repository.ts` 顶部加入 `import "server-only"`。当前用户只能由会向 Supabase Auth（身份服务）确认身份的 `getCurrentUser()` 和 `isAdmin()` 构造，不能使用只供公开导航优化的 claims 快速路径读取私密内容；身份服务异常按游客处理公开页，`/admin/knowledge` 仍使用 `requireAdmin()`。

- [ ] **Step 3: 编写搜索、筛选、排序和分页测试**

```ts
const result = queryKnowledge(visibleNotes, {
  q: "服务端组件",
  category: "programming",
  tag: "React",
  sort: "updated-desc",
  page: "1",
});
assert.equal(result.pageSize, 12);
assert.match(result.items[0].excerpt, /服务端组件/);
assert.ok(result.items[0].highlights.length > 0);
```

加入非法页码、越界页码、未知分类、标题排序和最早创建排序用例。

- [ ] **Step 4: 实现查询 Repository**

`KnowledgeListResult` 固定包含：

```ts
type KnowledgeListResult = {
  items: KnowledgeListItem[];
  total: number;
  page: number;
  pages: number;
  pageSize: 12;
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  canonicalQuery: KnowledgeQuery;
  isAdmin: boolean;
};
```

处理顺序固定为：权限过滤 → 查询文本匹配 → 分类/标签过滤 → 排序 → 页码夹取 → 摘要和高亮生成。URL 构造集中到 `buildKnowledgeUrl(query)`，不在组件里手写参数拼接。

- [ ] **Step 5: 编写附件安全失败测试**

```ts
await assert.rejects(() => normalizeAttachmentPath("../secret.png"), /不安全/);
await assert.rejects(() => normalizeAttachmentPath("icon.svg"), /不支持/);
assert.equal(await getAssetForViewer("private-note", "secret.png", guest), null);
assert.ok(await getAssetForViewer("private-note", "secret.png", admin));
```

- [ ] **Step 6: 实现附件 Route Handler**

`assets.ts` 先查当前提交中的笔记并执行权限判断，再将附件限制到 `attachments/`，最后调用 `readBinary(snapshot.version, gitPath)`。

`route.ts` 使用 Next.js 16 Promise params：

```ts
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/knowledge-assets/[slug]/[...path]">,
) {
  const { slug, path } = await context.params;
  const asset = await getKnowledgeAssetForCurrentUser(slug, path);
  if (!asset) return new Response("未找到图片。", { status: 404 });
  return new Response(asset.body, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 7: 验证并提交**

Run:

```powershell
npm run test:knowledge
npx tsc --noEmit
git diff --check
```

Expected: 权限矩阵、全文搜索、计数、分页和附件安全测试全部通过。

```powershell
git add -- lib/knowledge app/knowledge-assets tests/knowledge
git commit -m "feat: 添加知识库权限查询与附件接口"
```

---

### Task 5: 构建知识库检索工作台与全站导航入口

**Files:**
- Create: `app/knowledge/page.tsx`
- Create: `app/knowledge/loading.tsx`
- Create: `app/knowledge/error.tsx`
- Create: `app/knowledge/knowledge.module.css`
- Create: `components/knowledge/KnowledgeSearch.tsx`
- Create: `components/knowledge/KnowledgeFilters.tsx`
- Create: `components/knowledge/KnowledgeCard.tsx`
- Modify: `components/HeaderNavigation.tsx`
- Modify: `components/Header.module.css`
- Test: `tests/knowledge/url.test.ts`

**Interfaces:**
- Consumes: Task 4 的列表 Repository 与 `buildKnowledgeUrl`。
- Produces: `/knowledge?q=&category=&tag=&sort=&page=` 动态页面。

- [ ] **Step 1: 编写 URL 规范化失败测试**

```ts
assert.equal(
  buildKnowledgeUrl({ q: "React", category: "", tag: "", sort: "updated-desc", page: 1 }),
  "/knowledge?q=React",
);
assert.equal(parseKnowledgeQuery({ page: "-4", sort: "bad" }).page, 1);
```

Run: `npm run test:knowledge`

Expected: FAIL，直到 Task 4 的 URL 函数满足规范化结果。

- [ ] **Step 2: 实现服务端页面与规范跳转**

`page.tsx`：

```tsx
export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  searchParams,
}: PageProps<"/knowledge">) {
  const rawQuery = await searchParams;
  const result = await getKnowledgeListForCurrentUser(rawQuery);
  // 非规范页码或参数通过 redirect 返回 buildKnowledgeUrl(result.canonicalQuery)。
  return <main>{/* 已过滤的索引、搜索、列表和分页 */}</main>;
}
```

页面明确区分：

- 整库为空：“还没有知识库笔记”，说明从 Obsidian 创建并同步。
- 筛选无结果：“没有符合条件的笔记”，提供清除筛选。
- 正常列表：显示总数、范围和页码。

- [ ] **Step 3: 实现 IME 安全搜索与筛选**

`KnowledgeSearch.tsx` 使用 `useRouter`、`useSearchParams`、300ms debounce（防抖）和 `isComposing`：

```ts
if (event.nativeEvent.isComposing) return;
router.replace(buildClientKnowledgeUrl({ q: value, page: 1 }));
```

非空时显示真实 `button type="button"` 清除按钮，清除后立即更新 URL、取消旧计时器并把焦点还给输入框。

`KnowledgeFilters.tsx` 使用真实链接切换分类、标签和排序；改变任一筛选时将 page 设为 1。

- [ ] **Step 4: 实现列表视觉和响应式布局**

`knowledge.module.css` 使用现有变量：

```css
.workspace {
  display: grid;
  grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr);
  gap: 1.5rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 1rem;
}
@media (max-width: 760px) {
  .workspace { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .card { transition: none; }
}
```

卡片状态同时使用文字与边框/底色，不只依赖颜色。所有触控目标至少 44px。

- [ ] **Step 5: 添加导航入口**

在 `HeaderNavigation.tsx` 的项目与工具之后加入：

```tsx
<GuardedLink
  href="/knowledge"
  onNavigate={() => setOpen(false)}
  aria-current={pathname === "/knowledge" || pathname.startsWith("/knowledge/") ? "page" : undefined}
>
  知识库
</GuardedLink>
```

窄屏检查链接换行和菜单关闭行为；不为知识库增加 Hover（悬停）下拉菜单。

- [ ] **Step 6: 验证并提交**

Run:

```powershell
npm run test:knowledge
npm run lint
npx tsc --noEmit
npm run build
```

Expected: 检索页构建成功，静态检查无错误。

```powershell
git add -- app/knowledge components/knowledge components/HeaderNavigation.tsx components/Header.module.css tests/knowledge
git commit -m "feat: 添加知识库检索工作台"
```

---

### Task 6: 构建笔记详情、代码复制和图片查看

**Files:**
- Create: `app/knowledge/[slug]/page.tsx`
- Create: `app/knowledge/[slug]/not-found.tsx`
- Create: `app/knowledge/[slug]/page.module.css`
- Create: `components/knowledge/CodeBlock.tsx`
- Create: `components/knowledge/KnowledgeImage.tsx`
- Create: `components/knowledge/KnowledgeOutline.tsx`
- Create: `components/knowledge/KnowledgeRelations.tsx`
- Test: `tests/knowledge/detail.test.ts`

**Interfaces:**
- Consumes: Task 4 的 `getKnowledgeNoteForCurrentUser`。
- Produces: `/knowledge/[slug]`，以及最小化的复制和图片查看客户端边界。

- [ ] **Step 1: 编写详情权限与关系失败测试**

```ts
assert.equal(await getDetailForViewer("private-note", guest), null);
assert.equal((await getDetailForViewer("private-note", admin))?.slug, "private-note");
assert.deepEqual(publicDetail.backlinks.map((item) => item.slug), ["public-linker"]);
assert.ok(publicDetail.previous === null || publicDetail.previous.visibility === "public");
```

Run: `npm run test:knowledge`

Expected: FAIL，直到 Repository 返回完整详情模型。

- [ ] **Step 2: 实现动态详情页**

```tsx
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/knowledge/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const note = await getKnowledgeNoteForCurrentUser(slug);
  return note
    ? { title: note.title, description: note.description }
    : { title: "笔记未找到" };
}

export default async function KnowledgeDetailPage({
  params,
}: PageProps<"/knowledge/[slug]">) {
  const { slug } = await params;
  const note = await getKnowledgeNoteForCurrentUser(slug);
  if (!note) notFound();
  return <main>{/* 面包屑、正文、目录和关系 */}</main>;
}
```

私密笔记与不存在笔记使用同一个 `not-found.tsx`，不暴露存在性。

- [ ] **Step 3: 实现代码复制组件**

`CodeBlock.tsx` 只接收已渲染的纯代码字符串和语言名。复制成功显示“已复制”，失败显示“复制失败，请手动选择”，状态区域使用 `aria-live="polite"`；按钮宽度固定，2 秒后恢复。

- [ ] **Step 4: 实现图片查看层**

`KnowledgeImage.tsx` 使用原生 `dialog` 或现有 `ConfirmDialog` 的通用层级模式，但不能复用危险确认语义。要求：

- 缩略图是按钮，保留替代文本。
- 打开后初始焦点在“关闭”。
- Escape 关闭，关闭后焦点返回原图。
- 不通过点击图片关闭。
- 390px 下保留 14px 安全边距。

- [ ] **Step 5: 实现详情排版**

详情桌面布局：

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14rem;
  gap: 2rem;
}
.article { line-height: 1.85; overflow-wrap: anywhere; }
.outline { position: sticky; top: 6rem; align-self: start; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .outline { display: none; }
}
```

标题使用现有 display 字体；正文、表格、代码、Callout 和缺失图片均定义稳定布局。

- [ ] **Step 6: 验证并提交**

Run:

```powershell
npm run test:knowledge
npm run lint
npx tsc --noEmit
npm run build
```

Expected: 详情权限、404、关系和生产构建通过。

```powershell
git add -- app/knowledge components/knowledge tests/knowledge
git commit -m "feat: 添加知识库笔记阅读页"
```

---

### Task 7: 增加管理员只读状态页并维护产品合同

**Files:**
- Create: `app/admin/knowledge/page.tsx`
- Modify: `components/admin/AdminNav.tsx`
- Modify: `app/admin/admin.module.css`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `DESIGN.md`
- Modify: `UX-CONTRACT.md`
- Modify: `CHANGELOG.md`
- Test: `tests/knowledge/admin-status.test.ts`

**Interfaces:**
- Consumes: Task 4 的 `getKnowledgeStatusForAdmin`。
- Produces: 受 `app/admin/layout.tsx` 与 Repository 双重保护的 `/admin/knowledge`。

- [ ] **Step 1: 编写状态汇总失败测试**

```ts
const status = summarizeKnowledgeStatus(snapshot);
assert.equal(status.total, 3);
assert.equal(status.publicPublished, 1);
assert.equal(status.privateCount, 1);
assert.equal(status.draftCount, 1);
assert.equal(status.version.length, 7);
```

Run: `npm run test:knowledge`

Expected: FAIL，提示状态汇总函数不存在。

- [ ] **Step 2: 实现管理员状态页**

`page.tsx` 首行数据逻辑必须为：

```ts
await requireAdmin();
const status = await getKnowledgeStatusForAdmin();
```

页面展示短哈希、解析时间、数量和相对路径诊断，不显示正文、绝对路径、公钥或环境变量。刷新使用现有 `RefreshButton`；它只触发页面重新读取，不执行 Git 拉取。

- [ ] **Step 3: 更新后台导航**

在 `AdminNav.tsx` 添加：

```ts
{ href: "/admin/knowledge", label: "知识库状态" }
```

保持现有 active 判断和移动端换行规则。

- [ ] **Step 4: 更新环境示例与文档**

`.env.example` 增加：

```dotenv
# 本地开发可覆盖；服务器使用默认目录时可以留空
OBSIDIAN_VAULT_DIR=
```

`README.md` 增加知识库路由、运行依赖和本地 vault 配置说明；明确服务器默认路径。

`DESIGN.md` 增加“左侧知识索引 + 右侧检索结果”的知识库视觉签名。

`UX-CONTRACT.md` 增加知识库导航、URL 筛选、权限、搜索清除、详情、图片和管理员状态页规则。

`CHANGELOG.md` 只记录本地已经完成并验证的功能，不提前声称已经部署。

- [ ] **Step 5: 验证并提交**

Run:

```powershell
npm run test:knowledge
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Expected: 全部命令退出码为 0。

```powershell
git add -- app/admin/knowledge components/admin/AdminNav.tsx app/admin/admin.module.css .env.example README.md DESIGN.md UX-CONTRACT.md CHANGELOG.md tests/knowledge
git commit -m "feat: 添加知识库管理员状态与文档"
```

---

### Task 8: 完整浏览器验收与安全审计

**Files:**
- Create: `premium-audit-knowledge.json`

**Interfaces:**
- Consumes: Tasks 1–7 的完整本地功能。
- Produces: 可部署且通过真实游客/管理员流程的构建。

- [ ] **Step 1: 启动带测试知识库的开发服务器**

Run:

```powershell
$env:OBSIDIAN_VAULT_DIR = & 'tests/knowledge/prepare-fixture-vault.ps1'
npm run dev
```

Expected: Next.js 输出本地地址，`/knowledge` 可打开；测试夹具不包含真实笔记。

- [ ] **Step 2: 验证游客流程**

在浏览器检查：

- 导航入口和 `aria-current`。
- 公开列表、全文搜索、高亮、清除、分类、标签、三种排序和页码。
- 公开详情、目录、代码复制、图片查看、反向链接和相邻文章。
- 直接访问 private/draft slug 统一得到 404。
- 页面 HTML 和 RSC（服务端组件载荷）搜索不到 `私密检索词` 与 `草稿检索词`。

- [ ] **Step 3: 验证管理员流程**

使用现有管理员账号登录后检查：

- 列表显示公开、仅管理员和草稿状态。
- 私密与草稿详情可读。
- `/admin/knowledge` 显示版本、计数和测试诊断。
- 退出后浏览器后退不能重新取得私密附件响应。

- [ ] **Step 4: 验证响应式与无障碍状态**

依次检查 1440、1024、768、390px：

- 没有意外横向滚动。
- 手机端筛选在列表前，详情目录隐藏。
- 200% 缩放仍可操作。
- Tab 顺序、焦点环、Escape 关闭和焦点恢复正确。
- `prefers-reduced-motion: reduce` 下没有非必要位移。
- 长标题、长标签、长代码、缺失图片、空库、无结果和源错误保持稳定布局。

- [ ] **Step 5: 运行 Premium UI 静态审计**

Run:

```powershell
python 'C:\Users\24315\.codex\plugins\cache\openai-curated-remote\frontend-design-premium\1.4.0\skills\frontend-design-premium\scripts\audit_project.py' 'C:\Users\24315\Desktop\AI\personal-website' --mode strict --output premium-audit-knowledge.json
```

Expected: 审计 JSON 写入 `premium-audit-knowledge.json`。修复所有 blocking finding（阻断问题），并搜索：

```powershell
rg -n "alert\(|confirm\(|prompt\(|dangerouslySetInnerHTML|javascript:" app/knowledge components/knowledge lib/knowledge
```

Expected: 审计无阻断问题；搜索结果只允许出现在明确的安全测试或协议拒绝逻辑中。

- [ ] **Step 6: 运行最终本地验证**

Run:

```powershell
npm run test:knowledge
npm run lint
npx tsc --noEmit
npm run build
git diff --check
git status --short
```

Expected: 所有检查通过；除用户已有的 `docs/linux-server-service-checklist.md` 外没有意外未跟踪文件。

- [ ] **Step 7: 提交审计证据**

```powershell
git add -- premium-audit-knowledge.json
git commit -m "test: 完成知识库端到端验收"
```

任何审计发现先回到对应 Task 的测试增加失败用例，再修复源文件并重复 Steps 2–6；本步骤最终提交审计证据和由该证据直接要求的修复。

---

### Task 9: 推送并部署到腾讯云服务器

**Files:**
- Modify on server by Git fast-forward: `/home/ubuntu/apps/personal-website`
- Read-only content source: `/home/ubuntu/content/obsidian-vault`
- Existing PM2 app: `personal-website`

**Interfaces:**
- Consumes: Task 8 通过验证的 `main`。
- Produces: 服务器上的 `/knowledge`、`/knowledge/[slug]`、附件路由和 `/admin/knowledge`。

- [ ] **Step 1: 最终部署前检查**

Run locally:

```powershell
git branch --show-current
git status --short
git log -1 --oneline
```

Expected: 当前分支为 `main`；只有已知的用户未跟踪文件，不包含未提交功能修改。

Run on server:

```bash
git -C /home/ubuntu/apps/personal-website branch --show-current
git -C /home/ubuntu/apps/personal-website status --short
git -C /home/ubuntu/content/obsidian-vault status --short
systemctl is-active obsidian-vault-sync.timer
```

Expected: 两个仓库工作区干净；网站分支为 `main`；Timer 为 `active`。

- [ ] **Step 2: 推送已验证的 main**

Run:

```powershell
git push origin main
```

Expected: GitHub `main` 更新到本地已验证提交，不使用 force push（强制推送）。

- [ ] **Step 3: 在服务器快进更新并构建**

服务器使用 Node.js `/home/ubuntu/.nvm/versions/node/v24.20.0/bin`：

```bash
export PATH=/home/ubuntu/.nvm/versions/node/v24.20.0/bin:/usr/bin:/bin
cd /home/ubuntu/apps/personal-website
git pull --ff-only
npm ci --include=dev
npm run test:knowledge
npm run lint
npx tsc --noEmit
npm run build
```

Expected: 构建成功；如果任一命令失败，不重启 PM2，现有线上进程继续运行旧构建。

- [ ] **Step 4: 重启网站并验证进程**

```bash
export PATH=/home/ubuntu/.nvm/versions/node/v24.20.0/bin:/usr/bin:/bin
pm2 restart personal-website --update-env
pm2 save
pm2 show personal-website
```

Expected: `personal-website` 状态为 `online`，工作目录仍为 `/home/ubuntu/apps/personal-website`。

- [ ] **Step 5: 验证线上游客安全**

Run:

```bash
curl --fail --silent --show-error --head http://127.0.0.1/knowledge
curl --fail --silent --show-error http://127.0.0.1/knowledge
```

Expected: 列表返回 200；响应只包含 public + published 笔记。再请求一条私密 slug，必须返回 404；请求对应附件也必须返回 404。

- [ ] **Step 6: 验证线上管理员与同步版本**

在浏览器使用管理员账号检查 `/admin/knowledge` 和一篇现有私密笔记。状态页显示的短哈希必须等于：

```bash
git -C /home/ubuntu/content/obsidian-vault rev-parse --short HEAD
```

再检查最近一次自动同步和网站进程：

```bash
systemctl show obsidian-vault-sync.service -p Result -p ExecMainStatus
journalctl -u obsidian-vault-sync.service --since "15 minutes ago" --no-pager -n 20
```

Expected: `Result=success`、`ExecMainStatus=0`；网站状态页与知识库仓库使用同一提交。提交变化后的缓存替换由 Task 2 自动化测试证明，生产验收不向用户知识库写入临时笔记。

- [ ] **Step 7: 记录真实部署结果**

只在以上线上检查全部通过后更新 `CHANGELOG.md`，记录部署日期、服务器默认知识库路径和自动更新已验证；不记录 IP、密钥、私密标题或正文。

```powershell
git add -- CHANGELOG.md
git commit -m "docs: 记录知识库网站部署验证"
git push origin main
```

Expected: GitHub 与本地 `main` 一致，服务器下一次部署可快进取得文档提交。
