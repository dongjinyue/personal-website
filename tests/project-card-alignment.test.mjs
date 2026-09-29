import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cardSource = await readFile(
  new URL("../components/ProjectCard.tsx", import.meta.url),
  "utf8",
);
const cardStyles = await readFile(
  new URL("../components/Card.module.css", import.meta.url),
  "utf8",
);

test("项目卡片将标签和操作链接固定在底部对齐", () => {
  assert.match(cardSource, /styles\.projectCard/);
  assert.match(cardSource, /styles\.projectFooter/);
  assert.match(cardStyles, /\.projectCard\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/);
  assert.match(cardStyles, /\.projectFooter\s*\{[\s\S]*margin-top:\s*auto;/);
});
