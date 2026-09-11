import {
  normalizeKnowledgeAssetReference,
  normalizeMarkdownKnowledgeLink,
  parseObsidianLink,
  slugifyKnowledgeHeading,
} from "./obsidian-plugin";

export type MarkdownAnalysis = {
  plainText: string;
  safeText: string;
  outline: Array<{ id: string; text: string; depth: 2 | 3 }>;
  links: Array<{ target: string; label: string }>;
  assets: string[];
};

function withoutCode(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let fence: { marker: "`" | "~"; length: number } | null = null;
  return lines
    .map((line) => {
      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0] as "`" | "~";
        if (!fence) fence = { marker, length: fenceMatch[1].length };
        else if (marker === fence.marker && fenceMatch[1].length >= fence.length) fence = null;
        return "";
      }
      if (fence) return "";
      return line.replace(/(`+)(.*?)\1/g, "");
    })
    .join("\n");
}

function withoutRawHtml(value: string): string {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "");
}

function markdownLinks(value: string): Array<{ image: boolean; label: string; destination: string }> {
  const results: Array<{ image: boolean; label: string; destination: string }> = [];
  const pattern = /(!?)\[([^\]\n]*)\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g;
  for (const match of value.matchAll(pattern)) {
    results.push({ image: match[1] === "!", label: match[2], destination: match[3] ?? match[4] });
  }
  return results;
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/** 从 Markdown 提取可搜索正文、目录和关系索引，不执行任何原始 HTML。 */
export function analyzeMarkdown(markdown: string): MarkdownAnalysis {
  const analyzable = withoutRawHtml(withoutCode(markdown));
  const links: Array<{ target: string; label: string }> = [];
  const assets: string[] = [];

  for (const match of analyzable.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) {
    if (match[1] === "!") {
      const asset = normalizeKnowledgeAssetReference(match[2].split("|", 1)[0]);
      if (asset) assets.push(asset);
      continue;
    }
    const parsed = parseObsidianLink(match[2]);
    if (parsed?.target) links.push({ target: parsed.target, label: parsed.label });
  }

  for (const item of markdownLinks(analyzable)) {
    if (item.image) {
      const asset = normalizeKnowledgeAssetReference(item.destination);
      if (asset) assets.push(asset);
    } else {
      const target = normalizeMarkdownKnowledgeLink(item.destination)?.target ?? null;
      if (target) links.push({ target, label: item.label || target });
    }
  }

  const headingCounts = new Map<string, number>();
  const outline: MarkdownAnalysis["outline"] = [];
  for (const line of analyzable.split("\n")) {
    const match = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const headingText = match[2]
      .replace(/!?(?:\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\])/g, "$2$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_~]/g, "")
      .trim();
    const baseId = slugifyKnowledgeHeading(headingText);
    const count = headingCounts.get(baseId) ?? 0;
    headingCounts.set(baseId, count + 1);
    outline.push({
      id: count ? `${baseId}-${count}` : baseId,
      text: headingText,
      // 页面标题由详情页单独渲染，正文 H1 在目录中与 H2 同属顶层。
      depth: match[1].length >= 3 ? 3 : 2,
    });
  }

  const plainText = analyzable
    .replace(/!\[\[[^\]\n]+\]\]/g, " ")
    .replace(/\[\[([^\]|#]+)?(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$2$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1")
    .replace(/^\s*>\s*\[![^\]]+\][^\n]*/gim, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[*_~>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    plainText,
    safeText: plainText,
    outline,
    links: unique(links, (link) => `${link.target}\u0000${link.label}`),
    assets: unique(assets, (asset) => asset),
  };
}
