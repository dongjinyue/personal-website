import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>© 2026 MY SPACE</p>
        <p>记录 AI 新变化 · 持续学习，持续构建。</p>
      </div>
    </footer>
  );
}
