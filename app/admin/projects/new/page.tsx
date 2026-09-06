import { randomUUID } from "node:crypto";
import ProjectForm from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/auth/admin";
import styles from "../../admin.module.css";

export const metadata = { title: "新增项目" };
type Props = { searchParams: Promise<{ page?: string | string[] }> };
export default async function NewProjectPage({ searchParams }: Props) {
  await requireAdmin();
  const query = await searchParams;
  const page = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page) ? Number(query.page) : 1;
  return <section className={styles.panel} aria-labelledby="new-project-title">
    <h1 className={styles.heading} id="new-project-title">新增项目</h1>
    <p className={styles.hint}>新项目默认对游客可见，也可以在表单中设为仅登录可见。</p>
    <ProjectForm mode="create" id={randomUUID()} version="" returnPage={page}
      initial={{ slug: "", name: "", description: "", long_description: "", status: "building",
        project_url: "", github_url: "", is_featured: false, hide_from_guests: false }} />
  </section>;
}
