import type { KnowledgeNoteSource } from "./types";

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
