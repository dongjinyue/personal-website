import Link from "next/link";
import { buildKnowledgeUrl, type KnowledgeQuery } from "@/lib/knowledge/url";
import styles from "@/app/knowledge/knowledge.module.css";

type CountOption = { name: string; count: number };

type Props = {
  query: KnowledgeQuery;
  categories: CountOption[];
  tags: CountOption[];
};

function filterHref(query: KnowledgeQuery, patch: Partial<KnowledgeQuery>) {
  return buildKnowledgeUrl({ ...query, ...patch, page: 1 });
}

/** 筛选使用真实链接，让返回、刷新和分享都能恢复同一组结果。 */
export default function KnowledgeFilters({ query, categories, tags }: Props) {
  const hasFilters = Boolean(query.q || query.category || query.tag || query.sort !== "updated-desc");
  const sortOptions = [
    { value: "updated-desc" as const, label: "最近更新" },
    { value: "created-asc" as const, label: "最早创建" },
    { value: "title-asc" as const, label: "标题排序" },
  ];

  return (
    <aside className={styles.filterPanel} aria-label="知识库筛选">
      <div className={styles.filterHeading}>
        <p>INDEX / 索引</p>
        {hasFilters ? <Link href="/knowledge">清除全部</Link> : null}
      </div>

      <section className={styles.filterSection} aria-labelledby="knowledge-category-heading">
        <h2 id="knowledge-category-heading">分类</h2>
        <div className={styles.filterLinks}>
          <Link
            href={filterHref(query, { category: "" })}
            aria-current={!query.category ? "true" : undefined}
          >
            <span>全部分类</span>
          </Link>
          {categories.map((category) => (
            <Link
              href={filterHref(query, { category: category.name })}
              aria-current={query.category === category.name ? "true" : undefined}
              key={category.name}
            >
              <span>{category.name}</span>
              <small>{category.count}</small>
            </Link>
          ))}
        </div>
      </section>

      {tags.length > 0 ? (
        <section className={styles.filterSection} aria-labelledby="knowledge-tag-heading">
          <h2 id="knowledge-tag-heading">标签</h2>
          <div className={styles.tagLinks}>
            {query.tag ? (
              <Link href={filterHref(query, { tag: "" })}>全部标签</Link>
            ) : null}
            {tags.map((tag) => (
              <Link
                href={filterHref(query, { tag: tag.name })}
                aria-current={query.tag === tag.name ? "true" : undefined}
                key={tag.name}
              >
                #{tag.name} <small>{tag.count}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.filterSection} aria-labelledby="knowledge-sort-heading">
        <h2 id="knowledge-sort-heading">排序</h2>
        <div className={styles.sortLinks}>
          {sortOptions.map((option) => (
            <Link
              href={filterHref(query, { sort: option.value })}
              aria-current={query.sort === option.value ? "true" : undefined}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
