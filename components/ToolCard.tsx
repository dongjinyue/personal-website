import styles from "./Card.module.css";

type ToolCardProps = {
  name: string;
  description: string;
  url: string;
  headingLevel?: "h2" | "h3";
};

export default function ToolCard({
  name,
  description,
  url,
  headingLevel = "h2",
}: ToolCardProps) {
  // 与 ProjectCard 保持一致，方便父页面维护正确的标题层级。
  const Heading = headingLevel;

  return (
    <article className={styles.card}>
      <Heading className={styles.title}>{name}</Heading>
      <p className={styles.description}>{description}</p>

      <a className={styles.action} href={url} target="_blank" rel="noreferrer">
        打开工具
      </a>
    </article>
  );
}
