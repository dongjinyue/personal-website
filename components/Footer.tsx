import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>© 2026 我的个人网站</p>
        <p>持续学习，持续构建。</p>
      </div>
    </footer>
  );
}
