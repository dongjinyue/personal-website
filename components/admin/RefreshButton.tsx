"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import styles from "@/app/admin/admin.module.css";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unsaved = useUnsavedChanges();

  return (
    <button
      type="button"
      className={styles.button}
      disabled={pending || unsaved.pending}
      aria-busy={pending}
      onClick={() => unsaved.guardAction(() => startTransition(() => router.refresh()))}
    >
      {pending ? "正在刷新…" : "刷新数据"}
    </button>
  );
}
