import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(testsDir);
const seedSql = readFileSync(join(projectRoot, "supabase", "seed.sql"), "utf8");
const projectMigrations = readdirSync(join(projectRoot, "supabase", "migrations"))
  .filter((file) => file.endsWith("_add_travel_recommendation_project.sql"));

test("项目种子数据包含 AI 旅游推荐全栈项目", () => {
  assert.match(seedSql, /travel-recommendation-fullstack/);
  assert.match(seedSql, /AI 旅游推荐全栈项目/);
  assert.match(seedSql, /https:\/\/travel\.dongjinyue\.cn/);
  assert.match(seedSql, /https:\/\/github\.com\/dongjinyue\/travel-recommendation-fullstack/);
});

test("项目迁移以公开状态写入完整项目资料", () => {
  assert.equal(projectMigrations.length, 1);
  const migrationPath = join(projectRoot, "supabase", "migrations", projectMigrations[0]);
  assert.equal(existsSync(migrationPath), true);
  const migrationSql = readFileSync(migrationPath, "utf8");

  assert.match(migrationSql, /insert into public\.projects/i);
  assert.match(migrationSql, /travel-recommendation-fullstack/);
  assert.match(migrationSql, /is_public\s*,/i);
  assert.match(migrationSql, /hide_from_guests\b/i);
  assert.match(migrationSql, /project_highlights/i);
  assert.match(migrationSql, /project_tags/i);
});
