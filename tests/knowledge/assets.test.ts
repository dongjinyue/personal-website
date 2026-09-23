import assert from "node:assert/strict";
import test from "node:test";

import { getAssetForViewer, normalizeAttachmentPath } from "../../lib/knowledge/asset-policy";
import type { KnowledgeViewer } from "../../lib/knowledge/access";
import { KnowledgeGitError } from "../../lib/knowledge/git-source";
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

let readCount = 0;
const countingSource: KnowledgeSource = {
  ...source,
  async readBinary() {
    readCount += 1;
    return Buffer.from("asset");
  },
};

test("拒绝目录穿越和非图片附件路径", async () => {
  await assert.rejects(() => normalizeAttachmentPath("../secret.png"), /不安全/);
  await assert.rejects(() => normalizeAttachmentPath("icon.svg"), /不支持/);
  assert.equal(await normalizeAttachmentPath(["nested", "photo.webp"]), "nested/photo.webp");
  for (const segment of ["%2e%2e.png", "%252e%252e.png", "bad%2Fname.png", "bad%5Cname.png", "bad%name.png", "a\u0000.png", "https:evil.png"]) {
    await assert.rejects(() => normalizeAttachmentPath([segment]), /不安全/);
  }
});

test("必须先通过笔记权限检查才能读取附件", async () => {
  assert.equal(await getAssetForViewer("private-note", ["secret.png"], guest, snapshot, source), null);
  const asset = await getAssetForViewer("private-note", ["secret.png"], admin, snapshot, source);
  assert.ok(asset);
  assert.equal(asset.contentType, "image/png");
  assert.deepEqual(asset.body, Buffer.from("asset"));
});

test("公开笔记不能借附件路由读取只由私密笔记引用的图片", async () => {
  const mixedSnapshot: KnowledgeSnapshot = {
    ...snapshot,
    notes: [
      { ...snapshot.notes[0], markdown: "![[secret.png]]" },
      { ...snapshot.notes[0], slug: "public-note", visibility: "public", path: "notes/ai/public-note.md", markdown: "![[public.png]]" },
    ],
  };
  readCount = 0;
  assert.equal(await getAssetForViewer("public-note", ["secret.png"], guest, mixedSnapshot, countingSource), null);
  assert.equal(readCount, 0);
});

test("已引用附件的 Git blob 缺失时返回空，不吞没其他来源错误", async () => {
  const missingBlob: KnowledgeSource = { ...source, async readBinary() { throw new KnowledgeGitError("missing-object", "读取文件"); } };
  assert.equal(await getAssetForViewer("private-note", ["secret.png"], admin, snapshot, missingBlob), null);
  const unavailableSource: KnowledgeSource = { ...source, async readBinary() { throw new KnowledgeGitError("operation-failed", "读取文件"); } };
  await assert.rejects(
    () => getAssetForViewer("private-note", ["secret.png"], admin, snapshot, unavailableSource),
    (error: unknown) => error instanceof KnowledgeGitError && error.code === "operation-failed",
  );
});
