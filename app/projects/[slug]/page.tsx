import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProjectBySlug } from "@/lib/project-repository";
import { projectStatusLabels } from "@/lib/project-status";
import styles from "./page.module.css";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) {
    return { title: "项目不存在", robots: { index: false, follow: false } };
  }

  return {
    title: `${project.name} | 我的项目`,
    description: project.description,
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/projects">
        ← 返回项目列表
      </Link>

      <article className={styles.project}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>PROJECT DETAIL</p>
          <p className={styles.status}>{projectStatusLabels[project.status]}</p>
          <h1>{project.name}</h1>
          <p className={styles.lead}>{project.longDescription}</p>
        </header>

        {project.highlights.length > 0 && <section className={styles.section} aria-labelledby="highlights-title">
          <h2 id="highlights-title">项目亮点</h2>
          <ul className={styles.highlights}>
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>}

        {project.tags.length > 0 && <section className={styles.section} aria-labelledby="stack-title">
          <h2 id="stack-title">相关技术与能力</h2>
          <ul className={styles.tags} aria-label="项目标签">
            {project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </section>}

        {(project.githubUrl || project.projectUrl) && (
          <nav className={styles.actions} aria-label="项目外部链接">
            {project.githubUrl && (
              <a className={styles.action} href={project.githubUrl} target="_blank" rel="noreferrer">
                查看 GitHub
              </a>
            )}
            {project.projectUrl && (
              <a className={styles.action} href={project.projectUrl} target="_blank" rel="noreferrer">
                打开项目
              </a>
            )}
          </nav>
        )}
      </article>
    </main>
  );
}
