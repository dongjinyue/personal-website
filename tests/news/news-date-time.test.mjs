import assert from "node:assert/strict";
import test from "node:test";
import { formatNewsDateTime, getChinaNewsDateRange } from "../../lib/news-date-time.mjs";

test("所选中国自然日转换为 UTC 起点和次日排他终点", () => {
  assert.deepEqual(getChinaNewsDateRange("2026-09-26", "2026-09-26"), {
    startInclusive: "2026-09-25T16:00:00.000Z",
    endExclusive: "2026-09-26T16:00:00.000Z",
  });
});

test("结束日期按次日零点计算，正确跨月和闰日", () => {
  assert.deepEqual(getChinaNewsDateRange("2024-02-29", "2024-03-01"), {
    startInclusive: "2024-02-28T16:00:00.000Z",
    endExclusive: "2024-03-01T16:00:00.000Z",
  });
});

test("拒绝无效日期，避免悄悄扩大或扭曲筛选范围", () => {
  assert.throws(() => getChinaNewsDateRange("2026-02-30"), RangeError);
});

test("新闻时间固定按北京时间显示年月日和时分", () => {
  assert.equal(formatNewsDateTime("2026-09-26T00:00:00.000Z"), "2026/09/26 08:00");
});
