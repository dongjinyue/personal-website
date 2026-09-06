"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTool } from "@/app/admin/tools/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import styles from "@/app/admin/admin.module.css";

type Props = { id: string; name: string; updated_at: string; page: number };

export default function DeleteToolButton({ id, name, updated_at, page }: Props) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) triggerRef.current?.focus();
  }, [open]);

  function submitDeletion() {
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await deleteTool(id, updated_at);
        if (!result.ok) { setMessage(result.message); return; }
        setOpen(false);
        router.replace(`/admin/tools?page=${page}&notice=deleted#tools-title`);
        router.refresh();
      } catch {
        setMessage("没有收到确认，请先核对列表，不要反复点击删除。");
      }
    });
  }

  return (
    <>
      <button ref={triggerRef} type="button" className={styles.deleteTrigger}
        onClick={() => { setMessage(""); setOpen(true); }}>删除</button>
      <ConfirmDialog open={open} title={`永久删除“${name}”吗？`}
        description="该工具会从所有用户的工具集移除，其标签关联也会删除；共享标签不会删除。本项目没有回收站，此操作不能一键撤销。"
        confirmLabel="永久删除工具" danger pending={pending} message={message}
        onCancel={() => setOpen(false)} onConfirm={submitDeletion} />
    </>
  );
}
