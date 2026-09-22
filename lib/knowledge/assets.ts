import "server-only";

import { canReadKnowledgeNote, type KnowledgeViewer } from "./access";
import { GitKnowledgeSource } from "./git-source";
import { getKnowledgeViewerForCurrentUser } from "./repository";
import { getKnowledgeSnapshot, type KnowledgeSnapshot, type KnowledgeSource } from "./snapshot";

export type KnowledgeAsset = {
  body: Buffer;
  contentType: string;
};

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function unsafePath(): Error {
  return new Error("附件路径不安全");
}

/**
 * 将 Route Handler 的 catch-all 段逐个校验后再拼接。
 * 只接受图片扩展名，避免借由附件接口读取 Markdown、配置或 SVG。
 */
export async function normalizeAttachmentPath(path: string | readonly string[]): Promise<string> {
  const segments = typeof path === "string" ? path.split("/") : [...path];
  if (!segments.length) throw unsafePath();
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\\") ||
        segment.includes("/") ||
        segment.includes("\0"),
    )
  ) {
    throw unsafePath();
  }

  const normalized = segments.join("/");
  const extension = normalized.split(".").pop()?.toLowerCase() ?? "";
  if (!CONTENT_TYPES[extension]) throw new Error("附件类型不支持");
  return normalized;
}

function getContentType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  // 此函数只接收 normalizeAttachmentPath 已通过白名单校验的路径。
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/**
 * 附件读取的测试与生产共享同一顺序：先找到笔记并授权，
 * 再验证相对路径，最后从该快照固定提交读取二进制内容。
 */
export async function getAssetForViewer(
  slug: string,
  path: readonly string[],
  viewer: KnowledgeViewer,
  snapshot: KnowledgeSnapshot,
  source: KnowledgeSource,
): Promise<KnowledgeAsset | null> {
  const note = snapshot.notes.find((candidate) => candidate.slug === slug);
  if (!note || !canReadKnowledgeNote(note, viewer)) return null;

  let relativePath: string;
  try {
    relativePath = await normalizeAttachmentPath(path);
  } catch {
    return null;
  }

  const body = await source.readBinary(snapshot.version, `attachments/${relativePath}`);
  return { body, contentType: getContentType(relativePath) };
}

/** 服务端公开入口：真实鉴权后才取得快照和二进制附件。 */
export async function getKnowledgeAssetForCurrentUser(
  slug: string,
  path: readonly string[],
): Promise<KnowledgeAsset | null> {
  const viewer = await getKnowledgeViewerForCurrentUser();
  const snapshot = await getKnowledgeSnapshot();
  return getAssetForViewer(slug, path, viewer, snapshot, new GitKnowledgeSource());
}
