import assert from "node:assert/strict";
import test from "node:test";
import { getCategoriesFromTools } from "../lib/tool-repository";

test("分类表不可用时可从公开工具生成去重且排序后的分类", () => {
  assert.deepEqual(
    getCategoriesFromTools([
      { category: "后端" },
      { category: "前端" },
      { category: "后端" },
      { category: "" },
    ]),
    ["后端", "前端"],
  );
});
