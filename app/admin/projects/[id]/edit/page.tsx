import ProjectForm from "@/components/admin/ProjectForm";
import ProjectVisibilityButton from "@/components/admin/ProjectVisibilityButton";
import { getAdminProject } from "@/lib/admin-projects-repository";
import styles from "../../../admin.module.css";

export const metadata = { title: "编辑项目" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };
export default async function EditProjectPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const project = await getAdminProject(id);
  const page = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page) ? Number(query.page) : 1;
  return <section className={styles.stack} aria-labelledby="edit-project-title">
    <section className={styles.panel}><h1 className={styles.heading} id="edit-project-title">编辑项目：{project.name}</h1>
      <p className={styles.hint}>网址短名创建后固定；亮点和标签关联不会被基础信息保存操作清空。</p>
      <ProjectForm mode="edit" id={project.id} version={project.updated_at} returnPage={page} isPublic={project.is_public}
        initial={{ slug: project.slug, name: project.name, description: project.description,
          long_description: project.long_description, status: project.status,
          project_url: project.project_url ?? "", github_url: project.github_url ?? "",
          is_featured: project.is_featured }} /></section>
    <section className={styles.panel} aria-labelledby="visibility-title"><h2 id="visibility-title">公开状态</h2>
      <p>当前：<strong>{project.is_public ? "公开" : "私有"}</strong></p>
      <p className={styles.hint}>公开是独立的内容披露决定，不会随基础信息保存自动改变。</p>
      <div className={styles.visibilityActions}><ProjectVisibilityButton id={project.id} name={project.name}
        updatedAt={project.updated_at} isPublic={project.is_public} /></div>
    </section>
  </section>;
}
