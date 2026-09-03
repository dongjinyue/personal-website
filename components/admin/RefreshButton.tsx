"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={styles.button}
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "正在刷新…" : "刷新数据"}
    </button>
  );
}
