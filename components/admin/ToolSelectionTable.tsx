"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setToolsGuestVisibility } from "@/app/admin/tools/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DeleteToolButton from "@/components/admin/DeleteToolButton";
import GuardedLink from "@/components/admin/GuardedLink";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Row = {
  id: string; name: string; url: string; category: string;
  hide_from_guests: boolean; updated_at: string;
  tool_tags: Array<{ tags: { name: string } | null }>;
};
type Props = { rows: Row[]; total: number; page: number; pages: number; first: number; last: number };

export default function ToolSelectionTable({ rows, total, page, pages, first, last }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetVisibility, setTargetVisibility] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedItems = useMemo(() => rows.filter((row) => selected.has(row.id))
    .map((row) => ({ id: row.id, updatedAt: row.updated_at })), [rows, selected]);

  function confirmVisibility() {
    if (targetVisibility === null || pending) return;
    startTransition(async () => {
      const result = await setToolsGuestVisibility(selectedItems, targetVisibility);
      setMessage(result.message);
      if (!result.ok) return;
      setTargetVisibility(null); setSelected(new Set()); router.refresh();
    });
  }

  return <>
    <div className={styles.bulkToolbar} aria-label="工具批量操作">
      <span>已选择 {selected.size} 项</span>
      <button type="button" className={`${styles.button} ${styles.primaryButton}`}
        disabled={!selected.size || pending} onClick={() => { setMessage(""); setTargetVisibility(true); }}>游客可见</button>
      <button type="button" className={styles.button}
        disabled={!selected.size || pending} onClick={() => { setMessage(""); setTargetVisibility(false); }}>仅登录可见</button>
    </div>
    <p className={styles.notice} role="status" aria-live="polite">{message}</p>
    <div className={`${styles.tableWrap} ${styles.desktopTable}`} tabIndex={0} role="region" aria-label="工具管理列表，可横向滚动">
      <table className={`${styles.table} ${styles.toolTable}`}>
        <caption>当前显示第 {first}～{last} 条，共 {total} 条，第 {page}/{pages} 页。</caption>
        <thead><tr><th scope="col" className={styles.selectColumn}><input type="checkbox" aria-label="选择当前页全部工具"
          checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))} /></th>
          <th scope="col">名称</th><th scope="col">分类</th><th scope="col">游客访问</th><th scope="col">标签</th>
          <th scope="col">更新时间（北京时间）</th><th scope="col">操作</th></tr></thead>
        <tbody>{rows.map((tool) => <tr key={tool.id}>
          <td className={styles.selectColumn}><input type="checkbox" aria-label={`选择工具 ${tool.name}`} checked={selected.has(tool.id)}
            onChange={() => setSelected((current) => {
              const next = new Set(current);
              if (next.has(tool.id)) next.delete(tool.id);
              else next.add(tool.id);
              return next;
            })} /></td>
          <th scope="row">{tool.name}</th><td>{tool.category}</td>
          <td><span className={!tool.hide_from_guests ? styles.publicBadge : styles.privateBadge}>
            {!tool.hide_from_guests ? "游客可见" : "仅登录可见"}
          </span></td>
          <td>{tool.tool_tags.flatMap((item) => item.tags ? [item.tags.name] : []).join("、") || "—"}</td>
          <td>{formatAdminDate(tool.updated_at)}</td><td><div className={styles.rowActions}>
            <a className={styles.link} href={tool.url} target="_blank" rel="noopener noreferrer">访问</a>
            <GuardedLink className={styles.link} href={`/admin/tools/${tool.id}/edit?page=${page}`}>编辑</GuardedLink>
            <DeleteToolButton id={tool.id} name={tool.name} updated_at={tool.updated_at} page={page} />
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ConfirmDialog open={targetVisibility !== null}
      title={targetVisibility ? `让游客看到所选 ${selected.size} 个工具吗？` : `将所选 ${selected.size} 个工具设为仅登录可见吗？`}
      description={targetVisibility ? "未登录游客和已登录用户都能看到所选工具。" : "未登录游客看不到所选工具；登录用户仍可在工具集和顶部菜单中看到。"}
      confirmLabel={targetVisibility ? "确认游客可见" : "确认仅登录可见"} pending={pending} message={message}
      onCancel={() => setTargetVisibility(null)} onConfirm={confirmVisibility} />
  </>;
}
