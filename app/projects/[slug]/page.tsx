import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";
import { projectStatusLabels } from "@/lib/project-status";
import styles from "./page.module.css";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    return { title: "项目不存在" };
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
  const project = projects.find((item) => item.slug === slug);

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

        <section className={styles.section} aria-labelledby="highlights-title">
          <h2 id="highlights-title">项目亮点</h2>
          <ul className={styles.highlights}>
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="stack-title">
          <h2 id="stack-title">相关技术与能力</h2>
          <ul className={styles.tags} aria-label="项目标签">
            {project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </section>

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
