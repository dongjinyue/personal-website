import { analyzeMarkdown } from "./markdown";
import { canReadKnowledgeNote, type KnowledgeViewer } from "./access";
import { KnowledgeGitError } from "./git-source";
import type { KnowledgeSnapshot, KnowledgeSource } from "./snapshot";

export type KnowledgeAsset = { body: Buffer; contentType: string };

const CONTENT_TYPES: Readonly<Record<string, string>> = { avif: "image/avif", gif: "image/gif", jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

function unsafePath(): Error { return new Error("附件路径不安全"); }

/** RouteContext 已解码；拒绝所有残余转义和会改变路径解释的字符。 */
export async function normalizeAttachmentPath(path: string | readonly string[]): Promise<string> {
  const segments = typeof path === "string" ? path.split("/") : [...path];
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("%") || /[\u0000-\u001f\u007f-\u009f]/.test(segment) || /^[a-z][a-z\d+.-]*:/i.test(segment))) throw unsafePath();
  const normalized = segments.join("/");
  const extension = normalized.split(".").pop()?.toLowerCase() ?? "";
  if (!CONTENT_TYPES[extension]) throw new Error("附件类型不支持");
  return normalized;
}

function isMissingGitBlob(error: unknown): boolean {
  return error instanceof KnowledgeGitError && error.code === "missing-object";
}

/** 先授权笔记、再确认它实际引用此附件，最后读取固定提交的二进制对象。 */
export async function getAssetForViewer(slug: string, path: readonly string[], viewer: KnowledgeViewer, snapshot: KnowledgeSnapshot, source: KnowledgeSource): Promise<KnowledgeAsset | null> {
  const note = snapshot.notes.find((candidate) => candidate.slug === slug);
  if (!note || !canReadKnowledgeNote(note, viewer)) return null;
  let relativePath: string;
  try { relativePath = await normalizeAttachmentPath(path); } catch { return null; }
  if (!analyzeMarkdown(note.markdown).assets.includes(relativePath)) return null;
  try {
    return { body: await source.readBinary(snapshot.version, `attachments/${relativePath}`), contentType: CONTENT_TYPES[relativePath.split(".").pop()?.toLowerCase() ?? ""]! };
  } catch (error) {
    if (isMissingGitBlob(error)) return null;
    throw error;
  }
}
