import { filterVisibleNotes, type KnowledgeViewer } from "./access";
import { analyzeMarkdown } from "./markdown";
import { createExcerpt, normalizeSearchText } from "./text";
import type { KnowledgeNoteSource } from "./types";

export type KnowledgeSort = "updated-desc" | "created-asc" | "title-asc";

/** 页面与客户端筛选组件共享的规范查询对象。 */
export type KnowledgeQuery = {
  q: string;
  category: string;
  tag: string;
  sort: KnowledgeSort;
  page: number;
};

export type KnowledgeQueryInput = Record<string, string | readonly string[] | undefined>;

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

const DEFAULT_SORT: KnowledgeSort = "updated-desc";
const PAGE_SIZE = 12 as const;

function firstValue(value: string | readonly string[] | undefined): string {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

function normalizeFilter(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function normalizePage(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

/** 将 URL 参数收敛为安全、可复用的默认值，避免非法参数影响查询。 */
export function parseKnowledgeQuery(input: KnowledgeQueryInput): KnowledgeQuery {
  const sort = firstValue(input.sort);
  return {
    q: normalizeFilter(firstValue(input.q)),
    category: normalizeFilter(firstValue(input.category)),
    tag: normalizeFilter(firstValue(input.tag)),
    sort: sort === "created-asc" || sort === "title-asc" || sort === "updated-desc"
      ? sort
      : DEFAULT_SORT,
    page: normalizePage(firstValue(input.page)),
  };
}

/** 统一构造规范知识库 URL，页面和客户端均不自行拼接查询字符串。 */
export function buildKnowledgeUrl(query: KnowledgeQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  if (query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `/knowledge?${search}` : "/knowledge";
}

/** 客户端语义更明确的别名，确保后续组件复用同一 URL 规范。 */
export const buildClientKnowledgeUrl = buildKnowledgeUrl;

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
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  let normalized = "";
  const ranges: Array<{ start: number; end: number; normalizedStart: number; normalizedEnd: number }> = [];
  let offset = 0;
  for (const character of value) {
    const normalizedCharacter = character.normalize("NFKC").toLocaleLowerCase();
    ranges.push({ start: offset, end: offset + character.length, normalizedStart: normalized.length, normalizedEnd: normalized.length + normalizedCharacter.length });
    normalized += normalizedCharacter;
    offset += character.length;
  }
  const matchStart = normalized.indexOf(normalizedQuery);
  if (matchStart < 0) return [];
  const matchEnd = matchStart + normalizedQuery.length;
  const first = ranges.find((range) => range.normalizedEnd > matchStart);
  const last = [...ranges].reverse().find((range) => range.normalizedStart < matchEnd);
  if (!first || !last) return [];
  return [
    ...(first.start ? [{ text: value.slice(0, first.start), matched: false }] : []),
    { text: value.slice(first.start, last.end), matched: true },
    ...(last.end < value.length ? [{ text: value.slice(last.end), matched: false }] : []),
  ];
}

function findHighlights(note: KnowledgeNoteSource, query: string): Array<{ text: string; matched: boolean }> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const values = [note.title, note.description ?? "", ...note.tags, analyzeMarkdown(note.markdown).plainText.slice(0, 160)];
  for (const value of values) {
    const fragments = fragmentMatch(value, query);
    if (fragments.length) return fragments;
  }
  return [];
}

/**
 * 对已经通过权限过滤的笔记执行查询。计数取自文本匹配后的全集，
 * 因而既不会泄漏不可见笔记，也能让当前筛选保留其他可选项。
 */
export function queryKnowledge(
  visibleNotes: readonly KnowledgeNoteSource[],
  query: KnowledgeQuery,
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

  const categories = countValues(textMatches.map((note) => note.category));
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
