import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("authenticated 角色可以在新建工具时写入游客可见性字段", async () => {
  const directory = new URL("../supabase/migrations/", import.meta.url);
  const migrationNames = (await readdir(directory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();
  const migrations = await Promise.all(
    migrationNames.map((name) => readFile(new URL(name, directory), "utf8")),
  );
  const schemaHistory = migrations.join("\n").toLowerCase().replace(/\s+/g, " ");

  assert.match(
    schemaHistory,
    /grant insert \(hide_from_guests\) on public\.tools to authenticated;/,
    "工具新增表单会提交 hide_from_guests，数据库必须授予该列的 INSERT 权限",
  );
});
