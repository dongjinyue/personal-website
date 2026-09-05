import { randomUUID } from "node:crypto";
import ToolForm from "@/components/admin/ToolForm";
import { requireAdmin } from "@/lib/auth/admin";
import { getToolCategories } from "@/lib/tool-category-repository";
import styles from "../../admin.module.css";

export const metadata = { title: "新增工具" };

type Props = { searchParams: Promise<{ page?: string | string[] }> };

export default async function NewToolPage({ searchParams }: Props) {
  const [, query, categories] = await Promise.all([
    requireAdmin(), searchParams, getToolCategories(),
  ]);
  const returnPage = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page)
    ? Number(query.page)
    : 1;

  return (
    <section className={styles.panel} aria-labelledby="new-tool-title">
      <h1 className={styles.heading} id="new-tool-title">新增工具</h1>
      <p className={styles.hint}>新工具默认隐藏，可在工具列表中设为公开；不要填写私密内容。</p>
      <ToolForm mode="create" id={randomUUID()} version="" returnPage={returnPage}
        categories={categories.map((category) => category.name)}
        initial={{ name: "", description: "", url: "", category: categories[0]?.name ?? "", is_favorite: false }} />
    </section>
  );
}
