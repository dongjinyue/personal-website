"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProjectsGuestVisibility } from "@/app/admin/projects/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DeleteProjectButton from "@/components/admin/DeleteProjectButton";
import GuardedLink from "@/components/admin/GuardedLink";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Row = {
  id: string;
  slug: string;
  name: string;
  hide_from_guests: boolean;
  is_featured: boolean;
  updated_at: string;
};

type Props = { rows: Row[]; total: number; page: number; first: number };

export default function ProjectSelectionTable({ rows, total, page, first }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetVisibility, setTargetVisibility] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedItems = useMemo(() => rows.filter((row) => selected.has(row.id))
    .map((row) => ({ id: row.id, updatedAt: row.updated_at })), [rows, selected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function confirmVisibility() {
    if (targetVisibility === null || pending) return;
    startTransition(async () => {
      const result = await setProjectsGuestVisibility(selectedItems, targetVisibility);
      setMessage(result.message);
      if (!result.ok) return;
      setTargetVisibility(null);
      setSelected(new Set());
      router.refresh();
    });
  }

  return <>
    <div className={styles.bulkToolbar} aria-label="项目批量操作">
      <span>已选择 {selected.size} 项</span>
      <button type="button" className={`${styles.button} ${styles.primaryButton}`}
        disabled={selected.size === 0 || pending} onClick={() => { setMessage(""); setTargetVisibility(true); }}>
        游客可见
      </button>
      <button type="button" className={styles.button}
        disabled={selected.size === 0 || pending} onClick={() => { setMessage(""); setTargetVisibility(false); }}>
        仅登录可见
      </button>
    </div>
    <p className={styles.notice} role="status" aria-live="polite">{message}</p>
    <div className={`${styles.tableWrap} ${styles.desktopTable}`} tabIndex={0}
      role="region" aria-label="项目管理列表，可横向滚动">
      <table className={`${styles.table} ${styles.projectTable}`}>
        <caption>当前显示第 {first}～{first + rows.length - 1} 条，共 {total} 条。</caption>
        <thead><tr>
          <th scope="col" className={styles.selectColumn}><input type="checkbox"
            aria-label="选择当前页全部项目" checked={allSelected} onChange={toggleAll} /></th>
          <th scope="col">名称</th><th scope="col">Slug</th><th scope="col">游客访问</th>
          <th scope="col">首页推荐</th><th scope="col">更新时间（北京时间）</th><th scope="col">操作</th>
        </tr></thead>
        <tbody>{rows.map((project) => <tr key={project.id}>
          <td className={styles.selectColumn}><input type="checkbox" aria-label={`选择项目 ${project.name}`}
            checked={selected.has(project.id)} onChange={() => setSelected((current) => {
              const next = new Set(current); if (next.has(project.id)) next.delete(project.id); else next.add(project.id); return next;
            })} /></td>
          <th scope="row">{project.name}</th><td>{project.slug}</td>
          <td><span className={!project.hide_from_guests ? styles.publicBadge : styles.privateBadge}>
            {!project.hide_from_guests ? "游客可见" : "仅登录可见"}
          </span></td>
          <td>{project.is_featured ? "推荐" : "不推荐"}</td><td>{formatAdminDate(project.updated_at)}</td>
          <td><div className={styles.rowActions}><GuardedLink className={styles.link} href={`/projects/${project.slug}`}>查看</GuardedLink>
            <GuardedLink className={styles.link} href={`/admin/projects/${project.id}/edit?page=${page}`}>编辑</GuardedLink>
            <DeleteProjectButton id={project.id} name={project.name} updatedAt={project.updated_at} page={page} /></div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ConfirmDialog open={targetVisibility !== null}
      title={targetVisibility ? `让游客看到所选 ${selected.size} 个项目吗？` : `将所选 ${selected.size} 个项目设为仅登录可见吗？`}
      description={targetVisibility
        ? "未登录游客和已登录用户都能看到所选项目。"
        : "未登录游客看不到所选项目；登录用户仍可在项目页和顶部菜单中看到。"}
      confirmLabel={targetVisibility ? "确认游客可见" : "确认仅登录可见"} pending={pending} message={message}
      onCancel={() => setTargetVisibility(null)} onConfirm={confirmVisibility} />
  </>;
}
