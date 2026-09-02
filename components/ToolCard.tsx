import styles from "./Card.module.css";
import type { ToolCategory } from "@/data/tools";

type ToolCardProps = {
  name: string;
  description: string;
  url: string;
  category?: ToolCategory;
  tags?: string[];
  isFavorite?: boolean;
  headingLevel?: "h2" | "h3";
};

export default function ToolCard({
  name,
  description,
  url,
  category,
  tags,
  isFavorite,
  headingLevel = "h2",
}: ToolCardProps) {
  // 与 ProjectCard 保持一致，方便父页面维护正确的标题层级。
  const Heading = headingLevel;

  return (
    <article className={styles.card}>
      {(category || isFavorite) && (
        <p className={styles.meta}>
          {category && <span>{category}</span>}
          {isFavorite && <span>常用</span>}
        </p>
      )}
      <Heading className={styles.title}>{name}</Heading>
      <p className={styles.description}>{description}</p>

      {tags && tags.length > 0 && (
        <ul className={styles.tags} aria-label={`${name} 标签`}>
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <a className={styles.action} href={url} target="_blank" rel="noreferrer">
          打开工具 <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
