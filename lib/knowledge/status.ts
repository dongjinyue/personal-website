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

/**
 * 管理员状态读取包装器：首次读取失败时快照不存在，但来源存储会保留安全诊断。
 * 该入口也保留旧快照成功返回后的诊断，因此冷启动失败与刷新失败共用同一安全汇总。
 */
export async function readKnowledgeAdminStatus(
  readSnapshot: () => Promise<KnowledgeSnapshot>,
  readSourceError: () => KnowledgeDiagnostic | null,
): Promise<KnowledgeAdminStatus> {
  let snapshot: KnowledgeSnapshot | null = null;
  try {
    snapshot = await readSnapshot();
  } catch {
    // 原始异常可能含绝对路径、Git 输出或内容片段，只使用存储层的固定诊断。
  }

  const sourceError = readSourceError();
  if (!snapshot && !sourceError) {
    throw new Error("知识库状态暂时无法读取。");
  }

  return summarizeKnowledgeStatus(
    snapshot ?? {
      version: "",
      generatedAt: new Date().toISOString(),
      categories: [],
      notes: [],
      diagnostics: [],
    },
    sourceError,
  );
}
