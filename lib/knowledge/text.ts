const EXCERPT_LIMIT = 160;

/** 将兼容字符、大小写和连续空白统一，保证中英文混合内容的查询结果可预测。 */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, " ").trim();
}

/**
 * 为搜索结果生成不超过 160 个字符的纯文本摘要；有查询词时优先截取其附近内容。
 */
export function createExcerpt(value: string, query?: string): string {
  const text = normalizeSearchText(value);
  if (text.length <= EXCERPT_LIMIT) return text;

  const normalizedQuery = query ? normalizeSearchText(query) : "";
  const queryIndex = normalizedQuery ? text.indexOf(normalizedQuery) : -1;

  if (queryIndex < 0) return text.slice(0, EXCERPT_LIMIT);

  const start = Math.max(0, queryIndex - Math.floor((EXCERPT_LIMIT - normalizedQuery.length) / 2));
  const end = Math.min(text.length, start + EXCERPT_LIMIT);

  return text.slice(start, end);
}
