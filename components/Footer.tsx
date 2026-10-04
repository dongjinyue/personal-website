import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>© 2026 MY SPACE</p>
        <p>记录 AI 新变化 · 持续学习，持续构建。</p>
        <p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            豫ICP备2026046984号-1
          </a>
        </p>
        <p>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=41010502008067"
            target="_blank"
            rel="noopener noreferrer"
          >
            豫公网安备41010502008067号
          </a>
        </p>
      </div>
    </footer>
  );
}
