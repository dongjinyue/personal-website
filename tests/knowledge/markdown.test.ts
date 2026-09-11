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

test("服务端渲染安全链接、附件地址、Callout 和非交互代码块", () => {
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
  assert.doesNotMatch(html, /复制|button/);
});
