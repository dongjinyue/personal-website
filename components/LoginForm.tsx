"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/auth/actions";
import styles from "@/app/auth.module.css";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { message: "" });

  return (
    <form action={formAction} className={styles.form} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="login-email">邮箱</label>
        <input
          className={styles.input}
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          aria-describedby="login-message"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-password">密码</label>
        <input
          className={styles.input}
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          aria-describedby="login-message"
        />
      </div>
      <p className={styles.message} id="login-message" role="status" aria-live="polite">
        {state.message}
      </p>
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
