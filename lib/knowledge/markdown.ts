import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  normalizeKnowledgeAssetReference,
  normalizeMarkdownKnowledgeLink,
  remarkObsidian,
} from "./obsidian-plugin";

export type MarkdownAnalysis = {
  plainText: string;
  safeText: string;
  outline: Array<{ id: string; text: string; depth: 2 | 3 }>;
  links: Array<{ target: string; label: string }>;
  assets: string[];
};

type MdastNode = {
  type: string;
  value?: string;
  url?: string;
  depth?: number;
  children?: MdastNode[];
  data?: { hProperties?: Record<string, unknown> };
};

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/** 使用与页面渲染完全相同的 remark 解析器和 Obsidian 转换插件。 */
function parseMarkdown(markdown: string): MdastNode {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkObsidian);
  return processor.runSync(processor.parse(markdown)) as MdastNode;
}

function walk(node: MdastNode, visitor: (node: MdastNode) => boolean | void): void {
  if (visitor(node) === false) return;
  for (const child of node.children ?? []) walk(child, visitor);
}

/** 从共享 Markdown AST 提取可搜索正文、目录和关系索引，不执行原始 HTML。 */
export function analyzeMarkdown(markdown: string): MarkdownAnalysis {
  const tree = parseMarkdown(markdown);
  const outline: MarkdownAnalysis["outline"] = [];
  const links: Array<{ target: string; label: string }> = [];
  const assets: string[] = [];
  const plainParts: string[] = [];

  walk(tree, (node) => {
    if (["code", "inlineCode", "html", "definition"].includes(node.type)) return false;
    // 行内 HTML 的标签和正文是兄弟节点；整段跳过，避免隐藏内容进入搜索索引。
    if (node.children?.some((child) => child.type === "html")) return false;
    if (node.type === "blockquote") {
      const title = node.data?.hProperties?.dataCalloutTitle;
      if (typeof title === "string") plainParts.push(title);
    }
    if (node.type === "heading" && node.depth && node.depth <= 3) {
      const text = toString(node as never).trim();
      const id = node.data?.hProperties?.id;
      if (text && typeof id === "string") {
        outline.push({ id, text, depth: node.depth >= 3 ? 3 : 2 });
      }
    }
    if (node.type === "link" && node.url) {
      const normalized = normalizeMarkdownKnowledgeLink(node.url);
      if (normalized) {
        links.push({ target: normalized.target, label: toString(node as never).trim() || normalized.target });
      }
    }
    if (node.type === "image" && node.url) {
      const asset = normalizeKnowledgeAssetReference(node.url);
      if (asset) assets.push(asset);
      return false;
    }
    if (node.type === "text" && typeof node.value === "string") plainParts.push(node.value);
  });

  const plainText = plainParts.join(" ").replace(/\s+/g, " ").trim();
  return {
    plainText,
    safeText: plainText,
    outline,
    links: unique(links, (link) => `${link.target}\u0000${link.label}`),
    assets: unique(assets, (asset) => asset),
  };
}
