import matter from "gray-matter";

// gray-matter 的间接依赖未提供 TypeScript 声明；只声明这里实际使用的 YAML API。
const yaml = require("js-yaml") as {
  JSON_SCHEMA: unknown;
  load(value: string, options: { schema: unknown }): unknown;
};

import type {
  KnowledgeDiagnostic,
  KnowledgeNoteSource,
  KnowledgeStatus,
  KnowledgeVisibility,
} from "./types";

export type ParseKnowledgeNoteResult =
  | { ok: true; note: KnowledgeNoteSource }
  | { ok: false; diagnostic: KnowledgeDiagnostic };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function invalidFrontmatter(path: string, message: string): ParseKnowledgeNoteResult {
  return {
    ok: false,
    diagnostic: { path, code: "invalid-frontmatter", message },
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isVisibility(value: unknown): value is KnowledgeVisibility {
  return value === "public" || value === "private";
}

function isStatus(value: unknown): value is KnowledgeStatus {
  return value === "published" || value === "draft";
}

/**
 * YAML 会把未加引号的日期转换为 Date；这里同时接受 Date 与 ISO 字符串，
 * 使 Git 中的笔记使用任一写法都得到一致的日期索引。
 */
function normalizeDate(value: unknown): string | null {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    date = new Date(value);
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) return null;

  const normalized = date.toISOString().slice(0, 10);
  const inputDate = typeof value === "string" ? value.slice(0, 10) : normalized;

  // Date 会自动进位无效日期，例如 2026-02-30；应在解析时明确拒绝它。
  return inputDate === normalized ? normalized : null;
}

function categoryFromPath(path: string): string {
  const segments = path.split(/[\\/]+/).filter(Boolean);
  const notesIndex = segments.indexOf("notes");

  return notesIndex >= 0 ? (segments[notesIndex + 1] ?? "") : (segments[0] ?? "");
}

/**
 * 解析并严格校验知识库笔记。解析失败不抛出异常，便于批量索引时继续报告其余文件。
 */
export function parseKnowledgeNote(path: string, markdown: string): ParseKnowledgeNoteResult {
  let parsed: ReturnType<typeof matter>;

  try {
    parsed = matter(markdown, {
      engines: {
        // 禁用 YAML timestamp 自动转换，避免 2026-02-30 被 Date 悄然进位为 3 月 2 日。
        yaml: {
          parse: (value: string) =>
            yaml.load(value, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>,
        },
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知 YAML 解析错误";
    return invalidFrontmatter(path, `Frontmatter 无法解析：${detail}`);
  }

  const { data } = parsed;

  if (!isNonEmptyString(data.title)) {
    return invalidFrontmatter(path, "title 必须是非空字符串");
  }
  if (!isNonEmptyString(data.slug)) {
    return invalidFrontmatter(path, "slug 必须是非空字符串");
  }
  if (!SLUG_PATTERN.test(data.slug)) {
    return invalidFrontmatter(path, "slug 必须匹配小写连字符格式");
  }
  if (!isVisibility(data.visibility)) {
    return invalidFrontmatter(path, "visibility 必须是 public 或 private");
  }
  if (!isStatus(data.status)) {
    return invalidFrontmatter(path, "status 必须是 published 或 draft");
  }
  if (!Array.isArray(data.tags) || !data.tags.every(isNonEmptyString)) {
    return invalidFrontmatter(path, "tags 必须是由非空字符串组成的数组");
  }

  const createdAt = normalizeDate(data.created_at);
  if (!createdAt) {
    return invalidFrontmatter(path, "created_at 必须是有效的 ISO 日期");
  }
  const updatedAt = normalizeDate(data.updated_at);
  if (!updatedAt) {
    return invalidFrontmatter(path, "updated_at 必须是有效的 ISO 日期");
  }
  if (updatedAt < createdAt) {
    return invalidFrontmatter(path, "updated_at 不能早于 created_at");
  }
  if (data.description !== undefined && !isNonEmptyString(data.description)) {
    return invalidFrontmatter(path, "description 必须是非空字符串");
  }

  return {
    ok: true,
    note: {
      path,
      title: data.title,
      slug: data.slug,
      visibility: data.visibility,
      status: data.status,
      tags: data.tags,
      category: categoryFromPath(path),
      createdAt,
      updatedAt,
      description: data.description ?? null,
      markdown: parsed.content,
    },
  };
}
