import { randomUUID } from "node:crypto";
import ToolForm from "@/components/admin/ToolForm";
import GuardedLink from "@/components/admin/GuardedLink";
import { requireAdmin } from "@/lib/auth/admin";
import styles from "../../admin.module.css";

export const metadata = { title: "新增工具" };

type Props = { searchParams: Promise<{ page?: string | string[] }> };

export default async function NewToolPage({ searchParams }: Props) {
  await requireAdmin();
  const query = await searchParams;
  const returnPage = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page)
    ? Number(query.page)
    : 1;

  return (
    <section className={styles.panel} aria-labelledby="new-tool-title">
      <h1 className={styles.heading} id="new-tool-title">新增工具</h1>
      <p className={styles.hint}>保存后将出现在公开工具集；不要填写私密内容。</p>
      <ToolForm mode="create" id={randomUUID()} version="" returnPage={returnPage}
        initial={{ name: "", description: "", url: "", category: "学习", is_favorite: false }} />
      <p><GuardedLink className={styles.link} href={`/admin/tools?page=${returnPage}`}>
        返回工具列表
      </GuardedLink></p>
    </section>
  );
}
