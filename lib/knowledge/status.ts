import type { KnowledgeSnapshot } from "./snapshot";
import type { KnowledgeDiagnostic } from "./types";

export type KnowledgeAdminStatus = {
  version: string;
  generatedAt: string;
  total: number;
  publicPublished: number;
  privateCount: number;
  draftCount: number;
  diagnostics: readonly KnowledgeDiagnostic[];
};

const DIAGNOSTIC_MESSAGES: Record<KnowledgeDiagnostic["code"], string> = {
  "invalid-frontmatter": "笔记属性无效，请检查 YAML 头部。",
  "duplicate-slug": "笔记地址重复，请检查 slug。",
  "broken-link": "笔记链接目标不存在。",
  "missing-asset": "附件不存在。",
  "source-error": "知识库读取失败，请检查同步状态。",
};

/** 只允许展示知识库内的规范相对路径，避免把服务器路径带入后台页面。 */
function safeDiagnosticPath(path: string): string {
  if (path === "knowledge-source") return path;
  if (
    !path.startsWith("notes/") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f:]/.test(path) ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) return "knowledge-source";
  return path;
}

/** 汇总管理员可读元数据；原始解析错误可能包含笔记内容，不能直接渲染。 */
export function summarizeKnowledgeStatus(
  snapshot: KnowledgeSnapshot,
  sourceError: KnowledgeDiagnostic | null = null,
): KnowledgeAdminStatus {
  const diagnostics = sourceError
    ? [...snapshot.diagnostics, sourceError]
    : [...snapshot.diagnostics];

  return {
    version: /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(snapshot.version)
      ? snapshot.version.slice(0, 7)
      : "未知",
    generatedAt: snapshot.generatedAt,
    total: snapshot.notes.length,
    publicPublished: snapshot.notes.filter(
      (note) => note.visibility === "public" && note.status === "published",
    ).length,
    privateCount: snapshot.notes.filter((note) => note.visibility === "private").length,
    draftCount: snapshot.notes.filter((note) => note.status === "draft").length,
    diagnostics: diagnostics.map((diagnostic) => ({
      path: safeDiagnosticPath(diagnostic.path),
      code: diagnostic.code,
      message: DIAGNOSTIC_MESSAGES[diagnostic.code],
    })),
  };
}
