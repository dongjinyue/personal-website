"use client";

import Link from "next/link";
import styles from "./admin.module.css";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className={`${styles.panel} ${styles.state}`}>
      <h1 className={styles.heading}>后台内容暂时无法加载</h1>
      <p>请重试；如果持续失败，检查登录状态、网络和服务端终端。</p>
      <button type="button" className={styles.button} onClick={() => reset()}>重新加载</button>
      <Link className={styles.link} href="/">返回公开网站</Link>
    </section>
  );
}
