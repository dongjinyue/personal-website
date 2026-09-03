"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

const links = [
  { href: "/admin", label: "概览" },
  { href: "/admin/tools", label: "工具预览" },
  { href: "/admin/projects", label: "项目预览" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="后台导航" className={styles.nav}>
      {links.map((item) => {
        // 概览只精确匹配，不能让每个后台页面都同时高亮概览。
        const active = item.href === "/admin"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navLink}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
