const EXCERPT_LIMIT = 160;

type SourceRange = { start: number; end: number };

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** 将兼容字符、大小写和连续空白统一，保证中英文混合内容的查询结果可预测。 */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

type MappedText = { text: string; ranges: SourceRange[] };

function appendMapped(
  target: MappedText,
  text: string,
  range: SourceRange,
): void {
  target.text += text;
  // String#indexOf 使用 UTF-16 偏移，因此代理对的两个码元都保留同一原文范围。
  for (let index = 0; index < text.length; index += 1) target.ranges.push(range);
}

/** 整体执行 NFKC；字素簇只用于记录规范化结果对应的原文范围。 */
function normalizeCompatibilityWithMap(value: string): MappedText {
  const ranges: SourceRange[] = [];
  for (const part of graphemeSegmenter.segment(value)) {
    const range = { start: part.index, end: part.index + part.segment.length };
    const normalizedPart = part.segment.normalize("NFKC");
    for (let index = 0; index < normalizedPart.length; index += 1) ranges.push(range);
  }
  return { text: value.normalize("NFKC"), ranges };
}

/**
 * 大小写转换必须一次作用于整体字符串，才能保留希腊 final sigma 等上下文规则。
 * 单个码点转换仅用于计算输出长度；真正参与匹配的是整体转换后的文本。
 */
function lowercaseWholeWithMap(mapped: MappedText): MappedText {
  const lowered = mapped.text.toLowerCase();
  const ranges: SourceRange[] = [];
  let offset = 0;

  for (const character of mapped.text) {
    const first = mapped.ranges[offset];
    const last = mapped.ranges[offset + character.length - 1];
    const range = { start: first.start, end: last.end };
    const outputLength = character.toLowerCase().length;
    for (let index = 0; index < outputLength; index += 1) ranges.push(range);
    offset += character.length;
  }

  return { text: lowered, ranges };
}

function collapseWhitespaceWithMap(mapped: MappedText): MappedText {
  const result: MappedText = { text: "", ranges: [] };
  let pendingWhitespace: SourceRange | null = null;
  let offset = 0;

  for (const character of mapped.text) {
    const first = mapped.ranges[offset];
    const last = mapped.ranges[offset + character.length - 1];
    const range = { start: first.start, end: last.end };
    offset += character.length;

    if (/\s/u.test(character)) {
      pendingWhitespace = pendingWhitespace
        ? { start: pendingWhitespace.start, end: range.end }
        : range;
      continue;
    }

    if (pendingWhitespace && result.text) appendMapped(result, " ", pendingWhitespace);
    pendingWhitespace = null;
    appendMapped(result, character, range);
  }

  return result;
}

/**
 * 在整体 NFKC（兼容形式）与大小写归一化结果中查找查询词，
 * 同时把命中范围映射回原始文本，避免组合字符改变长度后切错位置。
 */
export function findNormalizedMatch(
  value: string,
  query: string,
): SourceRange | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const mapped = collapseWhitespaceWithMap(
    lowercaseWholeWithMap(normalizeCompatibilityWithMap(value)),
  );

  const matchStart = mapped.text.indexOf(normalizedQuery);
  if (matchStart < 0) return null;
  const matchEnd = matchStart + normalizedQuery.length;
  const first = mapped.ranges[matchStart];
  const last = mapped.ranges[matchEnd - 1];
  return first && last ? { start: first.start, end: last.end } : null;
}

/**
 * 为搜索结果生成不超过 160 个字符的纯文本摘要；有查询词时优先截取其附近内容。
 */
export function createExcerpt(value: string, query?: string): string {
  // 摘要只折叠布局空白，保留原文大小写与组合字符，供高亮准确展示。
  const text = value.replace(/\s+/gu, " ").trim();
  if (text.length <= EXCERPT_LIMIT) return text;

  const match = query ? findNormalizedMatch(text, query) : null;

  if (!match) return text.slice(0, EXCERPT_LIMIT);

  const matchLength = match.end - match.start;
  let start = Math.max(0, match.start - Math.floor((EXCERPT_LIMIT - matchLength) / 2));
  const end = Math.min(text.length, start + EXCERPT_LIMIT);
  start = Math.max(0, end - EXCERPT_LIMIT);

  return text.slice(start, end);
}
