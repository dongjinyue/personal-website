import ToolForm from "@/components/admin/ToolForm";
import GuardedLink from "@/components/admin/GuardedLink";
import { getAdminTool } from "@/lib/admin-tools-repository";
import styles from "../../../admin.module.css";

export const metadata = { title: "编辑工具" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function EditToolPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tool = await getAdminTool(id);
  const returnPage = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page)
    ? Number(query.page)
    : 1;

  return (
    <section className={styles.panel} aria-labelledby="edit-tool-title">
      <h1 className={styles.heading} id="edit-tool-title">编辑工具：{tool.name}</h1>
      <p className={styles.hint}>修改业务字段；工具标识和时间由系统维护。</p>
      <ToolForm mode="edit" id={tool.id} version={tool.updated_at} returnPage={returnPage}
        initial={{ name: tool.name, description: tool.description, url: tool.url,
          category: tool.category, is_favorite: tool.is_favorite }} />
      <p><GuardedLink className={styles.link} href={`/admin/tools?page=${returnPage}`}>
        返回工具列表
      </GuardedLink></p>
    </section>
  );
}
