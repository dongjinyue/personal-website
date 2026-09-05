"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProjectsVisibility } from "@/app/admin/projects/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DeleteProjectButton from "@/components/admin/DeleteProjectButton";
import GuardedLink from "@/components/admin/GuardedLink";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Row = {
  id: string;
  slug: string;
  name: string;
  is_public: boolean;
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
      const result = await setProjectsVisibility(selectedItems, targetVisibility);
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
        设为公开
      </button>
      <button type="button" className={styles.button}
        disabled={selected.size === 0 || pending} onClick={() => { setMessage(""); setTargetVisibility(false); }}>
        设为隐藏
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
          <th scope="col">名称</th><th scope="col">Slug</th><th scope="col">是否公开</th>
          <th scope="col">首页推荐</th><th scope="col">更新时间（北京时间）</th><th scope="col">操作</th>
        </tr></thead>
        <tbody>{rows.map((project) => <tr key={project.id}>
          <td className={styles.selectColumn}><input type="checkbox" aria-label={`选择项目 ${project.name}`}
            checked={selected.has(project.id)} onChange={() => setSelected((current) => {
              const next = new Set(current); if (next.has(project.id)) next.delete(project.id); else next.add(project.id); return next;
            })} /></td>
          <th scope="row">{project.name}</th><td>{project.slug}</td>
          <td><span className={project.is_public ? styles.publicBadge : styles.privateBadge}>{project.is_public ? "公开" : "隐藏"}</span></td>
          <td>{project.is_featured ? "推荐" : "不推荐"}</td><td>{formatAdminDate(project.updated_at)}</td>
          <td><div className={styles.rowActions}>{project.is_public && <GuardedLink className={styles.link} href={`/projects/${project.slug}`}>查看</GuardedLink>}
            <GuardedLink className={styles.link} href={`/admin/projects/${project.id}/edit?page=${page}`}>编辑</GuardedLink>
            <DeleteProjectButton id={project.id} name={project.name} updatedAt={project.updated_at} page={page} /></div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ConfirmDialog open={targetVisibility !== null}
      title={targetVisibility ? `公开所选 ${selected.size} 个项目吗？` : `隐藏所选 ${selected.size} 个项目吗？`}
      description={targetVisibility
        ? "所选项目的名称、说明、链接、亮点和标签将对所有访客可见。"
        : "所选项目将从公开列表和详情页隐藏，后台数据不会删除。"}
      confirmLabel={targetVisibility ? "确认公开" : "确认隐藏"} pending={pending} message={message}
      onCancel={() => setTargetVisibility(null)} onConfirm={confirmVisibility} />
  </>;
}
