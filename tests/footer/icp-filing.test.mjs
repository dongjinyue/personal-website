import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const footerSource = await readFile(
  new URL("../../components/Footer.tsx", import.meta.url),
  "utf8",
);

test("页脚展示服务备案号并链接到工信部备案查询", () => {
  assert.match(footerSource, /豫ICP备2026046984号-1/);
  assert.match(footerSource, /href="https:\/\/beian\.miit\.gov\.cn\/?"/);
});

test("页脚展示公安联网备案号并链接到官方查询", () => {
  assert.match(footerSource, /豫公网安备41010502008067号/);
  assert.match(
    footerSource,
    /href="https:\/\/beian\.mps\.gov\.cn\/#\/query\/webSearch\?code=41010502008067"/,
  );
});
