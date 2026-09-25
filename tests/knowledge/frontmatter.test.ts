import assert from "node:assert/strict";
import test from "node:test";

import { parseKnowledgeNote } from "../../lib/knowledge/frontmatter";
import { createExcerpt, normalizeSearchText } from "../../lib/knowledge/text";

test("解析合法笔记并从第一层目录得到分类", () => {
  const result = parseKnowledgeNote(
    "notes/programming/react.md",
    `---
title: React
slug: react
visibility: public
status: published
tags: [React]
created_at: 2026-09-01
updated_at: 2026-09-10
---
# 正文`,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.note, {
      path: "notes/programming/react.md",
      title: "React",
      slug: "react",
      visibility: "public",
      status: "published",
      tags: ["React"],
      category: "programming",
      createdAt: "2026-09-01",
      updatedAt: "2026-09-10",
      description: null,
      markdown: "# 正文",
    });
  }
});

test("从嵌套目录生成可读的二级分类名称", () => {
  const result = parseKnowledgeNote(
    "notes/ai/基础/llm-foundations.md",
    `---
title: 大模型基础
slug: llm-foundations
visibility: public
status: published
tags: [基础原理]
created_at: 2026-09-01
updated_at: 2026-09-10
---
正文`,
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.note.category, "AI · 基础");
});

test("非 AI 知识库保留一级主题分类，不被内部子目录拆分", () => {
  const result = parseKnowledgeNote(
    "notes/programming/python/basics.md",
    `---
title: Python 基础
slug: python-basics
visibility: public
status: published
tags: [编程]
created_at: 2026-09-01
updated_at: 2026-09-10
---
正文`,
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.note.category, "programming");
});

test("将 YAML 日期统一为 YYYY-MM-DD", () => {
  const result = parseKnowledgeNote(
    "notes/ai/date.md",
    `---
title: 日期
slug: date
visibility: public
status: published
tags: []
created_at: 2026-09-01
updated_at: "2026-09-10T12:00:00.000Z"
---
正文`,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.note.createdAt, "2026-09-01");
    assert.equal(result.note.updatedAt, "2026-09-10");
  }
});

test("拒绝未加引号的非闰年二月二十九日", () => {
  const result = parseKnowledgeNote(
    "notes/ai/non-leap-day.md",
    `---
title: 非闰年日期
slug: non-leap-day
visibility: public
status: published
tags: []
created_at: 2025-02-29
updated_at: 2026-09-10
---
正文`,
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostic.message, /created_at/);
});

test("拒绝未加引号的二月三十日", () => {
  const result = parseKnowledgeNote(
    "notes/ai/february-thirtieth.md",
    `---
title: 无效日期
slug: february-thirtieth
visibility: public
status: published
tags: []
created_at: 2026-02-30
updated_at: 2026-09-10
---
正文`,
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostic.message, /created_at/);
});

test("接受未加引号的有效闰日", () => {
  const result = parseKnowledgeNote(
    "notes/ai/leap-day.md",
    `---
title: 闰日
slug: leap-day
visibility: public
status: published
tags: []
created_at: 2024-02-29
updated_at: 2026-09-10
---
正文`,
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.note.createdAt, "2024-02-29");
});

test("拒绝缺少 slug 的 Frontmatter", () => {
  const result = parseKnowledgeNote("notes/ai/bad.md", "---\ntitle: Bad\n---\n正文");

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.diagnostic.code, "invalid-frontmatter");
    assert.match(result.diagnostic.message, /slug/);
  }
});

test("拒绝不合法的 slug、标签和枚举字段", () => {
  const result = parseKnowledgeNote(
    "notes/ai/bad-fields.md",
    `---
title: Bad
slug: Bad_slug
visibility: members
status: review
tags: React
created_at: 2026-09-01
updated_at: 2026-09-10
---
正文`,
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostic.message, /slug/);
});

test("拒绝更新时间早于创建时间的笔记", () => {
  const result = parseKnowledgeNote(
    "notes/ai/out-of-order.md",
    `---
title: 时间顺序
slug: date-order
visibility: private
status: draft
tags: []
created_at: 2026-09-10
updated_at: 2026-09-01
---
正文`,
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostic.message, /updated_at/);
});

test("将搜索文本按兼容形式、小写和空白归一化", () => {
  assert.equal(normalizeSearchText("  Ｒｅａｃｔ\n\t服务端　组件  "), "react 服务端 组件");
});

test("摘要限制为 160 个字符并优先保留查询附近的内容", () => {
  const prefix = "前置内容".repeat(50);
  const suffix = "后置内容".repeat(50);
  const excerpt = createExcerpt(`${prefix} 私密检索词 ${suffix}`, "私密检索词");

  assert.ok(excerpt.length <= 160);
  assert.match(excerpt, /私密检索词/);
});
