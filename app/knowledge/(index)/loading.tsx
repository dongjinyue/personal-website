import styles from "../knowledge.module.css";

export default function KnowledgeLoading() {
  return (
    <main className={`${styles.page} ${styles.loadingPage}`} aria-busy="true">
      <div className={styles.loadingIndicator} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <div>
          <strong>正在整理知识索引</strong>
          <p>正在读取最新同步的笔记，请稍候。</p>
        </div>
      </div>
    </main>
  );
}
