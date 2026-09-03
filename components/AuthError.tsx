"use client";

import styles from "@/app/auth.module.css";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.panel}>
      <h1>暂时无法完成身份验证</h1>
      <p>请稍后重试。开发时请同时检查终端和认证配置。</p>
      <button className={styles.button} type="button" onClick={() => reset()}>
        重试
      </button>
    </main>
  );
}
