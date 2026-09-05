"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import styles from "./Header.module.css";

const publicLinks = [
  { href: "/", label: "首页" },
];

type Props = {
  showAdmin: boolean;
  projects: Array<{ name: string; slug: string }>;
  tools: Array<{ name: string; url: string; category: string }>;
  categories: string[];
};

export default function HeaderNavigation({ showAdmin, projects, tools, categories }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toolGroups = categories.map((category) => [
    category,
    tools.filter((tool) => tool.category === category),
  ] as const);

  return (
    <nav className={styles.navigation} aria-label="主要导航">
      <GuardedLink className={styles.brand} href="/" onNavigate={() => setOpen(false)}>MY SPACE</GuardedLink>
      <button className={styles.menuButton} type="button" aria-expanded={open}
        aria-controls="primary-navigation-links" onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{open ? "×" : "≡"}</span>
        <span>{open ? "关闭" : "菜单"}</span>
      </button>
      <div className={styles.links} id="primary-navigation-links" data-open={open}>
        {publicLinks.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <GuardedLink key={item.href} href={item.href}
            onNavigate={() => setOpen(false)}
            aria-current={active ? "page" : undefined}>{item.label}</GuardedLink>;
        })}
        <div className={styles.navItem}>
          <GuardedLink href="/projects" onNavigate={() => setOpen(false)}
            aria-current={pathname === "/projects" || pathname.startsWith("/projects/") ? "page" : undefined}>项目</GuardedLink>
          <div className={styles.dropdown} aria-label="公开项目快捷入口">
            <p>最近公开项目</p>
            {projects.map((project) => <GuardedLink key={project.slug} href={`/projects/${project.slug}`}
              onNavigate={() => setOpen(false)}>{project.name}</GuardedLink>)}
            {projects.length === 0 && <span>暂无公开项目</span>}
            <GuardedLink className={styles.dropdownAll} href="/projects" onNavigate={() => setOpen(false)}>查看全部项目 →</GuardedLink>
          </div>
        </div>
        <div className={styles.navItem}>
          <GuardedLink href="/tools" onNavigate={() => setOpen(false)}
            aria-current={pathname === "/tools" ? "page" : undefined}>工具集</GuardedLink>
          <div className={`${styles.dropdown} ${styles.megaDropdown}`} aria-label="按分类浏览公开工具">
            <p className={styles.megaTitle}>公开工具分类</p>
            {toolGroups.length > 0 ? (
              <div className={styles.megaGrid}>
                {toolGroups.map(([category, categoryTools]) => (
                  <section className={styles.megaGroup} key={category}>
                    <header className={styles.megaGroupHeader}>
                      <span>分类</span>
                      <h2>{category}</h2>
                    </header>
                    <div className={styles.megaItems}>
                      {categoryTools.length > 0 ? categoryTools.map((tool) => (
                        <a key={tool.url} href={tool.url} target="_blank" rel="noopener noreferrer">
                          {tool.name}<span aria-hidden="true"> ↗</span>
                        </a>
                      )) : <span className={styles.megaGroupEmpty}>暂无公开工具</span>}
                    </div>
                  </section>
                ))}
              </div>
            ) : <span className={styles.megaEmpty}>暂无公开工具</span>}
            <GuardedLink className={styles.dropdownAll} href="/tools" onNavigate={() => setOpen(false)}>查看全部工具 →</GuardedLink>
          </div>
        </div>
        {showAdmin ? (
          <GuardedLink href="/admin/tools" onNavigate={() => setOpen(false)}
            aria-current={pathname === "/admin" || pathname.startsWith("/admin/") ? "page" : undefined}>
            后台管理
          </GuardedLink>
        ) : (
          <GuardedLink href="/login" onNavigate={() => setOpen(false)}
            aria-current={pathname === "/login" ? "page" : undefined}>
            登录
          </GuardedLink>
        )}
      </div>
    </nav>
  );
}
