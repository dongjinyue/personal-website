"use client";

import { useActionState, useRef } from "react";
import { logoutAction } from "@/app/auth/actions";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import styles from "@/app/auth.module.css";

export default function LogoutButton() {
  const [state, formAction, pending] = useActionState(logoutAction, { message: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const bypassGuard = useRef(false);
  const unsaved = useUnsavedChanges();

  return (
    <form
      ref={formRef}
      action={formAction}
      className={styles.form}
      aria-busy={pending}
      onSubmit={(event) => {
        if (bypassGuard.current) {
          bypassGuard.current = false;
          return;
        }
        if (!unsaved.dirty) return;
        event.preventDefault();
        unsaved.guardAction(() => {
          bypassGuard.current = true;
          formRef.current?.requestSubmit();
        });
      }}
    >
      <button type="submit" className={styles.button} disabled={pending || unsaved.pending}>
        {pending ? "正在退出…" : "退出当前账号"}
      </button>
      <p className={styles.message} role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
