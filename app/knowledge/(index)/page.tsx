import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import KnowledgeCard from "@/components/knowledge/KnowledgeCard";
import KnowledgeFilters from "@/components/knowledge/KnowledgeFilters";
import KnowledgeSearch from "@/components/knowledge/KnowledgeSearch";
import { getKnowledgeListForCurrentUser } from "@/lib/knowledge/repository";
import { buildKnowledgeUrl, buildRawKnowledgeUrl } from "@/lib/knowledge/url";
import { getPaginationItems } from "@/lib/pagination";
import styles from "../knowledge.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "知识库 | MY SPACE",
  description: "浏览从 Obsidian 同步的编程、AI 与项目知识笔记。",
};

/**
 * 知识库索引由服务端完成身份判断和筛选，浏览器只会收到当前用户可见的笔记。
 */
export default async function KnowledgePage({ searchParams }: PageProps<"/knowledge">) {
  const rawQuery = await searchParams;
  const result = await getKnowledgeListForCurrentUser(rawQuery);
  const canonicalUrl = buildKnowledgeUrl(result.canonicalQuery);

  if (buildRawKnowledgeUrl(rawQuery) !== canonicalUrl) redirect(canonicalUrl);

  const { canonicalQuery: query } = result;
  const pageItems = getPaginationItems(result.page, result.pages);
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>KNOWLEDGE INDEX / 知识索引</p>
          <h1>知识库</h1>
          <p className={styles.intro}>
            从 Obsidian 同步而来的个人知识索引。按主题翻阅，或直接找到记忆里的那句话。
          </p>
        </div>
        <div className={styles.archiveStamp} aria-label={`当前可访问 ${result.visibleTotal} 篇笔记`}>
          <span>AVAILABLE NOTES</span>
          <strong>{String(result.visibleTotal).padStart(2, "0")}</strong>
          <small>{result.isAdmin ? "管理员视图" : "公开视图"}</small>
        </div>
      </header>

      <section className={styles.searchPanel} aria-label="搜索知识库">
        <KnowledgeSearch initialQuery={query.q} />
        <p className={styles.searchHint}>支持搜索标题、正文与标签，筛选状态会保存在网址中。</p>
      </section>

      {result.visibleTotal === 0 ? (
        <section className={styles.emptyState}>
          <p className={styles.emptyCode}>EMPTY ARCHIVE</p>
          <h2>还没有知识库笔记</h2>
          <p>在 Obsidian 中创建第一篇笔记并同步仓库后，它会出现在这里。</p>
        </section>
      ) : (
        <div className={styles.workspace}>
          <KnowledgeFilters query={query} categories={result.categories} tags={result.tags} />

          <section className={styles.results} aria-labelledby="knowledge-results-heading">
            <div className={styles.resultHeader}>
              <div>
                <p className={styles.resultKicker}>检索结果</p>
                <h2 id="knowledge-results-heading" role="status" aria-live="polite" aria-atomic="true">
                  {result.total > 0 ? `${rangeStart}–${rangeEnd} / 共 ${result.total} 篇` : "没有匹配项"}
                </h2>
              </div>
              {result.total > 0 ? <span>第 {result.page} / {result.pages} 页</span> : null}
            </div>

            {result.total === 0 ? (
              <div className={styles.noResults}>
                <h3>没有符合条件的笔记</h3>
                <p>试试更短的关键词，或清除当前分类、标签和排序条件。</p>
                <Link href="/knowledge">清除全部筛选</Link>
              </div>
            ) : (
              <div className={styles.noteList}>
                {result.items.map((note) => (
                  <KnowledgeCard key={note.slug} note={note} showAccessState={result.isAdmin} />
                ))}
              </div>
            )}

            {result.total > 0 && result.pages > 1 ? (
              <nav className={styles.pagination} aria-label="知识库分页">
                {result.page > 1 ? (
                  <Link href={buildKnowledgeUrl({ ...query, page: result.page - 1 })}>← 上一页</Link>
                ) : <span aria-disabled="true">← 上一页</span>}
                <div className={styles.pageNumbers}>
                  {pageItems.map((item) => typeof item === "number" ? (
                    item === result.page ? (
                      <span className={styles.currentPage} aria-current="page" key={item}>{item}</span>
                    ) : (
                      <Link href={buildKnowledgeUrl({ ...query, page: item })} key={item}
                        aria-label={`第 ${item} 页`}>{item}</Link>
                    )
                  ) : <span className={styles.ellipsis} aria-hidden="true" key={item}>…</span>)}
                </div>
                {result.page < result.pages ? (
                  <Link href={buildKnowledgeUrl({ ...query, page: result.page + 1 })}>下一页 →</Link>
                ) : <span aria-disabled="true">下一页 →</span>}
              </nav>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
