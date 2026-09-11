import GithubSlugger, { slug as githubSlug } from "github-slugger";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const BLOCK_ID = /^[a-zA-Z0-9-]+$/;

type MdastNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  identifier?: string;
  children?: MdastNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};
type MdastParent = MdastNode & { children: MdastNode[] };

export type ObsidianLink = {
  target: string | null;
  label: string;
  anchor: string | null;
  href: string;
};

/** 与 rehype-slug 使用同一个 GitHub slugger 算法生成标题片段。 */
export function slugifyKnowledgeHeading(value: string): string {
  return githubSlug(value);
}

function normalizeAnchor(anchor: string): string | null {
  if (!anchor) return null;
  if (anchor.startsWith("^")) return BLOCK_ID.test(anchor.slice(1)) ? anchor : null;
  return slugifyKnowledgeHeading(anchor);
}

/** 解析 Obsidian 双链，同时保留标题锚点和块锚点。 */
export function parseObsidianLink(value: string): ObsidianLink | null {
  const [destinationPart, aliasPart] = value.split(/\|(.*)/s, 2);
  const destination = destinationPart.trim();
  if (!destination) return null;
  const hashIndex = destination.indexOf("#");
  const rawTarget = hashIndex >= 0 ? destination.slice(0, hashIndex).trim() : destination;
  const rawAnchor = hashIndex >= 0 ? destination.slice(hashIndex + 1).trim() : "";
  const target = rawTarget || null;
  const anchor = rawAnchor ? normalizeAnchor(rawAnchor) : null;
  if (rawAnchor && !anchor) return null;
  const label = aliasPart?.trim() || target || rawAnchor || destination;
  const base = target ? `/knowledge/${encodeURIComponent(target)}` : "";
  const fragment = anchor ? `#${anchor}` : "";
  return { target, label, anchor, href: `${base}${fragment}` || "#" };
}

function decodeAssetSegment(segment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  // 残余转义可能被下游再次解释；解码出的分隔符会改变已经验证的路径层级。
  if (/%[0-9a-f]{2}/i.test(decoded) || /[\u0000-\u001f\u007f/\\]/.test(decoded)) return null;
  return decoded;
}

/** 将 Obsidian/Markdown 图片引用统一为 attachments 下的安全相对路径。 */
export function normalizeKnowledgeAssetReference(value: string): string | null {
  const trimmed = value.trim().replace(/^<|>$/g, "");
  if (!trimmed || trimmed.startsWith("//") || trimmed.includes("\\")) return null;
  const decodedSegments = trimmed.split("/").map(decodeAssetSegment);
  if (decodedSegments.some((segment) => segment === null)) return null;
  let segments = decodedSegments as string[];
  const parentCount = segments.findIndex((segment) => segment !== "..");
  if (parentCount > 0) {
    // 只接受 Obsidian 常见的 ../attachments/...，不能把任意 ../ 当作可清理前缀。
    if (segments[parentCount]?.toLowerCase() !== "attachments") return null;
    segments = segments.slice(parentCount + 1);
  } else if (segments[0]?.toLowerCase() === "attachments") {
    segments = segments.slice(1);
  }
  if (segments[0] === ".") segments = segments.slice(1);
  const normalized = segments.join("/");
  if (
    !normalized ||
    /^[a-z][a-z\d+.-]*:/i.test(normalized) ||
    !IMAGE_EXTENSION.test(normalized) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) return null;
  return normalized;
}

