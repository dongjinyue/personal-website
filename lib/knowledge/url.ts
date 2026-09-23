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

export const DEFAULT_KNOWLEDGE_SORT: KnowledgeSort = "updated-desc";

const KNOWLEDGE_QUERY_KEYS = ["q", "category", "tag", "sort", "page"] as const;

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
      : DEFAULT_KNOWLEDGE_SORT,
    page: normalizePage(firstValue(input.page)),
  };
}

/** 统一构造规范知识库 URL，页面和客户端均不自行拼接查询字符串。 */
export function buildKnowledgeUrl(query: KnowledgeQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  if (query.sort !== DEFAULT_KNOWLEDGE_SORT) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `/knowledge?${search}` : "/knowledge";
}

/** 客户端语义更明确的别名，确保交互组件复用同一 URL 规范。 */
export const buildClientKnowledgeUrl = buildKnowledgeUrl;

/**
 * 将浏览器或 Next.js 提供的原始参数按原值重建，以便页面识别默认值、
 * 重复参数、未知参数和空参数，并统一跳转到唯一的可分享地址。
 */
export function buildRawKnowledgeUrl(input: KnowledgeQueryInput): string {
  const params = new URLSearchParams();
  for (const key of KNOWLEDGE_QUERY_KEYS) {
    const value = input[key];
    if (typeof value === "string") params.append(key, value);
    else if (value) value.forEach((item) => params.append(key, item));
  }
  for (const key of Object.keys(input)) {
    if (!KNOWLEDGE_QUERY_KEYS.includes(key as (typeof KNOWLEDGE_QUERY_KEYS)[number])) {
      const value = input[key];
      if (typeof value === "string") params.append(key, value);
      else if (value) value.forEach((item) => params.append(key, item));
    }
  }
  const search = params.toString();
  return search ? `/knowledge?${search}` : "/knowledge";
}
