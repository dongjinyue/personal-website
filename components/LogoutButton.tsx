"use client";

import { useActionState } from "react";
import { logoutAction } from "@/app/auth/actions";
import styles from "@/app/auth.module.css";

export default function LogoutButton() {
  const [state, formAction, pending] = useActionState(logoutAction, { message: "" });

  return (
    <form action={formAction} className={styles.form} aria-busy={pending}>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "正在退出…" : "退出当前账号"}
      </button>
      <p className={styles.message} role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
