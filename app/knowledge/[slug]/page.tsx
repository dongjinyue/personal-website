import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { KnowledgeMarkdown } from "@/components/knowledge/KnowledgeMarkdown";
import KnowledgeOutline from "@/components/knowledge/KnowledgeOutline";
import KnowledgeRelations from "@/components/knowledge/KnowledgeRelations";
import { analyzeMarkdown } from "@/lib/knowledge/markdown";
import { getKnowledgeNoteForCurrentUser } from "@/lib/knowledge/repository";
import { createPageMetadata } from "@/lib/site-metadata";
import type { KnowledgeRelations as MarkdownRelations } from "@/lib/knowledge/relations";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const getNoteForRequest = cache(getKnowledgeNoteForCurrentUser);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export async function generateMetadata({
  params,
}: PageProps<"/knowledge/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteForRequest(slug);

  if (!note) {
    return {
      title: "笔记未找到",
      robots: { index: false, follow: false },
    };
  }

  const metadata = createPageMetadata(`/knowledge/${encodeURIComponent(slug)}`, note.title, note.description ?? `阅读知识库笔记：${note.title}`);
  // 管理员可读的草稿和私密笔记也明确禁止搜索引擎收录。
  if (note.visibility !== "public" || note.status !== "published") {
    metadata.robots = { index: false, follow: false };
  }
  return metadata;
}

/** 动态详情始终从权限感知 Repository 读取，未授权与不存在共享同一 404。 */
export default async function KnowledgeDetailPage({
  params,
}: PageProps<"/knowledge/[slug]">) {
  const { slug } = await params;
  const note = await getNoteForRequest(slug);
  if (!note) notFound();

  const analysis = analyzeMarkdown(note.markdown);
  const markdownRelations: MarkdownRelations = {
    outgoingBySlug: new Map([[note.slug, note.outgoing.map((item) => item.slug)]]),
    backlinksBySlug: new Map([[note.slug, note.backlinks.map((item) => item.slug)]]),
    brokenBySlug: new Map([[note.slug, note.broken.map((item) => item.slug)]]),
  };

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="面包屑导航">
        <ol>
          <li><Link href="/knowledge">知识库</Link></li>
          <li aria-current="page">{note.title}</li>
        </ol>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>KNOWLEDGE NOTE / {note.category}</p>
          <h1>{note.title}</h1>
          {note.description ? <p className={styles.description}>{note.description}</p> : null}
        </div>
        <dl className={styles.noteStamp}>
          <div><dt>创建</dt><dd>{formatDate(note.createdAt)}</dd></div>
          <div><dt>更新</dt><dd>{formatDate(note.updatedAt)}</dd></div>
        </dl>
      </header>

      <div className={styles.metaRow}>
        <ul aria-label="笔记标签">
          {note.tags.map((tag) => <li key={tag}>#{tag}</li>)}
        </ul>
        {(note.visibility !== "public" || note.status !== "published") ? (
          <p className={styles.accessState}>
            {note.visibility === "private" ? "私密笔记" : "公开笔记"} · {note.status === "draft" ? "草稿" : "已发布"}
          </p>
        ) : null}
      </div>

      <div className={styles.layout}>
        <article className={styles.article}>
          <KnowledgeMarkdown
            note={note}
            relations={markdownRelations}
            showBrokenLinkWarnings={note.showBrokenLinkWarnings}
          />
          <KnowledgeRelations
            outgoing={note.outgoing}
            backlinks={note.backlinks}
            previous={note.previous}
            next={note.next}
          />
        </article>
        <KnowledgeOutline items={analysis.outline} className={styles.outline} />
      </div>
    </main>
  );
}
