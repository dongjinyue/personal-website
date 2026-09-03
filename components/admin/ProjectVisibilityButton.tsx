"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProjectVisibility } from "@/app/admin/projects/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import styles from "@/app/admin/admin.module.css";

type Props = { id: string; name: string; updatedAt: string; isPublic: boolean };
export default function ProjectVisibilityButton({ id, name, updatedAt, isPublic }: Props) {
  const router = useRouter();
  const { dirty, pending: formPending } = useUnsavedChanges();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!open) triggerRef.current?.focus(); }, [open]);
  const description = isPublic
    ? `将“${name}”设为私有吗？公开列表和详情将不再提供该项目；无法收回别人已经保存的内容。`
    : `公开“${name}”吗？名称、说明、链接、已有亮点和标签关联将对所有访客可见。请确认其中没有私人信息。`;
  function confirm() { startTransition(async () => {
    try {
      const result = await setProjectVisibility(id, updatedAt, !isPublic);
      if (!result.ok) { setMessage(result.message); return; }
      setOpen(false); router.refresh();
    } catch { setMessage("没有收到确认，请刷新页面核对实际公开状态。"); }
  }); }
  return <>
    <button ref={triggerRef} type="button" className={styles.button} disabled={dirty || formPending}
      onClick={() => { setMessage(""); setOpen(true); }}>{isPublic ? "设为私有" : "公开项目"}</button>
    {dirty && <span className={styles.hint}>请先保存或放弃当前修改，再切换公开状态。</span>}
    <ConfirmDialog open={open} title={isPublic ? `将“${name}”设为私有吗？` : `公开“${name}”吗？`}
      description={description} confirmLabel={isPublic ? "确认设为私有" : "确认公开"}
      pending={pending} message={message} onCancel={() => setOpen(false)} onConfirm={confirm} />
  </>;
}
