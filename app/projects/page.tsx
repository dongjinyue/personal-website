import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/data/projects";
import styles from "../collection.module.css";

export default function ProjectsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>PROJECTS</p>
        <h1>我的项目</h1>
        <p className={styles.intro}>整理正在推进和已经完成的项目，记录每一次构建与迭代。</p>
      </header>

      <section className={styles.grid} aria-label="项目列表">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            title={project.name}
            description={project.description}
          />
        ))}
      </section>
    </main>
  );
}
