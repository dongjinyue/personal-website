import styles from "./Card.module.css";

type ProjectCardProps = {
  title: string;
  description: string;
  headingLevel?: "h2" | "h3";
};

export default function ProjectCard({
  title,
  description,
  headingLevel = "h2",
}: ProjectCardProps) {
  // 卡片可出现在不同页面层级中，由父页面决定标题级别。
  const Heading = headingLevel;

  return (
    <article className={styles.card}>
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>
    </article>
  );
}
