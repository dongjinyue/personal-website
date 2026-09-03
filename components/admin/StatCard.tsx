import type { AdminMetric } from "@/lib/admin-repository";
import styles from "@/app/admin/admin.module.css";

export default function StatCard({ label, value }: AdminMetric) {
  return (
    <article className={styles.stat}>
      <h2>{label}</h2>
      <p className={styles.value}>
        {value === null ? "—" : value.toLocaleString("zh-CN")}
      </p>
      {value === null && <p className={styles.hint}>暂不可用，请刷新重试。</p>}
    </article>
  );
}
