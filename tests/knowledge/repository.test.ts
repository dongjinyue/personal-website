import assert from "node:assert/strict";
import test from "node:test";

import { filterVisibleNotes, getDetailForViewer, type KnowledgeViewer } from "../../lib/knowledge/access";
import { parseKnowledgeQuery, queryKnowledge } from "../../lib/knowledge/query";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

const guest: KnowledgeViewer = { role: "guest" };

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
    tags: ["React"],
    category: "programming",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-10",
    description: null,
    markdown: "服务端组件可以直接读取服务器数据。",
    ...overrides,
  };
}

test("按权限过滤后搜索、筛选、排序并生成摘要和高亮", () => {
  const visibleNotes = filterVisibleNotes(
    [
      note("react-server-components", { title: "React 服务端组件" }),
      note("private-note", { visibility: "private", markdown: "服务端组件 私密检索词" }),
    ],
    guest,
  );

  const result = queryKnowledge(
    visibleNotes,
    parseKnowledgeQuery({
      q: "服务端组件",
      category: "programming",
      tag: "React",
      sort: "updated-desc",
      page: "1",
    }),
  );

  assert.equal(result.pageSize, 12);
  assert.equal(result.total, 1);
  assert.match(result.items[0].excerpt, /服务端组件/);
  assert.ok(result.items[0].highlights.length > 0);
  assert.deepEqual(result.items[0].highlights, [
    { text: "React ", matched: false },
    { text: "服务端组件", matched: true },
  ]);
  assert.deepEqual(result.categories, [{ name: "programming", count: 1 }]);
  assert.deepEqual(result.tags, [{ name: "React", count: 1 }]);
});

test("规范化非法页码、夹取越界页码并忽略未知筛选", () => {
  const notes = Array.from({ length: 13 }, (_, index) =>
    note(`note-${index}`, {
      title: String.fromCharCode(78 - index),
      createdAt: `2026-09-${String(index + 1).padStart(2, "0")}`,
      updatedAt: `2026-09-${String(index + 1).padStart(2, "0")}`,
    }),
  );

  assert.equal(parseKnowledgeQuery({ page: "bad", sort: "bad" }).page, 1);
  assert.equal(parseKnowledgeQuery({ page: "bad", sort: "bad" }).sort, "updated-desc");

  const unknown = queryKnowledge(notes, parseKnowledgeQuery({ category: "missing", page: "1" }));
  assert.equal(unknown.total, 13);

  const title = queryKnowledge(notes, parseKnowledgeQuery({ sort: "title-asc", page: "1" }));
  assert.equal(title.items[0].title, "B");

  const earliest = queryKnowledge(notes, parseKnowledgeQuery({ sort: "created-asc", page: "1" }));
  assert.equal(earliest.items[0].slug, "note-0");

  const lastPage = queryKnowledge(notes, parseKnowledgeQuery({ page: "99" }));
  assert.equal(lastPage.page, 2);
  assert.equal(lastPage.items.length, 1);
});

test("详情关系、失效链接和相邻笔记不会泄漏私密或草稿 slug", () => {
  const publicRoot = note("public-root", {
    markdown: "[[public-other]] [[private-note]] [[draft-note]] [[missing-note]]",
  });
  const detail = getDetailForViewer(
    "public-root",
    guest,
    [
      publicRoot,
      note("public-other", { createdAt: "2026-09-02" }),
      note("private-note", { visibility: "private" }),
      note("draft-note", { status: "draft" }),
    ],
  );

  assert.ok(detail);
  assert.deepEqual(detail.outgoing.map((item) => item.slug), ["public-other"]);
  assert.deepEqual(detail.broken.map((item) => item.slug), ["missing-note"]);
  assert.deepEqual(detail.backlinks.map((item) => item.slug), []);
  assert.equal(detail.previous, null);
  assert.equal(detail.next?.slug, "public-other");
});
