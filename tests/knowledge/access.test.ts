import assert from "node:assert/strict";
import test from "node:test";

import {
  canReadKnowledgeNote,
  filterVisibleNotes,
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
