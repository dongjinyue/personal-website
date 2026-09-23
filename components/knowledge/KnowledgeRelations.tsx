import Link from "next/link";
import type { KnowledgeRelationItem } from "@/lib/knowledge/repository";

type Props = {
  outgoing: KnowledgeRelationItem[];
  backlinks: KnowledgeRelationItem[];
  previous: KnowledgeRelationItem | null;
  next: KnowledgeRelationItem | null;
};

function RelationList({ title, items }: { title: string; items: KnowledgeRelationItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={`relation-${title}`}>
      <h3 id={`relation-${title}`}>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/knowledge/${encodeURIComponent(item.slug)}`}>{item.title}</Link>
            <span>{item.category}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 关系区只消费权限层已经裁剪过的条目，不在浏览器端重做可见性判断。 */
export default function KnowledgeRelations({ outgoing, backlinks, previous, next }: Props) {
  const hasRelations = outgoing.length > 0 || backlinks.length > 0;
  return (
    <footer className="knowledge-relations">
      {hasRelations ? (
        <div className="knowledge-relation-groups">
          <RelationList title="本文提到" items={outgoing} />
          <RelationList title="提到本文" items={backlinks} />
        </div>
      ) : (
        <p className="knowledge-relations-empty">这篇笔记暂时没有与其他可见笔记建立链接。</p>
      )}

      {(previous || next) ? (
        <nav className="knowledge-neighbors" aria-label="相邻笔记">
          {previous ? (
            <Link href={`/knowledge/${encodeURIComponent(previous.slug)}`} rel="prev">
              <small>上一篇</small><span>{previous.title}</span>
            </Link>
          ) : <span aria-hidden="true" />}
          {next ? (
            <Link href={`/knowledge/${encodeURIComponent(next.slug)}`} rel="next">
              <small>下一篇</small><span>{next.title}</span>
            </Link>
          ) : <span aria-hidden="true" />}
        </nav>
      ) : null}
    </footer>
  );
}
