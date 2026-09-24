import NewsHome from "@/components/news/NewsHome";
import { getNewsPage, getRecentNews, type NewsArticle } from "@/lib/news-repository";

// 强制每次请求都重新获取数据，避免缓存导致搜索/分类状态不更新。
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ page?: string | string[]; category?: string | string[]; q?: string | string[]; startDate?: string | string[]; endDate?: string | string[] }> };

export default async function NewsPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? query.page : undefined;
  const rawCategory = typeof query.category === "string" ? query.category : undefined;
  const rawSearch = typeof query.q === "string" ? query.q : undefined;
  const rawStartDate = typeof query.startDate === "string" ? query.startDate : undefined;
  const rawEndDate = typeof query.endDate === "string" ? query.endDate : undefined;

  let articles: NewsArticle[] = [];
  let pagination: { page: number; pages: number; total: number } | undefined;
  let searchQuery: string | null = null;
  let activeCategory: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;

  try {
    const result = await getNewsPage(rawPage, rawCategory, rawSearch, rawStartDate, rawEndDate);
    articles = result.articles;
    pagination = { page: result.page, pages: result.pages, total: result.total };
    searchQuery = result.search;
    activeCategory = result.category;
    startDate = result.startDate;
    endDate = result.endDate;
  } catch {
    // 数据不可用时展示空状态。
  }

  // 今日关注始终展示最新 5 条，不受搜索或分页影响。
  let topNews: NewsArticle[] = [];
  try {
    topNews = await getRecentNews(5);
  } catch {
    // 忽略。
  }

  return (
    <NewsHome
      articles={articles}
      expanded
      pagination={pagination}
      searchQuery={searchQuery}
      activeCategory={activeCategory}
      topNews={topNews}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
