import assert from "node:assert/strict";
import test from "node:test";
import { getPaginationItems } from "./pagination.ts";

test("页数较少时显示全部页码", () => {
  assert.deepEqual(getPaginationItems(2, 4), [1, 2, 3, 4]);
});

test("位于中间页时保留首尾页和相邻页", () => {
  assert.deepEqual(getPaginationItems(6, 12), [
    1,
    "start-ellipsis",
    5,
    6,
    7,
    "end-ellipsis",
    12,
  ]);
});

test("靠近开头或结尾时不会重复显示省略号", () => {
  assert.deepEqual(getPaginationItems(2, 12), [1, 2, 3, 4, 5, "end-ellipsis", 12]);
  assert.deepEqual(getPaginationItems(11, 12), [1, "start-ellipsis", 8, 9, 10, 11, 12]);
});

test("没有分页数据时不生成页码", () => {
  assert.deepEqual(getPaginationItems(1, 0), []);
});
