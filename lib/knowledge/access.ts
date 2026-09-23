import type { KnowledgeNoteSource } from "./types";
import { buildKnowledgeRelations } from "./relations";

export type KnowledgeRelationItem = Pick<KnowledgeNoteSource, "slug" | "title" | "category" | "tags" | "createdAt" | "updatedAt" | "description" | "visibility" | "status">;

export type KnowledgeDetail = KnowledgeNoteSource & {
  outgoing: KnowledgeRelationItem[];
  backlinks: KnowledgeRelationItem[];
  broken: Array<{ slug: string }>;
  previous: KnowledgeRelationItem | null;
  next: KnowledgeRelationItem | null;
};

/** 服务端权限层只区分公开游客与经 Auth 服务确认的管理员。 */
export type KnowledgeViewer = { role: "guest" } | { role: "admin"; userId: string };

/** 知识库的唯一可读性判断，避免列表、详情和附件出现不一致的权限分支。 */
export function canReadKnowledgeNote(
  note: KnowledgeNoteSource,
  viewer: KnowledgeViewer,
): boolean {
  return viewer.role === "admin" || (note.visibility === "public" && note.status === "published");
}

/** 在任何内容派生操作前先缩小可见笔记集合，防止私密元数据进入后续索引。 */
export function filterVisibleNotes(
  notes: readonly KnowledgeNoteSource[],
  viewer: KnowledgeViewer,
): KnowledgeNoteSource[] {
  return notes.filter((note) => canReadKnowledgeNote(note, viewer));
}

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

/** 详情关系先使用全量索引判定链接是否存在，再裁剪为当前查看者可见内容。 */
export function getDetailForViewer(slug: string, viewer: KnowledgeViewer, notes: readonly KnowledgeNoteSource[]): KnowledgeDetail | null {
  const note = notes.find((candidate) => candidate.slug === slug);
  if (!note || !canReadKnowledgeNote(note, viewer)) return null;
  const visible = filterVisibleNotes(notes, viewer);
  const bySlug = new Map(visible.map((candidate) => [candidate.slug, candidate]));
  const relations = buildKnowledgeRelations(notes);
  const toItems = (slugs: readonly string[]) => slugs.map((related) => bySlug.get(related)).filter((candidate): candidate is KnowledgeNoteSource => Boolean(candidate)).map(toRelationItem);
  const ordered = [...visible].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.slug.localeCompare(right.slug));
  const index = ordered.findIndex((candidate) => candidate.slug === slug);
  return {
    ...note,
    tags: [...note.tags],
    outgoing: toItems(relations.outgoingBySlug.get(slug) ?? []),
    backlinks: toItems(relations.backlinksBySlug.get(slug) ?? []),
    broken: (relations.brokenBySlug.get(slug) ?? []).map((related) => ({ slug: related })),
    previous: index > 0 ? toRelationItem(ordered[index - 1]) : null,
    next: index >= 0 && index < ordered.length - 1 ? toRelationItem(ordered[index + 1]) : null,
  };
}
