"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNewsGuestVisibility } from "@/app/admin/news/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DeleteNewsButton from "@/components/admin/DeleteNewsButton";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Row = {
  id: string;
  title: string;
  source_url: string | null;
  source_name: string;
  category: string;
  hide_from_guests: boolean;
  published_at: string | null;
  updated_at: string;
};

type Props = { rows: Row[]; total: number; page: number; pages: number; first: number; last: number };

export default function NewsSelectionTable({ rows, total, page, pages, first, last }: Props) {
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
      const result = await setNewsGuestVisibility(selectedItems, targetVisibility);
      setMessage(result.message);
      if (!result.ok) return;
      setTargetVisibility(null); setSelected(new Set()); router.refresh();
    });
  }

  return <>
    <div className={styles.bulkToolbar} aria-label="新闻批量操作">
      <span>已选择 {selected.size} 项</span>
      <button type="button" className={`${styles.button} ${styles.primaryButton}`}
        disabled={!selected.size || pending} onClick={() => { setMessage(""); setTargetVisibility(true); }}>游客可见</button>
      <button type="button" className={styles.button}
        disabled={!selected.size || pending} onClick={() => { setMessage(""); setTargetVisibility(false); }}>仅登录可见</button>
    </div>
    <p className={styles.notice} role="status" aria-live="polite">{message}</p>
    <div className={`${styles.tableWrap} ${styles.desktopTable}`} tabIndex={0} role="region" aria-label="新闻管理列表，可横向滚动">
      <table className={`${styles.table} ${styles.toolTable}`}>
        <caption>当前显示第 {first}～{last} 条，共 {total} 条，第 {page}/{pages} 页。</caption>
        <thead><tr><th scope="col" className={styles.selectColumn}><input type="checkbox" aria-label="选择当前页全部新闻"
          checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))} /></th>
          <th scope="col">标题</th><th scope="col">来源</th><th scope="col">分类</th><th scope="col">游客访问</th>
          <th scope="col">发布时间（北京时间）</th><th scope="col">操作</th></tr></thead>
        <tbody>{rows.map((news) => <tr key={news.id}>
          <td className={styles.selectColumn}><input type="checkbox" aria-label={`选择新闻 ${news.title}`} checked={selected.has(news.id)}
            onChange={() => setSelected((current) => {
              const next = new Set(current);
              if (next.has(news.id)) next.delete(news.id);
              else next.add(news.id);
              return next;
            })} /></td>
          <th scope="row">{news.title}</th>
          <td>{news.source_name}</td>
          <td>{news.category}</td>
          <td><span className={!news.hide_from_guests ? styles.publicBadge : styles.privateBadge}>
            {!news.hide_from_guests ? "游客可见" : "仅登录可见"}
          </span></td>
          <td>{news.published_at ? formatAdminDate(news.published_at) : "—"}</td>
          <td><div className={styles.rowActions}>
            {news.source_url ? <a className={styles.link} href={news.source_url} target="_blank" rel="noopener noreferrer">访问</a> : <span className={styles.link} aria-disabled="true">无链接</span>}
            <DeleteNewsButton id={news.id} title={news.title} updatedAt={news.updated_at} page={page} />
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ConfirmDialog open={targetVisibility !== null}
      title={targetVisibility ? `让游客看到所选 ${selected.size} 条新闻吗？` : `将所选 ${selected.size} 条新闻设为仅登录可见吗？`}
      description={targetVisibility ? "未登录游客和已登录用户都能看到所选新闻。" : "未登录游客看不到所选新闻；登录用户仍可在新闻页看到。"}
      confirmLabel={targetVisibility ? "确认游客可见" : "确认仅登录可见"} pending={pending} message={message}
      onCancel={() => setTargetVisibility(null)} onConfirm={confirmVisibility} />
  </>;
}
