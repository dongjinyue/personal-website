"use client";

import { useEffect, useRef } from "react";
import styles from "@/app/admin/admin.module.css";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  message?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** 应用统一确认弹窗；原生 dialog 提供模态背景与基础焦点约束。 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  message = "",
  danger = false,
  onCancel,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClose={() => {
        if (open && !pending) onCancel();
      }}
    >
      <div className={styles.dialogBody}>
        <h2 id="confirm-title" className={styles.heading}>{title}</h2>
        <p id="confirm-description">{description}</p>
        {pending && <p className={styles.hint}>操作正在处理，请勿关闭页面。</p>}
        <p className={styles.formMessage} role="status" aria-live="polite">{message}</p>
      </div>
      <div className={styles.dialogActions}>
        <button ref={cancelRef} type="button" className={styles.button}
          disabled={pending} onClick={onCancel}>
          取消
        </button>
        <button type="button"
          className={`${styles.button} ${danger ? styles.dangerButton : styles.primaryButton}`}
          disabled={pending} onClick={onConfirm}>
          {pending ? "正在处理…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
