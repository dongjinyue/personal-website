import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const NEWS_PAGE_SIZE = 10;

/** 网站新闻展示用类型；不把数据库行命名散布到展示组件。 */
export type NewsArticle = {
  id: string;
  title: string;
  titleZh: string | null;
  sourceUrl: string | null;
  sourceName: string;
  description: string | null;
  descriptionZh: string | null;
  detail: string | null;
  category: string;
  publishedAt: string | null;
  collectedAt: string;
};

export const NEWS_CATEGORIES = ["模型动态", "AI 产品", "开发技术", "行业观察"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const newsSelect = "id, title, title_zh, source_url, source_name, description, description_zh, detail, category, published_at, collected_at";

type NewsClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function visibleQuery(supabase: NewsClient) {
  return supabase.from("news_articles")
    .select(newsSelect, { count: "exact" }).eq("is_public", true);
}

type VisibleRow = NonNullable<Awaited<ReturnType<typeof visibleQuery>>["data"]>[number];

/** 解码 HTML 实体编码（如 &#8217; → '），兼容旧数据。 */
function decodeHtmlEntities(text: string | null): string | null {
  if (!text) return text;
  return text
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function toArticle(row: VisibleRow): NewsArticle {
  return {
    id: row.id,
    title: decodeHtmlEntities(row.title) ?? row.title,
    titleZh: decodeHtmlEntities(row.title_zh),
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    description: decodeHtmlEntities(row.description),
    descriptionZh: decodeHtmlEntities(row.description_zh),
    detail: row.detail,
    category: row.category,
    publishedAt: row.published_at,
    collectedAt: row.collected_at,
  };
}

/** 首页简报只展示最近的已发布新闻。 */
export async function getRecentNews(limit = 4): Promise<NewsArticle[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await visibleQuery(supabase)
    .order("published_at", { ascending: false })
    .order("collected_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("暂时无法读取新闻。");
  return data.map(toArticle);
}

/** 新闻列表页按分类筛选、关键词搜索、日期范围并分页。
 *  date 为 ISO 字符串（YYYY-MM-DD），仅比较日期部分。
 */
export async function getNewsPage(
  rawPage?: string,
  category?: string,
  search?: string,
  startDate?: string,
  endDate?: string,
) {
  const supabase = await createSupabaseServerClient();
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const filter = category && (NEWS_CATEGORIES as readonly string[]).includes(category) ? category : undefined;
  const searchQuery = search?.trim() || undefined;
  const start = startDate?.trim() || undefined;
  const end = endDate?.trim() || undefined;

  // 单独计数，避免与已带 select 字段的 visibleQuery 链式调用冲突。
  let countQ = supabase.from("news_articles").select("id", { count: "exact", head: true }).eq("is_public", true);
  if (filter) countQ = countQ.eq("category", filter);
  if (start) countQ = countQ.gte("published_at", `${start}T00:00:00.000Z`);
  if (end) countQ = countQ.lte("published_at", `${end}T23:59:59.999Z`);
  if (searchQuery) countQ = countQ.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,title_zh.ilike.%${searchQuery}%,description_zh.ilike.%${searchQuery}%`);
  const counted = await countQ;
  if (counted.error || counted.count === null) throw new Error("暂时无法读取新闻数量。");

  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));
  const page = Math.min(requested, pages);
  const from = (page - 1) * NEWS_PAGE_SIZE;

  let query = visibleQuery(supabase);
  if (filter) query = query.eq("category", filter);
  if (start) query = query.gte("published_at", `${start}T00:00:00.000Z`);
  if (end) query = query.lte("published_at", `${end}T23:59:59.999Z`);
  if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,title_zh.ilike.%${searchQuery}%,description_zh.ilike.%${searchQuery}%`);
  const { data, error } = await query
    .order("published_at", { ascending: false })
    .order("collected_at", { ascending: false })
    .range(from, from + NEWS_PAGE_SIZE - 1);
  if (error) throw new Error("暂时无法读取新闻列表。");

  return {
    articles: data.map(toArticle),
    total,
    page,
    pages,
    category: filter ?? null,
    search: searchQuery ?? null,
    startDate: start ?? null,
    endDate: end ?? null,
  };
}
