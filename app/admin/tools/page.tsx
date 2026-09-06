import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import DeleteToolButton from "@/components/admin/DeleteToolButton";
import ToolSelectionTable from "@/components/admin/ToolSelectionTable";
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
          <p className={styles.hint}>每页最多 10 条；可控制工具对游客显示，登录用户始终可见。</p>
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
      ) : <ToolSelectionTable rows={result.rows} total={result.total} page={result.page}
        pages={result.pages} first={first} last={last} />}

      {!!result.rows.length && <div className={styles.mobileList} aria-label="工具管理列表">
        {result.rows.map((tool) => <article className={styles.mobileRecord} key={tool.id}>
          <h2>{tool.name}</h2><dl className={styles.mobileMeta}>
            <dt>分类</dt><dd>{tool.category}</dd><dt>游客访问</dt>
            <dd>{tool.hide_from_guests ? "仅登录可见" : "游客可见"}</dd>
            <dt>标签</dt><dd>{tool.tool_tags.flatMap((item) => item.tags ? [item.tags.name] : []).join("、") || "—"}</dd>
            <dt>更新时间</dt><dd>{formatAdminDate(tool.updated_at)}</dd></dl>
          <div className={styles.rowActions}><a className={styles.link} href={tool.url} target="_blank" rel="noopener noreferrer">访问</a>
            <GuardedLink className={styles.link} href={`/admin/tools/${tool.id}/edit?page=${result.page}`}>编辑</GuardedLink>
            <DeleteToolButton id={tool.id} name={tool.name} updated_at={tool.updated_at} page={result.page} /></div>
        </article>)}
      </div>}

      <nav className={styles.pagination} aria-label="工具列表分页">
        {result.page > 1 ? <GuardedLink className={styles.buttonLink}
          href={`/admin/tools?page=${result.page - 1}`}>上一页</GuardedLink>
          : <span className={styles.disabledPage}>上一页</span>}
        <span>第 {result.page}/{result.pages} 页</span>
        {result.page < result.pages ? <GuardedLink className={styles.buttonLink}
          href={`/admin/tools?page=${result.page + 1}`}>下一页</GuardedLink>
          : <span className={styles.disabledPage}>下一页</span>}
      </nav>
      <p><GuardedLink className={styles.link} href="/tools">查看工具集</GuardedLink></p>
    </section>
  );
}
