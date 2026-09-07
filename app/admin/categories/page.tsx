import { redirect } from "next/navigation";
import AdminPagination from "@/components/admin/AdminPagination";
import CategoryManager from "@/components/admin/CategoryManager";
import { getAdminToolCategoriesPage } from "@/lib/tool-category-repository";
import styles from "../admin.module.css";

export const metadata = { title: "分类管理" };

type Props = { searchParams: Promise<{ page?: string | string[] }> };

export default async function CategoriesPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? query.page : undefined;
  const result = await getAdminToolCategoriesPage(rawPage);

  if (rawPage !== String(result.page)) redirect(`/admin/categories?page=${result.page}`);
  if (!result.rows.length && result.page > 1) redirect(`/admin/categories?page=${result.page - 1}`);

  return (
    <section className={styles.panel} aria-labelledby="categories-title">
      <header>
        <h1 className={styles.heading} id="categories-title">分类管理</h1>
        <p className={styles.hint}>集中新增、查看、修改和删除工具分类；工具表单会自动读取这里的数据。</p>
      </header>
      <CategoryManager categories={result.rows} total={result.total} />
      {result.total > 0 && <AdminPagination currentPage={result.page} pageCount={result.pages}
        basePath="/admin/categories" label="工具分类列表分页" />}
    </section>
  );
}
