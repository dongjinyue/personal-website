import styles from "./admin.module.css";

export default function AdminLoading() {
  return (
    <section className={`${styles.panel} ${styles.state}`} role="status" aria-live="polite">
      <p>正在读取后台数据…</p>
      <p className={styles.hint}>请稍候，导航会在可用时保持显示。</p>
    </section>
  );
}
