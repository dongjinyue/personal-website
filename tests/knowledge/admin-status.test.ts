import assert from "node:assert/strict";
import test from "node:test";

import { summarizeKnowledgeStatus } from "../../lib/knowledge/status";
import type { KnowledgeSnapshot } from "../../lib/knowledge/snapshot";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

function note(slug: string, visibility: "public" | "private", status: "published" | "draft"): KnowledgeNoteSource {
  return {
    path: `notes/programming/${slug}.md`,
    title: slug,
    slug,
    visibility,
    status,
    tags: [],
    category: "programming",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-10",
    description: null,
    markdown: "测试正文",
  };
}

test("管理员状态只汇总数量和短版本，不返回笔记正文", () => {
  const snapshot: KnowledgeSnapshot = {
    version: "a".repeat(40),
    generatedAt: "2026-09-10T12:00:00.000Z",
    notes: [
      note("public", "public", "published"),
      note("private", "private", "published"),
      note("draft", "public", "draft"),
    ],
    diagnostics: [],
  };

  const status = summarizeKnowledgeStatus(snapshot);
  assert.equal(status.total, 3);
  assert.equal(status.publicPublished, 1);
  assert.equal(status.privateCount, 1);
  assert.equal(status.draftCount, 1);
  assert.equal(status.version.length, 7);
  assert.doesNotMatch(JSON.stringify(status), /测试正文/);
});

test("管理员诊断只保留相对路径与固定错误说明", () => {
  const snapshot: KnowledgeSnapshot = {
    version: "b".repeat(40),
    generatedAt: "2026-09-10T12:00:00.000Z",
    notes: [],
    diagnostics: [
      {
        path: "notes/ai/broken.md",
        code: "invalid-frontmatter",
        message: "YAML 报错包含 C:\\private\\key.pem 和 secret-token",
      },
      {
        path: "C:\\private\\other.md",
        code: "duplicate-slug",
        message: "包含私密绝对路径",
      },
    ],
  };

  const status = summarizeKnowledgeStatus(snapshot, {
    path: "knowledge-source",
    code: "source-error",
    message: "仓库位于 /home/ubuntu/secret-vault",
  });

  assert.deepEqual(status.diagnostics.map(({ path, code }) => ({ path, code })), [
    { path: "notes/ai/broken.md", code: "invalid-frontmatter" },
    { path: "knowledge-source", code: "duplicate-slug" },
    { path: "knowledge-source", code: "source-error" },
  ]);
  assert.doesNotMatch(JSON.stringify(status), /C:\\\\private|secret-token|home\/ubuntu|key\.pem/);
});
