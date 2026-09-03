import type { Metadata } from "next";
import Link from "next/link";
import AdminPreview from "@/components/admin/AdminPreview";
import { getAdminPreview } from "@/lib/admin-repository";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "项目预览" };

export default async function AdminProjectsPage() {
  const result = await getAdminPreview("projects");
  return (
    <section className={styles.panel} aria-labelledby="projects-title">
      <h1 className={styles.heading} id="projects-title">项目预览</h1>
      <p className={styles.hint}>这里读取云端项目表。公开项目页目前仍使用静态数据，后续再统一接入。</p>
      <AdminPreview result={result} label="项目" />
      <p><Link className={styles.link} href="/projects">查看公开项目页</Link></p>
    </section>
  );
}
