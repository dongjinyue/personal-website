import type { Metadata } from "next";
import Link from "next/link";
import AdminPreview from "@/components/admin/AdminPreview";
import { getAdminPreview } from "@/lib/admin-repository";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "工具预览" };

export default async function AdminToolsPage() {
  const result = await getAdminPreview("tools");
  return (
    <section className={styles.panel} aria-labelledby="tools-title">
      <h1 className={styles.heading} id="tools-title">工具预览</h1>
      <p className={styles.hint}>查看数据库最新 10 条记录。Day 13 再加入分页与增删改。</p>
      <AdminPreview result={result} label="工具" />
      <p><Link className={styles.link} href="/tools">查看公开工具页</Link></p>
    </section>
  );
}
