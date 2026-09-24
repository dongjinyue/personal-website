"use client";

import { useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import { transitionDismissedDropdown, type NavigationDropdownId } from "@/lib/navigation/dropdown-state";
import type { KnowledgeNavigationGroup } from "@/lib/knowledge/repository";
import { buildKnowledgeUrl } from "@/lib/knowledge/url";
import styles from "./Header.module.css";

const publicLinks = [
  { href: "/", label: "首页" },
  { href: "/news", label: "AI 新闻" },
];

type Props = {
  showAdmin: boolean;
  projects: Array<{ name: string; slug: string }>;
  tools: Array<{ name: string; url: string; category: string }>;
  categories: string[];
  knowledgeGroups: KnowledgeNavigationGroup[];
};

export default function HeaderNavigation({ showAdmin, projects, tools, categories, knowledgeGroups }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dismissedDropdown, setDismissedDropdown] = useState<NavigationDropdownId | null>(null);
  const handleDropdownNavigation = (dropdown: NavigationDropdownId) => () => {
    setOpen(false);
    setDismissedDropdown((current) => transitionDismissedDropdown(current, { type: "navigate", dropdown }));
  };
  const handleDropdownEnter = (dropdown: NavigationDropdownId) => {
    setDismissedDropdown((current) => transitionDismissedDropdown(current, { type: "pointer-enter", dropdown }));
  };
  const handleNavigationFocus = () => {
    setDismissedDropdown((current) => transitionDismissedDropdown(current, { type: "focus" }));
  };
  const knowledgeColumnCount = Math.max(1, Math.min(3, knowledgeGroups.length));
  const knowledgeDropdownWidthRem = 16 * knowledgeColumnCount + 0.75 * (knowledgeColumnCount - 1) + 1.8;
  const toolGroups = categories.map((category) => [
    category,
    tools.filter((tool) => tool.category === category),
  ] as const);

  return (
    <nav className={styles.navigation} aria-label="主要导航">
      <GuardedLink className={styles.brand} href="/" onNavigate={() => setOpen(false)}>MY SPACE</GuardedLink>
      <span className={styles.tagline}>每天几分钟，读懂 AI 新变化。</span>
      <button className={styles.menuButton} type="button" aria-expanded={open}
        aria-controls="primary-navigation-links" onClick={() => { setOpen((value) => !value); setDismissedDropdown(null); }}>
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
        <div className={styles.navItem} data-dropdown-dismissed={dismissedDropdown === "projects" ? "true" : undefined}
          onMouseEnter={() => handleDropdownEnter("projects")} onFocusCapture={handleNavigationFocus}>
          <GuardedLink href="/projects" onNavigate={handleDropdownNavigation("projects")}
            aria-current={pathname === "/projects" || pathname.startsWith("/projects/") ? "page" : undefined}>项目</GuardedLink>
          <div className={`${styles.dropdown} ${styles.projectDropdown}`} aria-label="最近可见项目">
            <p>最近项目</p>
            {projects.length > 0 ? projects.map((project) => (
              <GuardedLink key={project.slug} href={`/projects/${project.slug}`}
                onNavigate={handleDropdownNavigation("projects")}>{project.name}</GuardedLink>
            )) : <span>暂无可见项目</span>}
            <GuardedLink className={styles.dropdownAll} href="/projects"
              onNavigate={handleDropdownNavigation("projects")}>查看全部项目 →</GuardedLink>
          </div>
        </div>
        <div className={styles.navItem} data-dropdown-dismissed={dismissedDropdown === "tools" ? "true" : undefined}
          onMouseEnter={() => handleDropdownEnter("tools")} onFocusCapture={handleNavigationFocus}>
          <GuardedLink href="/tools" onNavigate={handleDropdownNavigation("tools")}
            aria-current={pathname === "/tools" ? "page" : undefined}>工具集</GuardedLink>
          <div className={`${styles.dropdown} ${styles.megaDropdown}`} aria-label="按分类浏览可见工具">
            <p className={styles.megaTitle}>工具分类</p>
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
                      )) : <span className={styles.megaGroupEmpty}>暂无可见工具</span>}
                    </div>
                  </section>
                ))}
              </div>
            ) : <span className={styles.megaEmpty}>暂无可见工具</span>}
            <GuardedLink className={styles.dropdownAll} href="/tools"
              onNavigate={handleDropdownNavigation("tools")}>查看全部工具 →</GuardedLink>
          </div>
        </div>
        <div className={styles.navItem} data-dropdown-dismissed={dismissedDropdown === "knowledge" ? "true" : undefined}
          onMouseEnter={() => handleDropdownEnter("knowledge")} onFocusCapture={handleNavigationFocus}>
          <GuardedLink href="/knowledge" onNavigate={handleDropdownNavigation("knowledge")}
            aria-current={pathname === "/knowledge" || pathname.startsWith("/knowledge/") ? "page" : undefined}>
            知识库
          </GuardedLink>
          <div className={`${styles.dropdown} ${styles.megaDropdown} ${styles.knowledgeMegaDropdown}`}
            style={{ "--knowledge-menu-width": `min(${knowledgeDropdownWidthRem}rem, calc(100vw - 3rem))` } as CSSProperties}
            role="group" aria-label="按分类浏览可见知识笔记">
            <p className={styles.megaTitle}>知识库分类</p>
            {knowledgeGroups.length > 0 ? (
              <div className={styles.megaGrid}>
                {knowledgeGroups.map((group) => (
                  <section className={styles.megaGroup} key={group.category}>
                    <header className={styles.megaGroupHeader}>
                      <span>分类 · {group.count} 篇</span>
                      <h2>
                        <GuardedLink href={buildKnowledgeUrl({ q: "", category: group.category, tag: "", sort: "updated-desc", page: 1 })}
                          onNavigate={handleDropdownNavigation("knowledge")}>{group.category}</GuardedLink>
                      </h2>
                    </header>
                    <div className={styles.megaItems}>
                      {group.notes.length > 0 ? group.notes.map((note) => (
                        <GuardedLink key={note.slug} href={`/knowledge/${encodeURIComponent(note.slug)}`}
                          onNavigate={handleDropdownNavigation("knowledge")}>{note.title}</GuardedLink>
                      )) : <span className={styles.megaGroupEmpty}>暂无笔记</span>}
                    </div>
                  </section>
                ))}
              </div>
            ) : <span className={styles.megaEmpty}>暂无可见笔记</span>}
            <GuardedLink className={styles.dropdownAll} href="/knowledge"
              onNavigate={handleDropdownNavigation("knowledge")}>查看全部知识库 →</GuardedLink>
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
