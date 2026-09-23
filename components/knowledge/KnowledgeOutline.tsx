import type { MarkdownAnalysis } from "@/lib/knowledge/markdown";

type Props = {
  items: MarkdownAnalysis["outline"];
  className?: string;
};

/** 目录只链接共享 Markdown 分析器生成的真实标题 ID。 */
export default function KnowledgeOutline({ items, className }: Props) {
  if (items.length === 0) return null;

  return (
    <nav className={className} aria-label="本文目录">
      <p>ON THIS PAGE</p>
      <h2>本文目录</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id} data-depth={item.depth}>
            <a href={`#${encodeURIComponent(item.id)}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
