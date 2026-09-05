import ToolExplorer from "@/components/ToolExplorer";
import { getPublicToolCategories, getTools } from "@/lib/tool-repository";
import styles from "../collection.module.css";

// 工具公开状态需要随后台操作实时更新，不能在构建时固化。
export const dynamic = "force-dynamic";

/**
 * 工具页面是 Server Component（服务端组件）。
 * 页面渲染前先从 Supabase 读取工具数据，再传给客户端搜索组件。
 */
export default async function ToolsPage() {
  const [tools, categories] = await Promise.all([
    getTools(), getPublicToolCategories(),
  ]);

  return (
    <main className={`${styles.page} ${styles.compactPage}`}>
      <header className={`${styles.heading} ${styles.compactHeading}`}>
        <p className={styles.eyebrow}>TOOLBOX</p>
        <h1>工具集</h1>
        <p className={styles.intro}>
          收藏开发、学习和日常工作中反复使用的实用工具。
        </p>
      </header>

      <ToolExplorer tools={tools} categories={categories} />
    </main>
  );
}
