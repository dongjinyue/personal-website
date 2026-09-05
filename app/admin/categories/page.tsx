import CategoryManager from "@/components/admin/CategoryManager";
import { getToolCategories } from "@/lib/tool-category-repository";
import styles from "../admin.module.css";

export const metadata = { title: "分类管理" };

export default async function CategoriesPage() {
  const categories = await getToolCategories();

  return (
    <section className={styles.panel} aria-labelledby="categories-title">
      <header>
        <h1 className={styles.heading} id="categories-title">分类管理</h1>
        <p className={styles.hint}>集中新增、查看、修改和删除工具分类；工具表单会自动读取这里的数据。</p>
      </header>
      <CategoryManager categories={categories} />
    </section>
  );
}
