import assert from "node:assert/strict";
import test from "node:test";

import {
  canReadKnowledgeNote,
  filterVisibleNotes,
  selectKnowledgeNavigationGroups,
  selectKnowledgeNavigationNotes,
  type KnowledgeViewer,
} from "../../lib/knowledge/access";
import { searchKnowledge } from "../../lib/knowledge/query";
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
    tags: ["React"],
    category: "programming",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-10",
    description: null,
    markdown: "公开正文",
    ...overrides,
  };
}

test("游客只能读取公开且已发布的笔记", () => {
  const notes = [
    note("react-server-components"),
    note("private-note", {
      visibility: "private",
      markdown: "私密检索词",
    }),
    note("draft-note", { status: "draft", markdown: "草稿检索词" }),
  ];

  assert.deepEqual(filterVisibleNotes(notes, guest).map((item) => item.slug), [
    "react-server-components",
  ]);
  assert.equal(canReadKnowledgeNote(notes[1], guest), false);
  assert.equal(canReadKnowledgeNote(notes[2], guest), false);
  assert.equal(canReadKnowledgeNote(notes[1], admin), true);
});

test("知识库导航只返回游客可见的最新笔记，并且不包含正文", () => {
  const notes = [
    note("older-public", { title: "较早公开笔记", updatedAt: "2026-09-10" }),
    note("newer-public", { title: "最新公开笔记", updatedAt: "2026-09-20" }),
    note("private-note", {
      title: "私密笔记标题",
      visibility: "private",
      updatedAt: "2026-09-24",
      markdown: "不能发送给游客的正文",
    }),
    note("draft-note", {
      title: "草稿标题",
      status: "draft",
      updatedAt: "2026-09-23",
    }),
  ];

  assert.deepEqual(selectKnowledgeNavigationNotes(notes, guest, 1), [
    {
      slug: "newer-public",
      title: "最新公开笔记",
      category: "programming",
      updatedAt: "2026-09-20",
    },
  ]);
});

test("管理员的知识库导航可包含私密和草稿笔记", () => {
  const notes = [
    note("private-note", { visibility: "private", updatedAt: "2026-09-20" }),
    note("draft-note", { status: "draft", updatedAt: "2026-09-23" }),
  ];

  assert.deepEqual(selectKnowledgeNavigationNotes(notes, admin).map((item) => item.slug), [
    "draft-note",
    "private-note",
  ]);
});

test("知识库分类菜单按分类分组、保留空分类并限制访客分类元数据", () => {
  const notes = [
    note("public-frontend", {
      category: "前端",
      updatedAt: "2026-09-22",
    }),
    note("private-backend", {
      category: "后端",
      visibility: "private",
      updatedAt: "2026-09-24",
    }),
  ];

  assert.deepEqual(selectKnowledgeNavigationGroups(notes, ["前端", "后端", "数据库"], guest), [
    { category: "前端", count: 1, notes: [{ slug: "public-frontend", title: "public-frontend", category: "前端", updatedAt: "2026-09-22" }] },
  ]);
  assert.deepEqual(selectKnowledgeNavigationGroups(notes, ["前端", "后端", "数据库"], admin).map((group) => ({
    category: group.category,
    count: group.count,
    slugs: group.notes.map((item) => item.slug),
  })), [
    { category: "后端", count: 1, slugs: ["private-backend"] },
    { category: "前端", count: 1, slugs: ["public-frontend"] },
    { category: "数据库", count: 0, slugs: [] },
  ]);
});

test("游客搜索不会返回私密或草稿内容", () => {
  const notes = [
    note("public-note", { markdown: "公开检索词" }),
    note("private-note", { visibility: "private", markdown: "私密检索词" }),
    note("draft-note", { status: "draft", markdown: "草稿检索词" }),
  ];

  assert.equal(searchKnowledge(notes, "私密检索词", guest).length, 0);
  assert.equal(searchKnowledge(notes, "草稿检索词", guest).length, 0);
  assert.deepEqual(searchKnowledge(notes, "私密检索词", admin).map((item) => item.slug), [
    "private-note",
  ]);
});
