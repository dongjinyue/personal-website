import "server-only";

import { getCurrentUser, isAdmin, requireAdmin } from "@/lib/auth/admin";
import { canReadKnowledgeNote, filterVisibleNotes, type KnowledgeViewer } from "./access";
import {
  parseKnowledgeQuery,
  queryKnowledge,
  type KnowledgeQuery,
  type KnowledgeQueryInput,
} from "./query";
import { buildKnowledgeRelations } from "./relations";
import {
  getKnowledgeSnapshot,
  getKnowledgeSourceError,
  type KnowledgeSnapshot,
} from "./snapshot";
import type { KnowledgeDiagnostic, KnowledgeNoteSource } from "./types";

export type KnowledgeListResult = ReturnType<typeof queryKnowledge> & {
  canonicalQuery: KnowledgeQuery;
  isAdmin: boolean;
};

export type KnowledgeRelationItem = Pick<
  KnowledgeNoteSource,
  "slug" | "title" | "category" | "tags" | "createdAt" | "updatedAt" | "description" | "visibility" | "status"
>;

export type KnowledgeDetail = KnowledgeNoteSource & {
  outgoing: KnowledgeRelationItem[];
  backlinks: KnowledgeRelationItem[];
  broken: Array<{ slug: string }>;
  previous: KnowledgeRelationItem | null;
  next: KnowledgeRelationItem | null;
};

export type KnowledgeAdminStatus = {
  version: string;
  generatedAt: string;
  total: number;
  publicPublished: number;
  privateCount: number;
  draftCount: number;
  diagnostics: readonly KnowledgeDiagnostic[];
};

function toRelationItem(note: KnowledgeNoteSource): KnowledgeRelationItem {
  return {
    slug: note.slug,
    title: note.title,
    category: note.category,
    tags: [...note.tags],
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    description: note.description,
    visibility: note.visibility,
    status: note.status,
  };
}

function byCreatedAt(left: KnowledgeNoteSource, right: KnowledgeNoteSource): number {
  return left.createdAt.localeCompare(right.createdAt) || left.slug.localeCompare(right.slug);
}

/**
 * 私密读取只信任 Auth 服务的 getUser 结果。登录服务暂时不可用时，
 * 公开页面降级为游客，绝不使用 claims（声明）快速路径放宽可见范围。
 */
export async function getKnowledgeViewerForCurrentUser(): Promise<KnowledgeViewer> {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.id)) return { role: "guest" };
    return { role: "admin", userId: user.id };
  } catch {
    return { role: "guest" };
  }
}

/**
 * 基于全量关系图再做可见性裁剪：不可读目标不是“失效链接”，
 * 因此不会把私密或草稿 slug 泄漏给游客。
 */
export function getDetailForViewer(
  slug: string,
  viewer: KnowledgeViewer,
  notes: readonly KnowledgeNoteSource[],
): KnowledgeDetail | null {
  const note = notes.find((candidate) => candidate.slug === slug);
  if (!note || !canReadKnowledgeNote(note, viewer)) return null;

  const visibleNotes = filterVisibleNotes(notes, viewer);
  const visibleBySlug = new Map(visibleNotes.map((candidate) => [candidate.slug, candidate]));
  const allRelations = buildKnowledgeRelations(notes);
  const relationItems = (slugs: readonly string[]) =>
    slugs
      .map((relatedSlug) => visibleBySlug.get(relatedSlug))
      .filter((candidate): candidate is KnowledgeNoteSource => Boolean(candidate))
      .map(toRelationItem);
  const ordered = [...visibleNotes].sort(byCreatedAt);
  const index = ordered.findIndex((candidate) => candidate.slug === note.slug);

  return {
    ...note,
    tags: [...note.tags],
    outgoing: relationItems(allRelations.outgoingBySlug.get(note.slug) ?? []),
    backlinks: relationItems(allRelations.backlinksBySlug.get(note.slug) ?? []),
    // 这里的 broken 只来自全量索引真正不存在的目标，而非不可见笔记。
    broken: (allRelations.brokenBySlug.get(note.slug) ?? []).map((relatedSlug) => ({ slug: relatedSlug })),
    previous: index > 0 ? toRelationItem(ordered[index - 1]) : null,
    next: index >= 0 && index < ordered.length - 1 ? toRelationItem(ordered[index + 1]) : null,
  };
}

/** 列表读取先确定真实服务端身份，再以同一可见集合产生所有派生数据。 */
export async function getKnowledgeListForCurrentUser(
  rawQuery: KnowledgeQueryInput,
): Promise<KnowledgeListResult> {
  const viewer = await getKnowledgeViewerForCurrentUser();
  const snapshot = await getKnowledgeSnapshot();
  const visibleNotes = filterVisibleNotes(snapshot.notes, viewer);
  const parsed = parseKnowledgeQuery(rawQuery);
  const result = queryKnowledge(visibleNotes, parsed);
  const canonicalQuery: KnowledgeQuery = {
    ...parsed,
    category: result.categories.some((item) => item.name === parsed.category) ? parsed.category : "",
    tag: result.tags.some((item) => item.name === parsed.tag) ? parsed.tag : "",
    page: result.page,
  };

  return { ...result, canonicalQuery, isAdmin: viewer.role === "admin" };
}

/** 详情在返回 Markdown 和关系数据之前同样执行唯一的服务端权限判断。 */
export async function getKnowledgeNoteForCurrentUser(slug: string): Promise<KnowledgeDetail | null> {
  const viewer = await getKnowledgeViewerForCurrentUser();
  const snapshot = await getKnowledgeSnapshot();
  return getDetailForViewer(slug, viewer, snapshot.notes);
}

/** 管理状态是敏感读取；即使页面布局已经验证过，也在 Repository 再次鉴权。 */
export async function getKnowledgeStatusForAdmin(): Promise<KnowledgeAdminStatus> {
  await requireAdmin();
  const snapshot = await getKnowledgeSnapshot();
  const sourceError = getKnowledgeSourceError();
  return summarizeKnowledgeStatus(snapshot, sourceError);
}

/** 纯汇总函数让管理员状态页的计数规则可独立验证。 */
export function summarizeKnowledgeStatus(
  snapshot: KnowledgeSnapshot,
  sourceError: KnowledgeDiagnostic | null = null,
): KnowledgeAdminStatus {
  const diagnostics = sourceError
    ? [...snapshot.diagnostics, sourceError]
    : [...snapshot.diagnostics];
  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    total: snapshot.notes.length,
    publicPublished: snapshot.notes.filter(
      (note) => note.visibility === "public" && note.status === "published",
    ).length,
    privateCount: snapshot.notes.filter((note) => note.visibility === "private").length,
    draftCount: snapshot.notes.filter((note) => note.status === "draft").length,
    diagnostics,
  };
}
