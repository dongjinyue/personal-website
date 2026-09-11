import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnowledgeSnapshotStore,
  type KnowledgeSource,
} from "../../lib/knowledge/snapshot";

const validNote = (slug: string, title = slug) => `---
title: ${title}
slug: ${slug}
visibility: public
status: published
tags: [测试]
created_at: 2026-09-01
updated_at: 2026-09-10
---
# ${title}
`;

class MemorySource implements KnowledgeSource {
  head = "a".repeat(40);
  files = new Map<string, Buffer>();
  failHead = false;
  failReads = false;
  listCalls = 0;
  readGates = new Map<string, Promise<void>>();
  activeReads = 0;
  maxActiveReads = 0;

  async getHead(): Promise<string> {
    if (this.failHead) throw new Error("仓库位于 C:\\绝对\\秘密路径");
    return this.head;
  }

  async listFiles(): Promise<string[]> {
    this.listCalls += 1;
    return [...this.files.keys()];
  }

  async readText(commit: string, filePath: string): Promise<string> {
    this.activeReads += 1;
    this.maxActiveReads = Math.max(this.maxActiveReads, this.activeReads);
    try {
      await this.readGates.get(commit);
      if (this.failReads) throw new Error("包含 C:\\绝对\\秘密路径");
      const value = this.files.get(filePath);
      if (!value) throw new Error("文件不存在");
      return value.toString("utf8");
    } finally {
      this.activeReads -= 1;
    }
  }

  async readBinary(_commit: string, filePath: string): Promise<Buffer> {
    const value = this.files.get(filePath);
    if (!value) throw new Error("文件不存在");
    return value;
  }
}

test("同一提交复用快照，提交变化后原子替换", async () => {
  const source = new MemorySource();
  source.files.set("notes/programming/a.md", Buffer.from(validNote("a")));
  const store = createKnowledgeSnapshotStore(source);

  const first = await store.getSnapshot();
  const second = await store.getSnapshot();
  assert.strictEqual(second, first);
  assert.equal(source.listCalls, 1);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.notes));

  source.head = "b".repeat(40);
  source.files.set("notes/ai/b.md", Buffer.from(validNote("b")));
  const third = await store.getSnapshot();
  assert.notStrictEqual(third, first);
  assert.equal(third.version, source.head);
  assert.deepEqual(third.notes.map((note) => note.slug), ["b", "a"]);
});

test("重复 slug 的所有笔记都被排除并逐路径报告", async () => {
  const source = new MemorySource();
  source.files.set("notes/ai/first.md", Buffer.from(validNote("same", "第一篇")));
  source.files.set("notes/programming/second.md", Buffer.from(validNote("same", "第二篇")));
  const snapshot = await createKnowledgeSnapshotStore(source).getSnapshot();

  assert.deepEqual(snapshot.notes, []);
  assert.deepEqual(
    snapshot.diagnostics.map(({ path, code }) => ({ path, code })),
    [
      { path: "notes/ai/first.md", code: "duplicate-slug" },
      { path: "notes/programming/second.md", code: "duplicate-slug" },
    ],
  );
});

test("新提交构建失败时保留旧快照并记录脱敏 source error", async () => {
  const source = new MemorySource();
  source.files.set("notes/a.md", Buffer.from(validNote("stable")));
  const store = createKnowledgeSnapshotStore(source);
  const stable = await store.getSnapshot();

  source.head = "c".repeat(40);
  source.failReads = true;
  const fallback = await store.getSnapshot();

  assert.strictEqual(fallback, stable);
  assert.deepEqual(store.getSourceError(), {
    path: "knowledge-source",
    code: "source-error",
    message: "知识库新版本读取失败，当前继续使用上一个成功版本。",
  });
  assert.doesNotMatch(JSON.stringify(store.getSourceError()), /绝对|秘密/);
});

test("首次构建失败时直接报出脱敏错误", async () => {
  const source = new MemorySource();
  source.files.set("notes/a.md", Buffer.from(validNote("broken")));
  source.failReads = true;
  const store = createKnowledgeSnapshotStore(source);

  await assert.rejects(() => store.getSnapshot(), /知识库快照构建失败/);
  assert.doesNotMatch(store.getSourceError()?.message ?? "", /绝对|秘密/);
});

