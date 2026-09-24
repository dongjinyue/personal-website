"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshAiNewsNow } from "@/app/admin/news/actions";
import { getPaginationItems, type PaginationItem } from "@/lib/pagination";
import type { NewsArticle } from "@/lib/news-repository";
import styles from "./NewsHome.module.css";

const categories = ["全部", "模型动态", "AI 产品", "开发技术", "行业观察"];

// 搜索栏：表单提交后通过 URL 跳转，保留当前分类和日期筛选。
function NewsSearchBar({ initialQuery, category, startDate, endDate }: { initialQuery: string; category?: string | null; startDate?: string | null; endDate?: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [from, setFrom] = useState(startDate ?? "");
  const [to, setTo] = useState(endDate ?? "");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    if (category) params.set("category", category);
    if (from) params.set("startDate", from);
    if (to) params.set("endDate", to);
    const qs = params.toString();
    router.push(qs ? `/news?${qs}` : "/news");
  }

  return (
    <form className={styles.searchRow} onSubmit={handleSubmit} role="search">
      <input
        className={styles.searchInput}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索新闻标题或摘要"
        aria-label="搜索新闻"
      />
      <label className={styles.dateField}>
        <span>开始</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label className={styles.dateField}>
        <span>结束</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <button type="submit" className={styles.searchBtn}>搜索</button>
      {value && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => { setValue(""); const p = new URLSearchParams(); if (category) p.set("category", category); const qs = p.toString(); router.push(qs ? `/news?${qs}` : "/news"); }}
          aria-label="清除搜索"
        >×</button>
      )}
    </form>
  );
}

// 分页导航：页码链接保留搜索、分类和日期参数。
function NewsPagination({ page, pages, search, category, startDate, endDate }: { page: number; pages: number; search?: string | null; category?: string | null; startDate?: string | null; endDate?: string | null }) {
  if (pages <= 1) return null;
  const items = getPaginationItems(page, pages);
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `/news?${params}`;
  };
  return (
    <nav className={styles.pagination} aria-label="新闻分页">
      {page > 1 ? (
        <Link className={styles.pageEdge} href={buildHref(page - 1)}>上一页</Link>
      ) : (
        <span className={styles.pageEdgeDisabled} aria-disabled="true">上一页</span>
      )}
      {items.map((item: PaginationItem) =>
        typeof item === "number" ? (
          <Link
            key={item}
            className={`${styles.pageNum} ${item === page ? styles.pageActive : ""}`}
            href={buildHref(item)}
            aria-current={item === page ? "page" : undefined}
          >{item}</Link>
        ) : (
          <span key={item} className={styles.pageEllipsis} aria-hidden="true">…</span>
        )
      )}
      {page < pages ? (
        <Link className={styles.pageEdge} href={buildHref(page + 1)}>下一页</Link>
      ) : (
        <span className={styles.pageEdgeDisabled} aria-disabled="true">下一页</span>
      )}
    </nav>
  );
}

type Props = {
  articles: NewsArticle[];
  expanded?: boolean;
  // 服务端分页模式（新闻列表页）：传入后分类筛选改为 URL 驱动，渲染搜索和分页。
  pagination?: { page: number; pages: number; total: number };
  searchQuery?: string | null;
  activeCategory?: string | null;
  // 侧边栏今日关注数据源，独立于主列表搜索/分页。
  topNews?: NewsArticle[];
  // 日期范围筛选。
  startDate?: string | null;
  endDate?: string | null;
};

