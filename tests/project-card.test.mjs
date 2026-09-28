import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectCardSource = await readFile(
  new URL("../components/ProjectCard.tsx", import.meta.url),
  "utf8",
);

test("项目体验链接显示为在线浏览", () => {
  assert.match(projectCardSource, /在线浏览/);
  assert.doesNotMatch(projectCardSource, /打开项目/);
});