test("读取 HEAD 失败也回退到旧快照，恢复后清除源错误", async () => {
  const source = new MemorySource();
  source.files.set("notes/a.md", Buffer.from(validNote("stable")));
  const store = createKnowledgeSnapshotStore(source);
  const stable = await store.getSnapshot();

  source.failHead = true;
  assert.strictEqual(await store.getSnapshot(), stable);
  assert.equal(store.getSourceError()?.code, "source-error");
  assert.doesNotMatch(store.getSourceError()?.message ?? "", /绝对|秘密/);

  source.failHead = false;
  assert.strictEqual(await store.getSnapshot(), stable);
  assert.equal(store.getSourceError(), null);
});

test("较慢的旧提交构建不会覆盖已经完成的新提交快照", async () => {
  const source = new MemorySource();
  source.files.set("notes/a.md", Buffer.from(validNote("stable")));
  let releaseOld!: () => void;
  source.readGates.set(
    source.head,
    new Promise<void>((resolve) => {
      releaseOld = resolve;
    }),
  );
  const store = createKnowledgeSnapshotStore(source);

  const oldBuild = store.getSnapshot();
  await new Promise((resolve) => setImmediate(resolve));
  source.head = "d".repeat(40);
  const newSnapshot = await store.getSnapshot();
  releaseOld();
  await oldBuild;

  assert.strictEqual(await store.getSnapshot(), newSnapshot);
  assert.equal(source.listCalls, 2);
});

test("已有旧快照时，后续请求不等待正在构建的新提交", async () => {
  const source = new MemorySource();
  source.files.set("notes/a.md", Buffer.from(validNote("stable")));
  const store = createKnowledgeSnapshotStore(source);
  const stable = await store.getSnapshot();

  source.head = "e".repeat(40);
  let releaseNew!: () => void;
  source.readGates.set(
    source.head,
    new Promise<void>((resolve) => {
      releaseNew = resolve;
    }),
  );
  const firstRefresh = store.getSnapshot();
  await new Promise((resolve) => setImmediate(resolve));

  const result = await Promise.race([
    store.getSnapshot(),
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 200)),
  ]);
  assert.strictEqual(result, stable);

  releaseNew();
  assert.equal((await firstRefresh).version, source.head);
});

test("HEAD 失败发生后，先前构建完成不能清除最新源错误", async () => {
  const source = new MemorySource();
  source.files.set("notes/a.md", Buffer.from(validNote("pending")));
  let releaseBuild!: () => void;
  source.readGates.set(
    source.head,
    new Promise<void>((resolve) => {
      releaseBuild = resolve;
    }),
  );
  const store = createKnowledgeSnapshotStore(source);
  const pendingBuild = store.getSnapshot();
  await new Promise((resolve) => setImmediate(resolve));

  source.failHead = true;
  await assert.rejects(() => store.getSnapshot(), /知识库快照构建失败/);
  releaseBuild();
  await pendingBuild;

  assert.equal(store.getSourceError()?.code, "source-error");
});

test("批量构建快照时限制同时进行的 Git 文件读取数", async () => {
  const source = new MemorySource();
  for (let index = 0; index < 12; index += 1) {
    source.files.set(
      `notes/group/note-${index}.md`,
      Buffer.from(validNote(`note-${index}`)),
    );
  }
  let releaseReads!: () => void;
  source.readGates.set(
    source.head,
    new Promise<void>((resolve) => {
      releaseReads = resolve;
    }),
  );

  const pending = createKnowledgeSnapshotStore(source).getSnapshot();
  await new Promise((resolve) => setImmediate(resolve));
  const observedMaximum = source.maxActiveReads;
  releaseReads();
  await pending;

  assert.ok(observedMaximum > 0);
  assert.ok(observedMaximum <= 4, `同时读取了 ${observedMaximum} 个文件`);
});