export default function NewsHome({ articles, expanded = false, pagination, searchQuery, activeCategory, topNews, startDate, endDate }: Props) {
  // 服务端模式：分类和搜索由 URL 驱动，不在客户端二次过滤。
  const serverMode = pagination !== undefined;
  const currentCategory = serverMode ? (activeCategory ?? "全部") : undefined;
  const [category, setCategory] = useState("全部");
  const [refreshPending, startRefreshTransition] = useTransition();
  const [refreshMessage, setRefreshMessage] = useState("");
  const effectiveCategory = serverMode ? currentCategory! : category;

  const filtered = serverMode
    ? articles
    : articles.filter((item) => category === "全部" || item.category === category);
  const visible = expanded ? filtered : filtered.slice(0, 4);
  // 今日关注优先用独立传入的 topNews（不受搜索/分页影响），回退到主列表前 5 条。
  const topFive = topNews && topNews.length > 0 ? topNews : articles.slice(0, 5);

  // 简报区展示当天日期
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  function refreshNews() {
    setRefreshMessage("正在查询新闻源…");
    startRefreshTransition(async () => {
      try {
        const result = await refreshAiNewsNow();
        setRefreshMessage(result.message);
      } catch {
        setRefreshMessage("暂时无法获取新闻，请稍后重试。");
      }
    });
  }

  // 分类按钮：服务端模式用 Link，首页模式用 button。
  const filterButtons = categories.map((item) => {
    const pressed = item === effectiveCategory;
    if (serverMode) {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (item !== "全部") params.set("category", item);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const href = params.toString() ? `/news?${params}` : "/news";
      return (
        <Link
          key={item}
          className={styles.filterLink}
          href={href}
          aria-pressed={pressed}
        >{item}</Link>
      );
    }
    return (
      <button
        key={item}
        type="button"
        aria-pressed={pressed}
        onClick={() => setCategory(item)}
      >{item}</button>
    );
  });

  return <main className={styles.page}>
    <section className={styles.brief} aria-label="每日简报">
      <div className={styles.date}><strong>{dateStr}</strong><span><b>AI 每日简报</b></span></div>
      <div className={styles.highlights}><p><span>✦</span>理解技术变化，发现值得关注的新方向。</p><p><span>↗</span>每天几分钟，让信息成为自己的积累。</p></div>
      <div className={styles.report} aria-hidden="true"><span>AI</span><i /><i /><i /><b>✦</b></div>
    </section>
    <div className={styles.columns}>
      <section className={styles.feed} aria-labelledby="news-title">
        <div className={styles.newsHeading}>
          <div className={styles.heading}>
            <h1 id="news-title">AI 新闻</h1>
            <span>采集自公开 RSS 源</span>
            {!expanded && !serverMode && (
              <button
                type="button"
                className={styles.refreshNews}
                onClick={refreshNews}
                disabled={refreshPending}
              >{refreshPending ? "正在获取…" : "管理员手动获取新闻"}</button>
            )}
          </div>
          {!expanded && !serverMode && refreshMessage && (
            <p className={styles.refreshStatus} role="status" aria-live="polite">{refreshMessage}</p>
          )}
        </div>
        {serverMode && (
          <NewsSearchBar initialQuery={searchQuery ?? ""} category={activeCategory ?? null} startDate={startDate ?? null} endDate={endDate ?? null} />
        )}
        <div className={styles.filters} aria-label="新闻分类">{filterButtons}</div>
        <p className={styles.srOnly} role="status">当前分类：{effectiveCategory}，显示 {visible.length} 条{serverMode && pagination ? `，共 ${pagination.total} 条` : ""}</p>
        <div>{visible.map((item)=><article className={styles.article} id={item.id} key={item.id}>
          <span className={styles.category}>{item.category}</span>
          <div className={styles.copy}><h2>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.titleZh || item.title}</a> : (item.titleZh || item.title)}</h2><p>{item.descriptionZh || (item.description ?? "")}</p><div className={styles.meta}>{item.sourceName && <span className={styles.demo}>来源：{item.sourceName}</span>}{item.publishedAt && <span className={styles.dateLabel}>{new Date(item.publishedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}</span>}</div></div>
        </article>)}</div>
        {!visible.length && <div className={styles.state}><p>{searchQuery ? `未找到与「${searchQuery}」相关的新闻。` : "暂无新闻。采集任务运行后会自动填充。"}</p></div>}
        {!expanded && articles.length > 4 && <Link className={styles.more} href="/news">查看更多新闻 <span aria-hidden="true">→</span></Link>}
        {expanded && !serverMode && <p className={styles.end}>共展示 {visible.length} 条新闻</p>}
        {serverMode && pagination && (
          <>
            <NewsPagination page={pagination.page} pages={pagination.pages} search={searchQuery} category={activeCategory} startDate={startDate} endDate={endDate} />
            <p className={styles.end}>共 {pagination.total} 条新闻</p>
          </>
        )}
      </section>
      <aside className={styles.sidebar} aria-label="简报补充信息">
        <section className={styles.sideCard}>
          <h2>今日关注 <span className={styles.hot}>✦</span></h2>
          <p className={styles.sideNote}>最新采集</p>
          <ol className={styles.ranking}>
            {topFive.map((item, index) => <li key={item.id}>
              <span>{index + 1}</span>
              <Link href={`/news#${item.id}`}>{item.titleZh || item.title}</Link>
            </li>)}
            {!topFive.length && <li className={styles.sideNote}>暂无新闻。</li>}
          </ol>
        </section>
        <section className={styles.sideCard}><h2>关于这里</h2><div className={styles.about}><div className={styles.avatar} aria-hidden="true">M<span>SPACE</span></div><p>一个持续生长的个人空间。<br />关注 AI 的新变化，记录学习与实践，在信息之外，留一点自己的思考。</p></div><p className={styles.signature}>持续学习 · 认真记录 · 分享发现</p></section>
        <section className={styles.sideCard}><h2>往期简报</h2><div className={styles.archive}><span aria-hidden="true">▤</span><h3>从第一期开始积累</h3><p>新闻由服务器定时采集。<br />每 6 小时自动从公开 RSS 源获取。</p></div><Link className={styles.archiveLink} href="/news">浏览全部新闻 →</Link></section>
        <p className={styles.notice}>新闻采集自公开 RSS 源，标题和摘要不代表本站观点。</p>
      </aside>
    </div>
  </main>;
}