/** 将网站知识库链接和相对 Markdown 链接统一为 slug 路由。 */
export function normalizeMarkdownKnowledgeLink(value: string): { target: string; href: string } | null {
  const [pathPart, rawFragment] = value.split(/#(.*)/s, 2);
  const knowledgeMatch = pathPart.match(/^\/knowledge\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  const relativeMatch = pathPart.match(/(?:^|\/)([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/i);
  const target = knowledgeMatch?.[1] ?? relativeMatch?.[1].toLowerCase();
  if (!target) return null;
  let decodedFragment = rawFragment ?? "";
  try {
    decodedFragment = decodeURIComponent(decodedFragment);
  } catch {
    return null;
  }
  const anchor = decodedFragment ? normalizeAnchor(decodedFragment) : null;
  if (decodedFragment && !anchor) return null;
  return { target, href: `/knowledge/${target}${anchor ? `#${anchor}` : ""}` };
}

function text(value: string): MdastNode {
  return { type: "text", value };
}

function transformWikiText(value: string): MdastNode[] {
  const nodes: MdastNode[] = [];
  const pattern = /(!?)\[\[([^\]\n]+)\]\]/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text(value.slice(cursor, index)));
    if (match[1] === "!") {
      const [assetPart, sizeOrAlias] = match[2].split(/\|(.*)/s, 2);
      const asset = normalizeKnowledgeAssetReference(assetPart);
      if (asset) {
        nodes.push({
          type: "image",
          url: asset,
          alt: sizeOrAlias && !/^\d+(?:x\d+)?$/i.test(sizeOrAlias.trim())
            ? sizeOrAlias.trim()
            : asset.split("/").at(-1) ?? "知识库图片",
          data: { hProperties: { dataKnowledgeAsset: "true" } },
        });
      }
    } else {
      const link = parseObsidianLink(match[2]);
      if (link) {
        nodes.push({
          type: "link",
          url: link.href,
          children: [text(link.label)],
          data: { hProperties: { dataKnowledgeLink: link.target ?? "self" } },
        });
      }
    }
    cursor = index + match[0].length;
  }
  if (cursor < value.length) nodes.push(text(value.slice(cursor)));
  return nodes.length ? nodes : [text(value)];
}

function decorateCallouts(tree: MdastNode): void {
  visit(tree, "blockquote", (node: MdastNode) => {
    const firstParagraph = node.children?.[0];
    const firstText = firstParagraph?.children?.[0];
    if (firstText?.type !== "text" || typeof firstText.value !== "string") return;
    const match = firstText.value.match(/^\[!(NOTE|TIP|WARNING|ERROR)\](?:[+-])?(?:\s+([^\n]+))?/i);
    if (!match) return;
    const title = match[2]?.trim() || null;
    firstText.value = firstText.value.slice(match[0].length).trimStart();
    if (!firstText.value) firstParagraph?.children?.shift();
    node.data = {
      ...node.data,
      hProperties: {
        ...node.data?.hProperties,
        dataCallout: match[1].toLowerCase(),
        ...(title ? { dataCalloutTitle: title } : {}),
      },
    };
  });
}

function setNodeId(node: MdastNode, id: string): void {
  node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
}

function decorateBlockAnchors(node: MdastNode, ancestors: MdastNode[] = []): void {
  if (node.type === "paragraph") {
    const last = node.children?.at(-1);
    if (last?.type === "text" && typeof last.value === "string") {
      const match = last.value.match(/(?:^|\s)\^([a-zA-Z0-9-]+)\s*$/);
      if (match) {
        last.value = last.value.slice(0, match.index).trimEnd();
        if (!last.value) node.children?.pop();
        const target = [...ancestors].reverse().find((item) => item.type === "listItem" || item.type === "blockquote") ?? node;
        setNodeId(target, `^${match[1]}`);
      }
    }
  }
  for (const child of node.children ?? []) decorateBlockAnchors(child, [...ancestors, node]);
}

function resolveReferences(tree: MdastNode): void {
  const definitions = new Map<string, string>();
  visit(tree, "definition", (node: MdastNode) => {
    if (node.identifier && node.url) definitions.set(node.identifier.toLowerCase(), node.url);
  });
  visit(tree, (node: MdastNode) => node.type === "linkReference" || node.type === "imageReference", (node: MdastNode) => {
    const url = node.identifier ? definitions.get(node.identifier.toLowerCase()) : undefined;
    if (!url) return;
    node.type = node.type === "linkReference" ? "link" : "image";
    node.url = url;
  });
}

function decorateHeadings(tree: MdastNode): void {
  const slugger = new GithubSlugger();
  visit(tree, "heading", (node: MdastNode) => setNodeId(node, slugger.slug(toString(node as never))));
}

/** react-markdown 与分析器共享的 Obsidian 语法扩展。 */
export function remarkObsidian() {
  return (tree: MdastNode) => {
    visit(tree, "text", (node: MdastNode, index, parent: MdastParent | undefined) => {
      if (typeof node.value !== "string" || index === undefined || !parent) return;
      if (["link", "image", "linkReference", "imageReference"].includes(parent.type)) return;
      // remark 将行内 HTML 标签和其中的文字拆成兄弟节点；整段含 HTML 时保守跳过双链转换。
      if (parent.children.some((child) => child.type === "html")) return;
      const replacement = transformWikiText(node.value);
      if (replacement.length === 1 && replacement[0].type === "text") return;
      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });
    resolveReferences(tree);
    visit(tree, "link", (node: MdastNode) => {
      if (!node.url) return;
      const link = normalizeMarkdownKnowledgeLink(node.url);
      if (!link) return;
      node.url = link.href;
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataKnowledgeLink: link.target } };
    });
    visit(tree, "image", (node: MdastNode) => {
      if (!node.url) return;
      const asset = normalizeKnowledgeAssetReference(node.url);
      if (!asset) {
        node.type = "text";
        node.value = "";
        delete node.url;
        return;
      }
      node.url = asset;
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataKnowledgeAsset: "true" } };
    });
    decorateCallouts(tree);
    decorateBlockAnchors(tree);
    decorateHeadings(tree);
  };
}
