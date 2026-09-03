import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import DeleteToolButton from "@/components/admin/DeleteToolButton";
import { getAdminToolsPage } from "@/lib/admin-tools-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "工具管理" };

type Search = { page?: string | string[]; notice?: string | string[] };
type Props = { searchParams: Promise<Search> };

const notices: Record<string, string> = {
  created: "工具已创建。",
  updated: "工具已更新。",
  deleted: "工具已删除。",
};

export default async function AdminToolsPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? query.page : undefined;
  const result = await getAdminToolsPage(rawPage);
  const noticeKey = typeof query.notice === "string" && Object.hasOwn(notices, query.notice)
    ? query.notice
    : undefined;
  const canonical = `/admin/tools?page=${result.page}${noticeKey ? `&notice=${noticeKey}` : ""}`;

  if (rawPage !== String(result.page)) redirect(canonical);
  if (result.rows.length === 0 && result.page > 1) {
    redirect(`/admin/tools?page=${result.page - 1}${noticeKey ? `&notice=${noticeKey}` : ""}`);
  }

  const first = result.total === 0 ? 0 : (result.page - 1) * 10 + 1;
  const last = result.total === 0 ? 0 : first + result.rows.length - 1;

  return (
    <section className={styles.panel} aria-labelledby="tools-title">
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.heading} id="tools-title" tabIndex={-1}>工具管理</h1>
          <p className={styles.hint}>每页最多 10 条，按最近更新时间排序。</p>
        </div>
        <GuardedLink className={`${styles.buttonLink} ${styles.primaryButton}`}
          href={`/admin/tools/new?page=${result.page}`}>新增工具</GuardedLink>
      </div>

      <p className={styles.notice} role="status" aria-live="polite">
        {noticeKey ? notices[noticeKey] : ""}
      </p>

      {result.rows.length === 0 ? (
        <div className={styles.state}>
          <p>还没有工具。</p>
          <GuardedLink className={styles.link} href="/admin/tools/new?page=1">新增第一个工具</GuardedLink>
        </div>
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="region"
          aria-label="工具管理列表，可横向滚动">
          <table className={styles.table}>
            <caption>当前显示第 {first}～{last} 条，共 {result.total} 条，第 {result.page}/{result.pages} 页。</caption>
            <thead><tr><th scope="col">名称</th><th scope="col">分类</th><th scope="col">收藏</th>
              <th scope="col">更新时间（北京时间）</th><th scope="col">操作</th></tr></thead>
            <tbody>
              {result.rows.map((tool) => (
                <tr key={tool.id}>
                  <th scope="row">{tool.name}</th>
                  <td>{tool.category}</td>
                  <td>{tool.is_favorite ? "是" : "否"}</td>
                  <td>{formatAdminDate(tool.updated_at)}</td>
                  <td><div className={styles.rowActions}>
                    <GuardedLink className={styles.link}
                      href={`/admin/tools/${tool.id}/edit?page=${result.page}`}>编辑</GuardedLink>
                    <DeleteToolButton id={tool.id} name={tool.name}
                      updated_at={tool.updated_at} page={result.page} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className={styles.pagination} aria-label="工具列表分页">
        {result.page > 1 ? <GuardedLink className={styles.buttonLink}
          href={`/admin/tools?page=${result.page - 1}`}>上一页</GuardedLink>
          : <span className={styles.disabledPage}>上一页</span>}
        <span>第 {result.page}/{result.pages} 页</span>
        {result.page < result.pages ? <GuardedLink className={styles.buttonLink}
          href={`/admin/tools?page=${result.page + 1}`}>下一页</GuardedLink>
          : <span className={styles.disabledPage}>下一页</span>}
      </nav>
      <p><GuardedLink className={styles.link} href="/tools">查看公开工具页</GuardedLink></p>
    </section>
  );
}
