import Link from "next/link";
import type { KnowledgeListItem } from "@/lib/knowledge/query";
import styles from "@/app/knowledge/knowledge.module.css";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

/** 笔记卡以索引卡为视觉语言，权限状态始终同时显示可读文字。 */
export default function KnowledgeCard({ note, showAccessState }: {
  note: KnowledgeListItem;
  showAccessState: boolean;
}) {
  const preview = note.highlights.length > 0 ? note.highlights : [
    { text: note.excerpt, matched: false },
  ];

  return (
    <article className={styles.noteCard}>
      <div className={styles.cardIndex} aria-hidden="true">
        {note.category.slice(0, 2).toLocaleUpperCase("zh-CN")}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{note.category}</span>
          <time dateTime={note.updatedAt}>更新于 {formatDate(note.updatedAt)}</time>
        </div>
        <h2>
          <Link href={`/knowledge/${encodeURIComponent(note.slug)}`}>{note.title}</Link>
        </h2>
        <p className={styles.cardExcerpt}>
          {preview.map((fragment, index) => fragment.matched ? (
            <mark key={`${fragment.text}-${index}`}>{fragment.text}</mark>
          ) : (
            <span key={`${fragment.text}-${index}`}>{fragment.text}</span>
          ))}
        </p>
        <div className={styles.cardFooter}>
          <ul className={styles.cardTags} aria-label="笔记标签">
            {note.tags.slice(0, 4).map((tag) => <li key={tag}>#{tag}</li>)}
          </ul>
          {showAccessState && (note.visibility === "private" || note.status === "draft") ? (
            <div className={styles.accessBadges} aria-label="笔记访问状态">
              {note.visibility === "private" ? <span>仅管理员</span> : null}
              {note.status === "draft" ? <span>草稿</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
