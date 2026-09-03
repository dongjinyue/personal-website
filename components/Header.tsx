import GuardedLink from "@/components/admin/GuardedLink";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.navigation} aria-label="主要导航">
        <GuardedLink className={styles.brand} href="/">MY SPACE</GuardedLink>
        <div className={styles.links}>
          <GuardedLink href="/">首页</GuardedLink>
          <GuardedLink href="/projects">项目</GuardedLink>
          <GuardedLink href="/tools">工具集</GuardedLink>
        </div>
      </nav>
    </header>
  );
}
