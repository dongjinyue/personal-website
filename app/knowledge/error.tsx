"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./knowledge.module.css";

export default function KnowledgeError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 只记录错误对象供本地排查，界面不暴露仓库路径或底层 Git 信息。
    console.error(error);
  }, [error]);

  return (
    <main className={`${styles.page} ${styles.errorPage}`}>
      <section className={styles.routeError} role="alert">
        <p className={styles.emptyCode}>INDEX UNAVAILABLE</p>
        <h1>暂时无法读取知识库</h1>
        <p>同步仓库可能正在更新，或读取服务暂时不可用。你可以稍后重试。</p>
        <div className={styles.errorActions}>
          <button type="button" onClick={reset}>重新读取</button>
          <Link href="/">返回首页</Link>
        </div>
      </section>
    </main>
  );
}
