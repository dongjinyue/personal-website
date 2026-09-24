import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminPagination from "@/components/admin/AdminPagination";
import DeleteNewsButton from "@/components/admin/DeleteNewsButton";
import NewsSelectionTable from "@/components/admin/NewsSelectionTable";
import { getAdminNewsPage } from "@/lib/admin-news-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "新闻管理" };

type Search = { page?: string | string[]; notice?: string | string[] };
type Props = { searchParams: Promise<Search> };

const notices: Record<string, string> = {
  deleted: "新闻已删除。",
  visibility: "游客可见性已更新。",
};

export default async function AdminNewsPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? query.page : undefined;
  const result = await getAdminNewsPage(rawPage);
  const noticeKey = typeof query.notice === "string" && Object.hasOwn(notices, query.notice)
    ? query.notice
    : undefined;
  const canonical = `/admin/news?page=${result.page}${noticeKey ? `&notice=${noticeKey}` : ""}`;

  if (rawPage !== String(result.page)) redirect(canonical);
  if (result.rows.length === 0 && result.page > 1) {
    redirect(`/admin/news?page=${result.page - 1}${noticeKey ? `&notice=${noticeKey}` : ""}`);
  }

  const first = result.total === 0 ? 0 : (result.page - 1) * 10 + 1;
  const last = result.total === 0 ? 0 : first + result.rows.length - 1;

  return (
    <section className={styles.panel} aria-labelledby="news-title">
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.heading} id="news-title" tabIndex={-1}>新闻管理</h1>
          <p className={styles.hint}>新闻由服务器每 6 小时自动采集；可控制对游客显示，登录用户始终可见。</p>
        </div>
      </div>

      <p className={styles.notice} role="status" aria-live="polite">
        {noticeKey ? notices[noticeKey] : ""}
      </p>

      {result.rows.length === 0 ? (
        <div className={styles.state}>
          <p>还没有新闻。采集任务运行后会自动填充。</p>
        </div>
      ) : <NewsSelectionTable rows={result.rows} total={result.total} page={result.page}
        pages={result.pages} first={first} last={last} />}

      {!!result.rows.length && <div className={styles.mobileList} aria-label="新闻管理列表">
        {result.rows.map((news) => <article className={styles.mobileRecord} key={news.id}>
          <h2>{news.title}</h2><dl className={styles.mobileMeta}>
            <dt>来源</dt><dd>{news.source_name}</dd>
            <dt>分类</dt><dd>{news.category}</dd>
            <dt>游客访问</dt><dd>{news.hide_from_guests ? "仅登录可见" : "游客可见"}</dd>
            <dt>发布时间</dt><dd>{news.published_at ? formatAdminDate(news.published_at) : "—"}</dd>
            <dt>采集时间</dt><dd>{formatAdminDate(news.collected_at)}</dd>
          </dl>
          <div className={styles.rowActions}>
            {news.source_url ? <a className={styles.link} href={news.source_url} target="_blank" rel="noopener noreferrer">访问</a> : null}
            <DeleteNewsButton id={news.id} title={news.title} updatedAt={news.updated_at} page={result.page} />
          </div>
        </article>)}
      </div>}

      <AdminPagination currentPage={result.page} pageCount={result.pages}
        basePath="/admin/news" label="新闻列表分页" />
      <p><a className={styles.link} href="/news">查看新闻页</a></p>
    </section>
  );
}
