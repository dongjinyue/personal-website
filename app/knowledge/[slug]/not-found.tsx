import Link from "next/link";
import styles from "./page.module.css";

/** 私密和不存在的笔记共用相同文案，避免向游客确认资源是否存在。 */
export default function KnowledgeNoteNotFound() {
  return (
    <main className={`${styles.page} ${styles.notFoundPage}`}>
      <section className={styles.notFoundCard}>
        <p className={styles.eyebrow}>NOTE NOT FOUND / 404</p>
        <h1>没有找到这篇笔记</h1>
        <p>链接可能已经变化，或这篇笔记当前不可访问。你可以返回知识库继续浏览可见内容。</p>
        <Link href="/knowledge">返回知识库</Link>
      </section>
    </main>
  );
}
