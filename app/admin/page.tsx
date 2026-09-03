import type { Metadata } from "next";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import AdminPreview from "@/components/admin/AdminPreview";
import { getAdminMetrics, getAdminPreview } from "@/lib/admin-repository";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "概览" };

export default async function AdminPage() {
  // 两个查询函数都带管理员验证，不依赖布局执行时序。
  const [metrics, tools] = await Promise.all([
    getAdminMetrics(),
    getAdminPreview("tools"),
  ]);

  return (
    <section className={styles.stack} aria-labelledby="overview-title">
      <header>
        <h1 className={styles.heading} id="overview-title">内容概览</h1>
        <p className={styles.hint}>查看当前内容数量与最近更新；工具现已支持管理。</p>
      </header>
      <div className={styles.stats}>
        {metrics.map((metric) => <StatCard key={metric.id} {...metric} />)}
      </div>
      <section className={styles.panel} aria-labelledby="recent-tools-title">
        <h2 id="recent-tools-title">最近更新的工具</h2>
        <AdminPreview result={tools} label="工具" />
        <p><Link className={styles.link} href="/admin/tools">前往工具管理</Link></p>
      </section>
    </section>
  );
}
