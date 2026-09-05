"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createToolCategory,
  deleteToolCategory,
  renameToolCategory,
} from "@/app/admin/categories/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { ToolCategoryRecord } from "@/lib/tool-category-repository";
import styles from "@/app/admin/admin.module.css";

type Props = { categories: ToolCategoryRecord[] };

export default function CategoryManager({ categories }: Props) {
  const router = useRouter();
  const createInputRef = useRef<HTMLInputElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleting, setDeleting] = useState<ToolCategoryRecord | null>(null);
  const [message, setMessage] = useState("");

  function run(action: () => Promise<{ ok: boolean; message: string }>, onSuccess?: () => void) {
    setMessage("");
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() => createToolCategory(newName), () => {
      setNewName("");
      createInputRef.current?.focus();
    });
  }

  function closeDelete() {
    setDeleting(null);
    deleteTriggerRef.current?.focus();
  }

  return (
    <div className={styles.stack}>
      <form className={styles.categoryCreate} noValidate onSubmit={handleCreate}>
        <div className={styles.field}>
          <label htmlFor="new-category-name">新增分类</label>
          <input ref={createInputRef} className={styles.input} id="new-category-name"
            value={newName} onChange={(event) => setNewName(event.target.value)}
            maxLength={40} required placeholder="例如：设计" />
        </div>
        <button className={`${styles.button} ${styles.primaryButton}`} type="submit" disabled={pending}>
          {pending ? "正在处理…" : "新增分类"}
        </button>
      </form>

      <p className={styles.formMessage} role="status" aria-live="polite">{message}</p>

      {categories.length > 0 ? (
        <div className={styles.tableWrap} tabIndex={0} aria-label="工具分类表格，可横向滚动">
          <table className={`${styles.table} ${styles.categoryTable}`}>
            <caption>共 {categories.length} 个分类。分类改名后，相关工具会自动同步。</caption>
            <thead><tr><th scope="col">分类名称</th><th scope="col">更新时间（北京时间）</th><th scope="col">操作</th></tr></thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <th scope="row">
                    {editingId === category.id ? (
                      <input className={styles.input} aria-label={`修改分类 ${category.name}`}
                        value={editingName} maxLength={40}
                        onChange={(event) => setEditingName(event.target.value)} />
                    ) : category.name}
                  </th>
                  <td>{new Intl.DateTimeFormat("zh-CN", {
                    timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short",
                  }).format(new Date(category.updated_at))}</td>
                  <td><div className={styles.rowActions}>
                    {editingId === category.id ? (
                      <>
                        <button className={styles.textButton} type="button" disabled={pending}
                          onClick={() => run(
                            () => renameToolCategory(category.id, category.updated_at, editingName),
                            () => setEditingId(null),
                          )}>保存</button>
                        <button className={styles.textButton} type="button" disabled={pending}
                          onClick={() => setEditingId(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className={styles.textButton} type="button" disabled={pending}
                          onClick={() => { setEditingId(category.id); setEditingName(category.name); }}>编辑</button>
                        <button className={styles.deleteTrigger} type="button" disabled={pending}
                          onClick={(event) => {
                            deleteTriggerRef.current = event.currentTarget;
                            setDeleting(category);
                          }}>删除</button>
                      </>
                    )}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.state}>
          <h2>还没有分类</h2>
          <p className={styles.hint}>请先新增一个分类，之后才能创建工具。</p>
        </div>
      )}

      <ConfirmDialog open={Boolean(deleting)} title={`删除分类“${deleting?.name ?? ""}”？`}
        description="如果仍有工具使用这个分类，系统会阻止删除。删除成功后无法恢复。"
        confirmLabel="删除分类" danger pending={pending} message={message}
        onCancel={closeDelete}
        onConfirm={() => deleting && run(
          () => deleteToolCategory(deleting.id, deleting.updated_at),
          () => { setDeleting(null); createInputRef.current?.focus(); },
        )} />
    </div>
  );
}
