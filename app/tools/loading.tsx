import styles from "../collection.module.css";

/** 路由切换时立即给出反馈，避免网络查询期间看起来像没有响应。 */
export default function ToolsLoading() {
  return (
    <main className={`${styles.page} ${styles.compactPage}`} aria-busy="true">
      <header className={`${styles.heading} ${styles.compactHeading}`}>
        <p className={styles.eyebrow}>TOOLBOX</p>
        <h1>工具集</h1>
        <p className={styles.intro}>正在读取适合当前账号查看的工具…</p>
      </header>
    </main>
  );
}
