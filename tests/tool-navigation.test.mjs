import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositorySource = await readFile(
  new URL("../lib/tool-repository.ts", import.meta.url),
  "utf8",
);
const headerStyles = await readFile(
  new URL("../components/Header.module.css", import.meta.url),
  "utf8",
);

test("顶部工具导航不截断当前身份可见的工具", () => {
  assert.doesNotMatch(
    repositorySource,
    /\.slice\(0,\s*16\)/,
    "顶部导航不应只展示前 16 个工具",
  );
});

test("工具分类下拉菜单内容过多时提供内部滚动", () => {
  const megaDropdown = headerStyles.match(/\.megaDropdown\s*\{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(megaDropdown, /max-height:/);
  assert.match(megaDropdown, /overflow-y:\s*auto/);
  assert.match(megaDropdown, /scrollbar-gutter:\s*stable/);
});
