import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerStyles = await readFile(
  new URL("../components/Header.module.css", import.meta.url),
  "utf8",
);

test("顶部导航在滚动时固定在视口顶部", () => {
  assert.match(headerStyles, /\.header\s*\{[\s\S]*position:\s*sticky;/);
  assert.match(headerStyles, /\.header\s*\{[\s\S]*top:\s*0;/);
  assert.match(headerStyles, /\.header\s*\{[\s\S]*z-index:\s*var\(--z-header\);/);
});
