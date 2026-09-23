import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { analyzeMarkdown } from "../../lib/knowledge/markdown";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

function note(slug: string, markdown: string): KnowledgeNoteSource {
  return {
    path: `notes/programming/${slug}.md`,
    title: slug,
    slug,
    visibility: "public",
    status: "published",
    tags: [],
    category: "programming",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-10",
    description: null,
    markdown,
  };
}

function renderMarkdown(
  source: KnowledgeNoteSource,
  targets: KnowledgeNoteSource[] = [],
  showBrokenLinkWarnings = false,
): string {
  // 主测试进程使用 react-server 条件；单独启动普通 Node 进程验证最终 HTML。
  const helperPath = path.join(process.cwd(), "tests/knowledge/render-markdown.ts");
  const result = spawnSync(process.execPath, ["--import", "tsx", helperPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: JSON.stringify({ source, targets, showBrokenLinkWarnings }),
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("识别双链、别名、标题和块锚点、图片、目录与 Callout", () => {
  const result = analyzeMarkdown(`
# 一级标题
## 二级标题
参见 [[target-note#API 接口|目标笔记]]、[[target-note#^contract]] 与 [[#本页标题]]。
![[diagrams/架构 图.png|600]]
> [!WARNING] 权限提醒
> 注意权限。
`);

  assert.deepEqual(result.links, [
    { target: "target-note", label: "目标笔记" },
    { target: "target-note", label: "target-note" },
  ]);
  assert.deepEqual(result.assets, ["diagrams/架构 图.png"]);
  assert.deepEqual(
    result.outline.map(({ text }) => text),
    ["一级标题", "二级标题"],
  );
  assert.match(result.safeText, /注意权限/);
  assert.doesNotMatch(result.safeText, /\[!WARNING\]/);
});

test("识别普通 Markdown 内链与图片，并排除外链和代码中的伪语法", () => {
  const result = analyzeMarkdown(`
[普通内链](/knowledge/markdown-note#section)
[相对笔记](markdown-relative.md)
[外部网站](https://example.com)
![普通图片](../attachments/photo.png)

\`[[inline-code]] ![[inline.png]]\`

\`\`\`md
[[fenced-code]]
![[fenced.png]]
\`\`\`
`);

  assert.deepEqual(result.links, [
    { target: "markdown-note", label: "普通内链" },
    { target: "markdown-relative", label: "相对笔记" },
  ]);
  assert.deepEqual(result.assets, ["photo.png"]);
  assert.doesNotMatch(result.plainText, /inline-code|fenced-code/);
});

test("原始 HTML、危险协议和脚本内容不进入分析安全文本或渲染结果", () => {
  const markdown =
    '<script>alert(1)</script><img src=x onerror="alert(2)"> [危险](javascript:alert(3))';
  const result = analyzeMarkdown(markdown);

  assert.doesNotMatch(result.safeText, /alert\(|script|onerror/i);

  const html = renderMarkdown(note("safe-note", markdown));
  assert.doesNotMatch(html, /script|onerror|javascript:|alert\(/i);
});

test("服务端渲染安全链接、附件地址、Callout 和可复制代码块", () => {
  const source = note(
    "source-note",
    `参见 [[target-note#API 接口|目标笔记]]、[普通链接](target-note.md#API%20接口) 与 [[missing-note]]。

![[diagrams/架构 图.png]]

![普通图片](../attachments/photo.png)

> [!TIP] 小技巧
> 使用服务端组件。

\`\`\`ts
const value = 1;
\`\`\``,
  );
  const target = note("target-note", "# 目标");
  const html = renderMarkdown(source, [target], true);

  assert.match(html, /href="\/knowledge\/target-note#api-%E6%8E%A5%E5%8F%A3"/);
  assert.match(
    html,
    /src="\/knowledge-assets\/source-note\/diagrams\/%E6%9E%B6%E6%9E%84%20%E5%9B%BE.png"/,
  );
  assert.match(html, /src="\/knowledge-assets\/source-note\/photo.png"/);
  assert.match(html, /data-callout="tip"/);
  assert.match(html, /链接不存在/);
  assert.match(html, /<pre><code class="language-ts/);
  assert.match(html, /<button[^>]*>复制<\/button>/);
  assert.match(html, /aria-live="polite"/);
});

test("分析目录与渲染标题共享 GitHub slugger 规则", () => {
  const markdown = `## API 接口：安全？
## API 接口：安全？

[[#API 接口：安全？|本页章节]] [[target-note#API 接口：安全？|跨页章节]]`;
  const result = analyzeMarkdown(markdown);
  const html = renderMarkdown(note("source-note", markdown), [note("target-note", "## API 接口：安全？")]);

  assert.deepEqual(result.outline, [
    { id: "api-接口安全", text: "API 接口：安全？", depth: 2 },
    { id: "api-接口安全-1", text: "API 接口：安全？", depth: 2 },
  ]);
  assert.match(html, /<h2 id="api-接口安全">/);
  assert.match(html, /<h2 id="api-接口安全-1">/);
  assert.match(html, /href="#api-%E6%8E%A5%E5%8F%A3%E5%AE%89%E5%85%A8"/);
  assert.match(html, /href="\/knowledge\/target-note#api-%E6%8E%A5%E5%8F%A3%E5%AE%89%E5%85%A8"/);
  assert.doesNotMatch(html, /user-content-/);
});

test("将合法块锚点放到段落、列表与引用目标并移除可见标记", () => {
  const markdown = `段落内容 ^paragraph-id

- 列表内容 ^list-id

> 引用内容 ^quote-id

[[#^paragraph-id|段落]] [[target-note#^list-id|列表]]`;
  const html = renderMarkdown(note("source-note", markdown), [note("target-note", "目标")]);

  assert.match(html, /<p id="\^paragraph-id">段落内容<\/p>/);
  assert.match(html, /<li id="\^list-id">列表内容<\/li>/);
  assert.match(html, /<blockquote id="\^quote-id">/);
  assert.match(html, /href="#%5Eparagraph-id"/);
  assert.match(html, /href="\/knowledge\/target-note#%5Elist-id"/);
  assert.doesNotMatch(html, /内容 \^paragraph-id|内容 \^list-id|内容 \^quote-id/);
});

test("拒绝残余编码、双重编码和危险附件路径", () => {
  const markdown = `
![[safe/photo.png]]
![[%252e%252e/secret.png]]
![[%2e%2e/secret.png]]
![[folder%252fsecret.png]]
![[folder%255csecret.png]]
![[https%253a%252f%252fevil.test/x.png]]
![[nul%2500.png]]
`;
  const result = analyzeMarkdown(markdown);
  const html = renderMarkdown(note("source-note", markdown));

  assert.deepEqual(result.assets, ["safe/photo.png"]);
  assert.match(html, /\/knowledge-assets\/source-note\/safe\/photo.png/);
  assert.doesNotMatch(html, /secret\.png|evil\.test|nul/);
});

test("别名纯文本只保留别名，无别名时才使用目标", () => {
  const result = analyzeMarkdown("## [[target-note|显示名称]]\n\n[[target-note|别名]] [[plain-target]]");

  assert.equal(result.outline[0].text, "显示名称");
  assert.equal(result.plainText, "显示名称 别名 plain-target");
});

test("使用同一 Markdown AST 识别引用式链接、图片和 Setext 标题并跳过代码与 HTML", () => {
  const result = analyzeMarkdown(`Setext 标题
---

[引用笔记][note-ref] ![引用图片][image-ref]

    [[indented-code]]

<span>[[html-link]]</span>

\`多行
[[code-span]]\`

[note-ref]: target-note.md#章节
[image-ref]: ../attachments/reference.png
`);

  assert.deepEqual(result.outline, [{ id: "setext-标题", text: "Setext 标题", depth: 2 }]);
  assert.deepEqual(result.links, [{ target: "target-note", label: "引用笔记" }]);
  assert.deepEqual(result.assets, ["reference.png"]);
  assert.doesNotMatch(result.plainText, /indented-code|html-link|code-span|note-ref|image-ref/);
});

test("Callout 自定义标题保留在可搜索纯文本中", () => {
  const result = analyzeMarkdown("> [!WARNING] 权限提醒\n> 注意权限。");

  assert.equal(result.plainText, "权限提醒 注意权限。");
});

test("游客看到失效链接文字但不会看到管理提示", () => {
  const html = renderMarkdown(note("source-note", "[[missing-note|失效链接]]"));

  assert.match(html, />失效链接<\/span>/);
  assert.doesNotMatch(html, /链接不存在/);
});

test("游客无法从公开笔记的链接形态区分私密目标和不存在目标", () => {
  const source = note("source-note", "[[private-secret|入口]] [[missing-note|入口]]");
  const privateTarget = { ...note("private-secret", "私密内容"), visibility: "private" as const };
  const html = renderMarkdown(source, [privateTarget]);

  assert.doesNotMatch(html, /private-secret|missing-note|href="\/knowledge\//);
  assert.match(html, /<span>入口<\/span> <span>入口<\/span>/);
  const adminHtml = renderMarkdown(source, [privateTarget], true);
  assert.match(adminHtml, /href="\/knowledge\/private-secret"/);
  assert.match(adminHtml, /链接不存在/);
});

test("代码块保留语法高亮并复制包含原始结尾换行的文本", () => {
  const html = renderMarkdown(note("code-note", "```js\nconst answer = 42;\n```"));

  assert.match(html, /<span class="hljs-keyword">const<\/span>/);
  assert.match(html, /<code[^>]*>.*answer = .*;\n<\/code>/s);
});

test("链接和强调中的图片保持合法结构，源链接单独可访问", () => {
  const html = renderMarkdown(note(
    "image-note",
    "[![架构](../attachments/a.png)](https://example.com)\n\n*![强调图片](../attachments/b.png)*",
  ));

  assert.doesNotMatch(html, /<p[^>]*>(?:(?!<\/p>)[\s\S])*<figure/);
  assert.doesNotMatch(html, /<a[^>]*>(?:(?!<\/a>)[\s\S])*<figure/);
  assert.doesNotMatch(html, /<em[^>]*>(?:(?!<\/em>)[\s\S])*<figure/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /<a[^>]*href="https:\/\/example\.com"[^>]*>打开原链接<\/a>/);
  assert.match(html, /aria-label="查看大图：强调图片"/);
});
