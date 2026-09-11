import assert from "node:assert/strict";
import test from "node:test";
import { buildKnowledgeRelations } from "../../lib/knowledge/relations";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

function note(slug: string, markdown: string): KnowledgeNoteSource {
  return {
    path: `notes/${slug}.md`,
    title: slug,
    slug,
    visibility: "public",
    status: "published",
    tags: [],
    category: "notes",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-10",
    description: null,
    markdown,
  };
}

test("构建去重且稳定排序的出链、反向链接和失效链接", () => {
  const relations = buildKnowledgeRelations([
    note(
      "source",
      "[[target#标题]] [[target|别名]] [普通内链](/knowledge/another) [[missing]] ![[image.png]]",
    ),
    note("target", "[[another]]"),
    note("another", "无链接"),
  ]);

  assert.deepEqual(relations.outgoingBySlug.get("source"), ["another", "target"]);
  assert.deepEqual(relations.backlinksBySlug.get("target"), ["source"]);
  assert.deepEqual(relations.backlinksBySlug.get("another"), ["source", "target"]);
  assert.deepEqual(relations.brokenBySlug.get("source"), ["missing"]);
  assert.deepEqual(relations.backlinksBySlug.has("image.png"), false);
});

test("代码与附件嵌入不会污染关系图", () => {
  const relations = buildKnowledgeRelations([
    note("source", "`[[inline]]`\n```md\n[[fenced]]\n```\n![[diagram.png]]"),
  ]);

  assert.deepEqual(relations.outgoingBySlug.get("source"), []);
  assert.deepEqual(relations.brokenBySlug.get("source"), []);
});

