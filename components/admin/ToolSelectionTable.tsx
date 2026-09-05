"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setToolsVisibility } from "@/app/admin/tools/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DeleteToolButton from "@/components/admin/DeleteToolButton";
import GuardedLink from "@/components/admin/GuardedLink";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Row = {
  id: string; name: string; url: string; category: string;
  is_public: boolean; updated_at: string;
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
      const result = await setToolsVisibility(selectedItems, targetVisibility);
      setMessage(result.message);
      if (!result.ok) return;
      setTargetVisibility(null); setSelected(new Set()); router.refresh();
    });
  }

  return <>
    <div className={styles.bulkToolbar} aria-label="工具批量操作">
      <span>已选择 {selected.size} 项</span>
      <button type="button" className={`${styles.button} ${styles.primaryButton}`}
        disabled={!selected.size || pending} onClick={() => { setMessage(""); setTargetVisibility(true); }}>设为公开</button>
      <button type="button" className={styles.button}
        disabled={!selected.size || pending} onClick={() => { setMessage(""); setTargetVisibility(false); }}>设为隐藏</button>
    </div>
    <p className={styles.notice} role="status" aria-live="polite">{message}</p>
    <div className={`${styles.tableWrap} ${styles.desktopTable}`} tabIndex={0} role="region" aria-label="工具管理列表，可横向滚动">
      <table className={`${styles.table} ${styles.toolTable}`}>
        <caption>当前显示第 {first}～{last} 条，共 {total} 条，第 {page}/{pages} 页。</caption>
        <thead><tr><th scope="col" className={styles.selectColumn}><input type="checkbox" aria-label="选择当前页全部工具"
          checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))} /></th>
          <th scope="col">名称</th><th scope="col">分类</th><th scope="col">是否公开</th><th scope="col">标签</th>
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
          <td><span className={tool.is_public ? styles.publicBadge : styles.privateBadge}>{tool.is_public ? "公开" : "隐藏"}</span></td>
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
      title={targetVisibility ? `公开所选 ${selected.size} 个工具吗？` : `隐藏所选 ${selected.size} 个工具吗？`}
      description={targetVisibility ? "所选工具将出现在公开工具集和顶部导航中。" : "所选工具将从公开工具集和顶部导航中隐藏，后台数据不会删除。"}
      confirmLabel={targetVisibility ? "确认公开" : "确认隐藏"} pending={pending} message={message}
      onCancel={() => setTargetVisibility(null)} onConfirm={confirmVisibility} />
  </>;
}
