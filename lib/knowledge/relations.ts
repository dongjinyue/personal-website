import { analyzeMarkdown } from "./markdown";
import type { KnowledgeNoteSource } from "./types";

export type KnowledgeRelations = {
  outgoingBySlug: ReadonlyMap<string, readonly string[]>;
  backlinksBySlug: ReadonlyMap<string, readonly string[]>;
  brokenBySlug: ReadonlyMap<string, readonly string[]>;
};

/** 基于传入的可见笔记集合建立关系，附件引用不会进入笔记关系图。 */
export function buildKnowledgeRelations(
  notes: readonly KnowledgeNoteSource[],
): KnowledgeRelations {
  const validSlugs = new Set(notes.map((note) => note.slug));
  const outgoing = new Map<string, Set<string>>();
  const backlinks = new Map<string, Set<string>>();
  const broken = new Map<string, Set<string>>();

  for (const note of notes) {
    outgoing.set(note.slug, new Set());
    backlinks.set(note.slug, new Set());
    broken.set(note.slug, new Set());
  }

  for (const note of notes) {
    for (const { target } of analyzeMarkdown(note.markdown).links) {
      if (validSlugs.has(target)) {
        outgoing.get(note.slug)?.add(target);
        backlinks.get(target)?.add(note.slug);
      } else {
        broken.get(note.slug)?.add(target);
      }
    }
  }

  const freezeMap = (source: Map<string, Set<string>>) =>
    new Map(
      [...source].map(([slug, values]) => [slug, Object.freeze([...values].sort())] as const),
    );

  return Object.freeze({
    outgoingBySlug: freezeMap(outgoing),
    backlinksBySlug: freezeMap(backlinks),
    brokenBySlug: freezeMap(broken),
  });
}

