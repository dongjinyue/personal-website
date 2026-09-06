import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProjectCard from "@/components/ProjectCard";
import { getPublicProjectsPage } from "@/lib/project-repository";
import styles from "../collection.module.css";

export const metadata: Metadata = {
  title: "项目",
  description: "查看我正在构建、已经完成和持续打磨的项目。",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ page?: string | string[] }> };

export default async function ProjectsPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? query.page : undefined;
  const result = await getPublicProjectsPage(rawPage);

  if (rawPage !== String(result.page)) redirect(`/projects?page=${result.page}`);
  if (result.projects.length === 0 && result.page > 1) {
    redirect(`/projects?page=${result.page - 1}`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>PROJECTS</p>
        <h1>项目</h1>
        <p className={styles.intro}>记录正在构建、已经完成和持续打磨的作品。</p>
      </header>

      {result.projects.length === 0 ? (
        <section className={styles.emptyState}>
          <h2>暂时没有可见项目</h2>
          <p>项目准备好后会出现在这里。</p>
        </section>
      ) : (
        <>
          <section className={styles.grid} aria-label={`可见项目，共 ${result.total} 个`}>
            {result.projects.map((project) => (
              <ProjectCard key={project.id} title={project.name}
                description={project.description} slug={project.slug}
                status={project.status} tags={project.tags}
                projectUrl={project.projectUrl} githubUrl={project.githubUrl} />
            ))}
          </section>
          <nav className={styles.pagination} aria-label="项目列表分页">
            {result.page > 1 ? <Link href={`/projects?page=${result.page - 1}`}>上一页</Link>
              : <span aria-disabled="true">上一页</span>}
            <span>第 {result.page}/{result.pages} 页</span>
            {result.page < result.pages ? <Link href={`/projects?page=${result.page + 1}`}>下一页</Link>
              : <span aria-disabled="true">下一页</span>}
          </nav>
        </>
      )}
    </main>
  );
}
