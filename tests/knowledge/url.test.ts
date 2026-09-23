import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKnowledgeUrl,
  buildRawKnowledgeUrl,
  parseKnowledgeQuery,
} from "../../lib/knowledge/url";

test("知识库 URL 省略空筛选、默认排序和第一页", () => {
  assert.equal(
    buildKnowledgeUrl({
      q: "React",
      category: "",
      tag: "",
      sort: "updated-desc",
      page: 1,
    }),
    "/knowledge?q=React",
  );
});

test("知识库查询将非法页码和排序恢复为默认值", () => {
  const query = parseKnowledgeQuery({ page: "-4", sort: "bad" });
  assert.equal(query.page, 1);
  assert.equal(query.sort, "updated-desc");
});

test("知识库查询规范化空白并保留合法筛选", () => {
  assert.deepEqual(
    parseKnowledgeQuery({
      q: "  React　Server  ",
      category: " 编程 ",
      tag: " Next.js ",
      sort: "title-asc",
      page: "3",
    }),
    {
      q: "React Server",
      category: "编程",
      tag: "Next.js",
      sort: "title-asc",
      page: 3,
    },
  );
});

test("原始 URL 重建保留重复和未知参数供规范跳转判断", () => {
  assert.equal(
    buildRawKnowledgeUrl({ q: ["React", "Vue"], debug: "1" }),
    "/knowledge?q=React&q=Vue&debug=1",
  );
});
