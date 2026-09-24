import styles from "../collection.module.css";

export default function NewsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>AI NEWS</p>
        <h1>AI 新闻</h1>
        <p className={styles.intro}>正在读取最新新闻…</p>
      </header>
    </main>
  );
}
