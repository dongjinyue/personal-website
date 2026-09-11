import { visit } from "unist-util-visit";

const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i;

type MdastNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

type MdastParent = MdastNode & { children: MdastNode[] };

export type ObsidianLink = {
  target: string | null;
  label: string;
  anchor: string | null;
  href: string;
};

/** 生成与 rehype-slug 常见标题规则一致的安全片段。 */
export function slugifyKnowledgeHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f<>"'`]/g, "")
    .replace(/\s+/g, "-");
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
  const anchor = rawAnchor || null;
  const label = aliasPart?.trim() || target || anchor || destination;
  const base = target ? `/knowledge/${encodeURIComponent(target)}` : "";
  const fragment = anchor
    ? `#${anchor.startsWith("^") ? anchor : slugifyKnowledgeHeading(anchor)}`
    : "";

  return { target, label, anchor, href: `${base}${fragment}` || "#" };
}

/** 将 Obsidian/Markdown 图片引用统一为 attachments 下的相对路径。 */
export function normalizeKnowledgeAssetReference(value: string): string | null {
  let normalized = value.trim().replace(/^<|>$/g, "");
  if (!normalized || /^[a-z][a-z\d+.-]*:/i.test(normalized) || normalized.startsWith("//")) {
    return null;
  }
  normalized = normalized.replace(/^\/?(?:\.\.\/)*attachments\//i, "");
  normalized = normalized.replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (
    !IMAGE_EXTENSION.test(normalized) ||
    segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))
  ) {
    return null;
  }
  return segments.join("/");
}

/** 将网站知识库链接和相对 Markdown 链接统一为 slug 路由。 */
export function normalizeMarkdownKnowledgeLink(value: string): {
  target: string;
  href: string;
} | null {
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
  const fragment = decodedFragment
    ? `#${decodedFragment.startsWith("^") ? decodedFragment : slugifyKnowledgeHeading(decodedFragment)}`
    : "";
  return { target, href: `/knowledge/${target}${fragment}` };
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
      } else {
        nodes.push(text(match[0]));
      }
    } else {
      const link = parseObsidianLink(match[2]);
      nodes.push(
        link
          ? {
              type: "link",
              url: link.href,
              children: [text(link.label)],
              data: {
                hProperties: {
                  dataKnowledgeLink: link.target ?? "self",
                },
              },
            }
          : text(match[0]),
      );
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
    const type = match[1].toLowerCase();
    const title = match[2]?.trim() || null;
    firstText.value = firstText.value.slice(match[0].length).trimStart();
    if (!firstText.value) firstParagraph?.children?.shift();
    node.data = {
      ...node.data,
      hProperties: {
        ...node.data?.hProperties,
        dataCallout: type,
        ...(title ? { dataCalloutTitle: title } : {}),
      },
    };
  });
}

/** react-markdown 使用的 Obsidian 语法扩展；代码节点没有 text 子节点，因此不会被误改。 */
export function remarkObsidian() {
  return (tree: MdastNode) => {
    visit(tree, "text", (node: MdastNode, index, parent: MdastParent | undefined) => {
      if (typeof node.value !== "string" || index === undefined || !parent) return;
      if (parent.type === "link" || parent.type === "image") return;
      const replacement = transformWikiText(node.value);
      if (replacement.length === 1 && replacement[0].type === "text") return;
      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });
    visit(tree, "link", (node: MdastNode) => {
      if (!node.url) return;
      const link = normalizeMarkdownKnowledgeLink(node.url);
      if (!link) return;
      node.url = link.href;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, dataKnowledgeLink: link.target },
      };
    });
    visit(tree, "image", (node: MdastNode) => {
      if (!node.url) return;
      const asset = normalizeKnowledgeAssetReference(node.url);
      if (!asset) return;
      node.url = asset;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, dataKnowledgeAsset: "true" },
      };
    });
    decorateCallouts(tree);
  };
}
