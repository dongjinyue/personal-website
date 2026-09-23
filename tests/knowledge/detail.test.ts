import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import {
  getDetailForViewer,
  type KnowledgeViewer,
} from "../../lib/knowledge/access";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

const guest: KnowledgeViewer = { role: "guest" };
const admin: KnowledgeViewer = { role: "admin", userId: "admin-user" };

function note(
  slug: string,
  overrides: Partial<KnowledgeNoteSource> = {},
): KnowledgeNoteSource {
  return {
    path: `notes/programming/${slug}.md`,
    title: slug,
    slug,
    visibility: "public",
    status: "published",
    tags: ["知识库"],
    category: "programming",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-10",
    description: null,
    markdown: "正文",
    ...overrides,
  };
}

function renderMarkdown(source: KnowledgeNoteSource): string {
  const helperPath = path.join(process.cwd(), "tests/knowledge/render-markdown.ts");
  const result = spawnSync(process.execPath, ["--import", "tsx", helperPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: JSON.stringify({ source, targets: [], showBrokenLinkWarnings: false }),
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("详情严格按查看者权限裁剪关系与前后文章", () => {
  const notes = [
    note("older-public", { createdAt: "2026-08-01" }),
    note("public-note", {
      markdown: "[[public-linker]] [[private-note]]",
    }),
    note("public-linker", {
      createdAt: "2026-09-02",
      markdown: "[[public-note]]",
    }),
    note("private-note", {
      createdAt: "2026-09-03",
      visibility: "private",
      markdown: "[[public-note]]",
    }),
  ];

  assert.equal(getDetailForViewer("private-note", guest, notes), null);
  assert.equal(getDetailForViewer("private-note", admin, notes)?.slug, "private-note");

  const publicDetail = getDetailForViewer("public-note", guest, notes);
  assert.ok(publicDetail);
  assert.deepEqual(publicDetail.backlinks.map((item) => item.slug), ["public-linker"]);
  assert.deepEqual(publicDetail.outgoing.map((item) => item.slug), ["public-linker"]);
  assert.ok(publicDetail.previous === null || publicDetail.previous.visibility === "public");
  assert.ok(publicDetail.next === null || publicDetail.next.visibility === "public");
});

test("详情 Markdown 为代码和图片提供可访问的交互入口", () => {
  const html = renderMarkdown(note("interactive-note", { markdown: `\`\`\`ts
const value = 1;
\`\`\`

![[diagrams/架构.png|系统架构]]` }));

  assert.match(html, /<button[^>]*>复制<\/button>/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<button[^>]*aria-label="查看大图：系统架构"/);
  assert.match(html, /<dialog/);
  assert.match(html, /关闭大图/);
});
