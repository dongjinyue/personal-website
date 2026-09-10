export type KnowledgeVisibility = "public" | "private";

export type KnowledgeStatus = "published" | "draft";

/** 知识库中单篇 Markdown 笔记经校验后的稳定数据结构。 */
export type KnowledgeNoteSource = {
  path: string;
  title: string;
  slug: string;
  visibility: KnowledgeVisibility;
  status: KnowledgeStatus;
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  markdown: string;
};

/** 供索引、链接校验和读取流程统一使用的可读错误信息。 */
export type KnowledgeDiagnostic = {
  path: string;
  code:
    | "invalid-frontmatter"
    | "duplicate-slug"
    | "broken-link"
    | "missing-asset"
    | "source-error";
  message: string;
};
