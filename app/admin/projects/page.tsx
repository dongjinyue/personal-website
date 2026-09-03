import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import DeleteProjectButton from "@/components/admin/DeleteProjectButton";
import { getAdminProjectsPage } from "@/lib/admin-projects-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import { projectStatusLabels } from "@/lib/project-status";
import type { ProjectStatus } from "@/data/projects";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "项目管理" };
type Props = { searchParams: Promise<{ page?: string | string[]; notice?: string | string[] }> };
const notices = { created: "私有项目已创建。", updated: "项目已更新。", deleted: "项目已删除。" };

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
      <p className={styles.hint}>后台显示全部项目；新建项目默认私有，公开需在编辑页单独确认。</p></div>
      <GuardedLink className={`${styles.buttonLink} ${styles.primaryButton}`} href={`/admin/projects/new?page=${result.page}`}>新增项目</GuardedLink></div>
    <p className={styles.notice} role="status" aria-live="polite">{notice ? notices[notice] : ""}</p>
    {!result.rows.length ? <div className={styles.state}><p>还没有项目。</p></div> :
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="项目管理列表，可横向滚动">
        <table className={styles.table}><caption>当前显示第 {first}～{first + result.rows.length - 1} 条，共 {result.total} 条。</caption>
          <thead><tr><th>名称</th><th>进度</th><th>可见性</th><th>推荐</th><th>更新时间（北京时间）</th><th>操作</th></tr></thead>
          <tbody>{result.rows.map((project) => <tr key={project.id}>
            <th scope="row">{project.name}</th><td>{projectStatusLabels[project.status as ProjectStatus]}</td>
            <td><span className={project.is_public ? styles.publicBadge : styles.privateBadge}>{project.is_public ? "公开" : "私有"}</span></td>
            <td>{project.is_featured ? "是" : "否"}</td><td>{formatAdminDate(project.updated_at)}</td>
            <td><div className={styles.rowActions}><GuardedLink className={styles.link} href={`/admin/projects/${project.id}/edit?page=${result.page}`}>编辑</GuardedLink>
              <DeleteProjectButton id={project.id} name={project.name} updatedAt={project.updated_at} page={result.page} /></div></td>
          </tr>)}</tbody></table></div>}
    <nav className={styles.pagination} aria-label="项目列表分页">
      {result.page > 1 ? <GuardedLink className={styles.buttonLink} href={`/admin/projects?page=${result.page - 1}`}>上一页</GuardedLink> : <span className={styles.disabledPage}>上一页</span>}
      <span>第 {result.page}/{result.pages} 页</span>
      {result.page < result.pages ? <GuardedLink className={styles.buttonLink} href={`/admin/projects?page=${result.page + 1}`}>下一页</GuardedLink> : <span className={styles.disabledPage}>下一页</span>}
    </nav><p><GuardedLink className={styles.link} href="/projects">查看公开项目页</GuardedLink></p>
  </section>;
}
