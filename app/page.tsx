import NewsHome from "@/components/news/NewsHome";
import { getRecentNews } from "@/lib/news-repository";

export const metadata = { title: "MY SPACE · AI 每日简报" };

// 首页新闻区域静态渲染，减少客户端请求和布局抖动。
export const dynamic = "force-static";
export const revalidate = 3600; // 每小时重新生成

export default async function HomePage() {
  let articles: Awaited<ReturnType<typeof getRecentNews>> = [];
  try {
    articles = await getRecentNews(4);
  } catch {
    // 数据不可用时展示空状态，不让首页整页报错。
  }
  return <NewsHome articles={articles} />;
}
