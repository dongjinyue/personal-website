import GuardedLink from "@/components/admin/GuardedLink";
import styles from "../admin.module.css";

export default function ToolNotFound() {
  return (
    <section className={`${styles.panel} ${styles.state}`}>
      <h1 className={styles.heading}>工具不存在或已删除</h1>
      <p>请返回工具列表重新选择。</p>
      <GuardedLink className={styles.link} href="/admin/tools?page=1">返回工具列表</GuardedLink>
    </section>
  );
}
