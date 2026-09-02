import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.navigation} aria-label="主要导航">
        <Link className={styles.brand} href="/">MY SPACE</Link>
        <div className={styles.links}>
          <Link href="/">首页</Link>
          <Link href="/projects">项目</Link>
          <Link href="/tools">工具集</Link>
        </div>
      </nav>
    </header>
  );
}
