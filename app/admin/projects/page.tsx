import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import DeleteProjectButton from "@/components/admin/DeleteProjectButton";
import ProjectSelectionTable from "@/components/admin/ProjectSelectionTable";
import { getAdminProjectsPage } from "@/lib/admin-projects-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "项目管理" };
type Props = { searchParams: Promise<{ page?: string | string[]; notice?: string | string[] }> };
const notices = { created: "项目已创建。", updated: "项目已更新。", deleted: "项目已删除。" };

export default async function AdminProjectsPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? query.page : undefined;
  const result = await getAdminProjectsPage(rawPage);
  const notice = typeof query.notice === "string" && Object.hasOwn(notices, query.notice)
    ? query.notice as keyof typeof notices : undefined;
  if (rawPage !== String(result.page)) redirect(`/admin/projects?page=${result.page}${notice ? `&notice=${notice}` : ""}`);
  if (!result.rows.length && result.page > 1) redirect(`/admin/projects?page=${result.page - 1}`);
  const first = result.total ? (result.page - 1) * 10 + 1 : 0;
  return <section className={styles.panel} aria-labelledby="projects-title">
    <div className={styles.pageHeading}><div><h1 className={styles.heading} id="projects-title" tabIndex={-1}>项目管理</h1>
      <p className={styles.hint}>后台显示全部项目；可控制项目对游客显示，登录用户始终可见。</p></div>
      <GuardedLink className={`${styles.buttonLink} ${styles.primaryButton}`} href={`/admin/projects/new?page=${result.page}`}>新增项目</GuardedLink></div>
    <p className={styles.notice} role="status" aria-live="polite">{notice ? notices[notice] : ""}</p>
    {!result.rows.length ? <div className={styles.state}><p>还没有项目。</p></div> :
      <ProjectSelectionTable rows={result.rows} total={result.total} page={result.page} first={first} />}
    {!!result.rows.length && <div className={styles.mobileList} aria-label="项目管理列表">
      {result.rows.map((project) => <article className={styles.mobileRecord} key={project.id}>
        <h2>{project.name}</h2><dl className={styles.mobileMeta}>
          <dt>Slug</dt><dd>{project.slug}</dd>
          <dt>游客访问</dt><dd>{project.hide_from_guests ? "仅登录可见" : "游客可见"}</dd>
          <dt>首页推荐</dt><dd>{project.is_featured ? "推荐" : "不推荐"}</dd>
          <dt>更新时间</dt><dd>{formatAdminDate(project.updated_at)}</dd></dl>
        <div className={styles.rowActions}><GuardedLink className={styles.link} href={`/projects/${project.slug}`}>查看</GuardedLink>
          <GuardedLink className={styles.link} href={`/admin/projects/${project.id}/edit?page=${result.page}`}>编辑</GuardedLink>
          <DeleteProjectButton id={project.id} name={project.name} updatedAt={project.updated_at} page={result.page} /></div>
      </article>)}
    </div>}
    <nav className={styles.pagination} aria-label="项目列表分页">
      {result.page > 1 ? <GuardedLink className={styles.buttonLink} href={`/admin/projects?page=${result.page - 1}`}>上一页</GuardedLink> : <span className={styles.disabledPage}>上一页</span>}
      <span>第 {result.page}/{result.pages} 页</span>
      {result.page < result.pages ? <GuardedLink className={styles.buttonLink} href={`/admin/projects?page=${result.page + 1}`}>下一页</GuardedLink> : <span className={styles.disabledPage}>下一页</span>}
    </nav><p><GuardedLink className={styles.link} href="/projects">查看项目页</GuardedLink></p>
  </section>;
}
