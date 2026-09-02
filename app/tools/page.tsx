import ToolCard from "@/components/ToolCard";
import { tools } from "@/data/tools";
import styles from "../collection.module.css";

export default function ToolsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>TOOLBOX</p>
        <h1>工具集</h1>
        <p className={styles.intro}>收藏开发、学习和日常工作中反复使用的实用工具。</p>
      </header>

      <section className={styles.grid} aria-label="工具列表">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            name={tool.name}
            description={tool.description}
            url={tool.url}
          />
        ))}
      </section>
    </main>
  );
}
