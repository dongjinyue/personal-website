import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import ToolCard from "@/components/ToolCard";
import { projects } from "@/data/projects";
import { tools } from "@/data/tools";
import styles from "./page.module.css";

const featuredProjects = projects
  .filter((project) => project.isFeatured)
  .slice(0, 2);

const favoriteTools = tools
  .filter((tool) => tool.isFavorite)
  .slice(0, 2);

const quickLinks = [
  { href: "/projects", title: "项目中心", description: "查看正在推进与已经完成的个人项目。", meta: "PROJECTS", icon: "folder" },
  { href: "/tools", title: "工具集", description: "快速打开开发、学习与日常效率工具。", meta: "TOOLBOX", icon: "grid" },
] as const;

function QuickLinkIcon({ type }: { type: (typeof quickLinks)[number]["icon"] }) {
  if (type === "folder") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.75 6.75h5l2 2h9.5v8.5a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V6.75Z" /><path d="M3.75 9h16.5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.25" /><rect x="14" y="4" width="6" height="6" rx="1.25" /><rect x="4" y="14" width="6" height="6" rx="1.25" /><rect x="14" y="14" width="6" height="6" rx="1.25" /></svg>;
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true" />PERSONAL WORKSPACE</p>
          <h1 id="hero-title">欢迎来到我的<span>个人数字空间。</span></h1>
          <p className={styles.intro}>这里整理我的项目、常用工具，以及持续积累的学习内容。一个为长期使用而生的个人入口。</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/projects">浏览项目<span aria-hidden="true">↗</span></Link>
            <Link className={styles.secondaryAction} href="/tools">打开工具集<span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className={styles.orbit} aria-hidden="true">
          <div className={styles.orbitCore}><span>MY</span><strong>SPACE</strong></div>
          <span className={styles.orbitDotOne} /><span className={styles.orbitDotTwo} />
          <p>PROJECTS · TOOLS · NOTES</p>
        </div>
      </section>

      <section className={styles.quickSection} aria-labelledby="quick-links-title">
        <div className={styles.sectionHeading}>
          <div><p>START HERE</p><h2 id="quick-links-title">快捷入口</h2></div>
          <p>从最常用的两个地方开始。</p>
        </div>
        <div className={styles.quickGrid}>
          {quickLinks.map((item) => (
            <Link className={styles.quickCard} href={item.href} key={item.href}>
              <span className={styles.cardIcon}><QuickLinkIcon type={item.icon} /></span>
              <span className={styles.cardContent}>
                <span className={styles.cardMeta}>{item.meta}</span><strong>{item.title}</strong>
                <span className={styles.cardDescription}>{item.description}</span>
              </span>
              <span className={styles.cardArrow} aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.contentSection} aria-labelledby="recent-projects-title">
        <div className={styles.contentHeading}>
          <div>
            <p>RECENT WORK</p>
            <h2 id="recent-projects-title">最近项目</h2>
          </div>
          <Link href="/projects">查看全部项目 <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.contentGrid}>
          {featuredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.name}
              description={project.description}
              headingLevel="h3"
            />
          ))}
        </div>
      </section>

      <section className={styles.contentSection} aria-labelledby="favorite-tools-title">
        <div className={styles.contentHeading}>
          <div>
            <p>DAILY TOOLS</p>
            <h2 id="favorite-tools-title">常用工具</h2>
          </div>
          <Link href="/tools">查看全部工具 <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.contentGrid}>
          {favoriteTools.map((tool) => (
            <ToolCard
              key={tool.id}
              name={tool.name}
              description={tool.description}
              url={tool.url}
              headingLevel="h3"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
