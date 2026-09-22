import assert from "node:assert/strict";
import test from "node:test";

import { getAssetForViewer, normalizeAttachmentPath } from "../../lib/knowledge/assets";
import type { KnowledgeViewer } from "../../lib/knowledge/access";
import type { KnowledgeSnapshot, KnowledgeSource } from "../../lib/knowledge/snapshot";

const guest: KnowledgeViewer = { role: "guest" };
const admin: KnowledgeViewer = { role: "admin", userId: "admin-user" };

const snapshot: KnowledgeSnapshot = {
  version: "a".repeat(40),
  generatedAt: "2026-09-10T00:00:00.000Z",
  notes: [{ path: "notes/ai/private-note.md", title: "私密笔记", slug: "private-note", visibility: "private", status: "published", tags: [], category: "ai", createdAt: "2026-09-01", updatedAt: "2026-09-10", description: null, markdown: "![[secret.png]]" }],
  diagnostics: [],
};

const source: KnowledgeSource = {
  async getHead() { return snapshot.version; },
  async listFiles() { return []; },
  async readText() { return ""; },
  async readBinary(commit, path) {
    assert.equal(commit, snapshot.version);
    assert.equal(path, "attachments/secret.png");
    return Buffer.from("asset");
  },
};

test("拒绝目录穿越和非图片附件路径", async () => {
  await assert.rejects(() => normalizeAttachmentPath("../secret.png"), /不安全/);
  await assert.rejects(() => normalizeAttachmentPath("icon.svg"), /不支持/);
  assert.equal(await normalizeAttachmentPath(["nested", "photo.webp"]), "nested/photo.webp");
});

test("必须先通过笔记权限检查才能读取附件", async () => {
  assert.equal(await getAssetForViewer("private-note", ["secret.png"], guest, snapshot, source), null);
  const asset = await getAssetForViewer("private-note", ["secret.png"], admin, snapshot, source);
  assert.ok(asset);
  assert.equal(asset.contentType, "image/png");
  assert.deepEqual(asset.body, Buffer.from("asset"));
});
