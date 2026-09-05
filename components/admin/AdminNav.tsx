"use client";

import { usePathname } from "next/navigation";
import GuardedLink from "@/components/admin/GuardedLink";
import styles from "@/app/admin/admin.module.css";

const links = [
  { href: "/admin/tools", label: "工具管理" },
  { href: "/admin/categories", label: "分类管理" },
  { href: "/admin/projects", label: "项目管理" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="后台导航" className={styles.nav}>
      {links.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <GuardedLink
            key={item.href}
            href={item.href}
            className={styles.navLink}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </GuardedLink>
        );
      })}
    </nav>
  );
}
