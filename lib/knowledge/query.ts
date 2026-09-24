import { filterVisibleNotes, type KnowledgeViewer } from "./access";
import { analyzeMarkdown } from "./markdown";
import { createExcerpt, findNormalizedMatch, normalizeSearchText } from "./text";
import type { KnowledgeNoteSource } from "./types";
import {
  type KnowledgeQuery,
  type KnowledgeSort,
} from "./url";

export {
  buildClientKnowledgeUrl,
  buildKnowledgeUrl,
  buildRawKnowledgeUrl,
  parseKnowledgeQuery,
  type KnowledgeQuery,
  type KnowledgeQueryInput,
  type KnowledgeSort,
} from "./url";

export type KnowledgeListItem = Pick<
  KnowledgeNoteSource,
  "slug" | "title" | "category" | "tags" | "createdAt" | "updatedAt" | "description" | "visibility" | "status"
> & {
  excerpt: string;
  highlights: Array<{ text: string; matched: boolean }>;
};

export type KnowledgeQueryResult = {
  items: KnowledgeListItem[];
  total: number;
  page: number;
  pages: number;
  pageSize: 12;
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
};

const PAGE_SIZE = 12 as const;

function countValues(values: readonly string[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

function compareNotes(left: KnowledgeNoteSource, right: KnowledgeNoteSource, sort: KnowledgeSort): number {
  if (sort === "title-asc") {
    return left.title.localeCompare(right.title, "zh-Hans-CN") || left.slug.localeCompare(right.slug);
  }
  if (sort === "created-asc") {
    return left.createdAt.localeCompare(right.createdAt) || left.slug.localeCompare(right.slug);
  }
  return right.updatedAt.localeCompare(left.updatedAt) || left.slug.localeCompare(right.slug);
}

function fragmentMatch(value: string, query: string): Array<{ text: string; matched: boolean }> {
  const match = findNormalizedMatch(value, query);
  if (!match) return [];
  return [
    ...(match.start ? [{ text: value.slice(0, match.start), matched: false }] : []),
    { text: value.slice(match.start, match.end), matched: true },
    ...(match.end < value.length ? [{ text: value.slice(match.end), matched: false }] : []),
  ];
}

function findHighlights(note: KnowledgeNoteSource, query: string): Array<{ text: string; matched: boolean }> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const values = [note.title, note.description ?? "", ...note.tags];
  for (const value of values) {
    const fragments = fragmentMatch(createExcerpt(value, query), query);
    if (fragments.length) return fragments;
  }

  const body = analyzeMarkdown(note.markdown).plainText;
  const match = findNormalizedMatch(body, query);
  if (!match) return [];
  // 正文高亮从命中处开始截取，避免返回前 160 字或整篇正文。
  return fragmentMatch(body.slice(match.start, match.start + 160), query);
}

/**
 * 对已经通过权限过滤的笔记执行查询。计数取自文本匹配后的全集，
 * 因而既不会泄漏不可见笔记，也能让当前筛选保留其他可选项。
 */
export function queryKnowledge(
  visibleNotes: readonly KnowledgeNoteSource[],
  query: KnowledgeQuery,
  availableCategories: readonly string[] = [],
): KnowledgeQueryResult {
  const q = normalizeSearchText(query.q);
  const textMatches = q
    ? visibleNotes.filter((note) => {
        const searchable = [
          note.title,
          note.description ?? "",
          note.tags.join(" "),
          analyzeMarkdown(note.markdown).plainText,
        ].join(" ");
        return normalizeSearchText(searchable).includes(q);
      })
    : [...visibleNotes];

  const categoryCounts = new Map(availableCategories.map((name) => [name, 0]));
  for (const note of textMatches) {
    categoryCounts.set(note.category, (categoryCounts.get(note.category) ?? 0) + 1);
  }
  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
  const tags = countValues(textMatches.flatMap((note) => note.tags));
  const category = categories.some((item) => item.name === query.category) ? query.category : "";
  const tag = tags.some((item) => item.name === query.tag) ? query.tag : "";
  const filtered = textMatches.filter(
    (note) => (!category || note.category === category) && (!tag || note.tags.includes(tag)),
  );
  const sorted = [...filtered].sort((left, right) => compareNotes(left, right, query.sort));
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const start = (page - 1) * PAGE_SIZE;
  const items = sorted.slice(start, start + PAGE_SIZE).map((note) => ({
    slug: note.slug,
    title: note.title,
    category: note.category,
    tags: [...note.tags],
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    description: note.description,
    visibility: note.visibility,
    status: note.status,
    excerpt: createExcerpt(`${note.description ?? ""} ${analyzeMarkdown(note.markdown).plainText}`, query.q),
    highlights: findHighlights(note, query.q),
  }));

  return { items, total, page, pages, pageSize: PAGE_SIZE, categories, tags };
}

/** 以标题、描述、标签与安全解析后的正文执行全文匹配。 */
export function searchKnowledge(
  notes: readonly KnowledgeNoteSource[],
  term: string,
  viewer: KnowledgeViewer,
): KnowledgeNoteSource[] {
  const query = normalizeSearchText(term);
  if (!query) return filterVisibleNotes(notes, viewer);

  return filterVisibleNotes(notes, viewer).filter((note) => {
    const searchable = [
      note.title,
      note.description ?? "",
      note.tags.join(" "),
      analyzeMarkdown(note.markdown).plainText,
    ].join(" ");
    return normalizeSearchText(searchable).includes(query);
  });
}
