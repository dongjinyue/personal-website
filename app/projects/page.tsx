import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/data/projects";
import styles from "../collection.module.css";

const visibleProjects = projects;

export default function ProjectsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>PROJECTS</p>
        <h1>我的项目</h1>
        <p className={styles.intro}>整理正在推进和已经完成的项目，记录每一次构建与迭代。</p>
      </header>

      {visibleProjects.length > 0 ? (
        <section className={styles.grid} aria-label="项目列表">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.name}
              description={project.description}
              status={project.status}
              tags={project.tags}
              coverImage={project.coverImage}
              projectUrl={project.projectUrl}
              githubUrl={project.githubUrl}
            />
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <h2>还没有项目</h2>
          <p>完成第一个项目后，它会显示在这里。</p>
        </section>
      )}
    </main>
  );
}
