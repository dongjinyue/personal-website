"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/admin/projects/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import styles from "@/app/admin/admin.module.css";

type Props = { id: string; name: string; updatedAt: string; page: number };
export default function DeleteProjectButton({ id, name, updatedAt, page }: Props) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!open) triggerRef.current?.focus(); }, [open]);
  function confirm() { startTransition(async () => {
    try {
      const result = await deleteProject(id, updatedAt);
      if (!result.ok) { setMessage(result.message); return; }
      setOpen(false); router.replace(`/admin/projects?page=${page}&notice=deleted#projects-title`); router.refresh();
    } catch { setMessage("没有收到确认，请先核对列表，不要重复删除。"); }
  }); }
  return <><button ref={triggerRef} type="button" className={styles.deleteTrigger}
    onClick={() => { setMessage(""); setOpen(true); }}>删除</button>
    <ConfirmDialog open={open} title={`永久删除“${name}”吗？`}
      description="项目、项目亮点和标签关联都会删除；共享标签会保留。项目没有回收站，此操作不能一键撤销。"
      confirmLabel="永久删除项目" danger pending={pending} message={message}
      onCancel={() => setOpen(false)} onConfirm={confirm} /></>;
}
