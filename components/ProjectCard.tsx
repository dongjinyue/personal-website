import Image from "next/image";
import type { ProjectStatus } from "@/data/projects";
import styles from "./Card.module.css";

type ProjectCardProps = {
  title: string;
  description: string;
  status?: ProjectStatus;
  tags?: string[];
  coverImage?: string;
  projectUrl?: string;
  githubUrl?: string;
  headingLevel?: "h2" | "h3";
};

const statusLabels: Record<ProjectStatus, string> = {
  building: "开发中",
  completed: "已完成",
  paused: "已暂停",
};

export default function ProjectCard({
  title,
  description,
  status,
  tags,
  coverImage,
  projectUrl,
  githubUrl,
  headingLevel = "h2",
}: ProjectCardProps) {
  // 首页只传基础信息；列表页传入完整数据后才显示封面和元信息。
  const showsDetails = Boolean(
    status || tags?.length || coverImage || projectUrl || githubUrl,
  );
  const Heading = headingLevel;

  return (
    <article className={styles.card}>
      {showsDetails && (
        <div className={styles.cover}>
          {coverImage ? (
            <Image
              src={coverImage}
              alt={`${title} 项目封面`}
              fill
              sizes="(max-width: 600px) 100vw, 50vw"
            />
          ) : (
            <div className={styles.coverFallback} aria-hidden="true">
              <span>{title.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>
      )}

      {status && <p className={styles.status}>{statusLabels[status]}</p>}
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>

      {tags && tags.length > 0 && (
        <ul className={styles.tags} aria-label="项目标签">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}

      {(githubUrl || projectUrl) && (
        <div className={styles.actions}>
          {githubUrl && (
            <a className={styles.action} href={githubUrl} target="_blank" rel="noreferrer">
              查看 GitHub
            </a>
          )}
          {projectUrl && (
            <a className={styles.action} href={projectUrl} target="_blank" rel="noreferrer">
              打开项目
            </a>
          )}
        </div>
      )}
    </article>
  );
}
