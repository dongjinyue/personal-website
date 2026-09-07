import Image from "next/image";
import Link from "next/link";
import type { ProjectStatus } from "@/data/projects";
import { projectStatusLabels } from "@/lib/project-status";
import styles from "./Card.module.css";

type ProjectCardProps = {
  title: string;
  description: string;
  longDescription?: string;
  highlights?: string[];
  slug?: string;
  status?: ProjectStatus;
  tags?: string[];
  coverImage?: string;
  projectUrl?: string;
  githubUrl?: string;
  headingLevel?: "h2" | "h3";
};

export default function ProjectCard({
  title,
  description,
  longDescription,
  highlights,
  slug,
  status,
  tags,
  coverImage,
  projectUrl,
  githubUrl,
  headingLevel = "h2",
}: ProjectCardProps) {
  const Heading = headingLevel;

  return (
    <article className={styles.card}>
      {coverImage && (
        <div className={styles.cover}>
          <Image
            src={coverImage}
            alt={`${title} 项目封面`}
            fill
            sizes="(max-width: 600px) 100vw, 50vw"
          />
        </div>
      )}

      {status && <p className={styles.status}>{projectStatusLabels[status]}</p>}
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>

      {longDescription && longDescription !== description && (
        <p className={styles.projectSummary}>{longDescription}</p>
      )}

      {highlights && highlights.length > 0 && (
        <ul className={styles.highlights} aria-label={`${title} 项目亮点`}>
          {highlights.slice(0, 2).map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      )}

      {tags && tags.length > 0 && (
        <ul className={styles.tags} aria-label="项目标签">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}

      {(slug || githubUrl || projectUrl) && (
        <div className={styles.actions}>
          {slug && (
            <Link className={styles.action} href={`/projects/${slug}`}>
              查看详情
            </Link>
          )}
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
