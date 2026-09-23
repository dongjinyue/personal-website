import Link from "next/link";
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  normalizeKnowledgeAssetReference,
  remarkObsidian,
} from "@/lib/knowledge/obsidian-plugin";
import type { KnowledgeRelations } from "@/lib/knowledge/relations";
import type { KnowledgeNoteSource } from "@/lib/knowledge/types";
import CodeBlock from "./CodeBlock";
import KnowledgeImage from "./KnowledgeImage";

type Props = {
  note: KnowledgeNoteSource;
  relations: KnowledgeRelations;
  /** 只有服务端确认管理员身份后才能打开失效链接提示。 */
  showBrokenLinkWarnings?: boolean;
};

const sanitizeSchema = {
  ...defaultSchema,
  // 标题和块 ID 均由受控 remark 插件生成，避免 sanitize 改写为 user-content-*。
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    blockquote: [
      ...(defaultSchema.attributes?.blockquote ?? []),
      "dataCallout",
      "dataCalloutTitle",
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-[\w-]+$/, /^hljs(?:-[\w-]+)?$/],
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", /^hljs(?:-[\w-]+)?$/],
    ],
    img: [...(defaultSchema.attributes?.img ?? []), "dataKnowledgeAsset"],
    a: [...(defaultSchema.attributes?.a ?? []), "dataKnowledgeLink"],
  },
};

/** 将路径逐段编码，附件永远通过带所属笔记 slug 的权限接口读取。 */
export function createKnowledgeAssetUrl(noteSlug: string, source: string): string | null {
  let decodedSource: string;
  try {
    decodedSource = source
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
  const asset = normalizeKnowledgeAssetReference(decodedSource);
  if (!asset) return null;
  const encodedSegments = asset.split("/").map(encodeURIComponent).join("/");
  return `/knowledge-assets/${encodeURIComponent(noteSlug)}/${encodedSegments}`;
}

function getKnowledgeLinkTarget(href: string | undefined): string | null {
  if (!href) return null;
  const match = href.match(/^\/knowledge\/([^/#?]+)(?:[?#]|$)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function nodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(value)) return nodeText(value.props.children);
  return "";
}

/** 检查完整 HTML 树，图片可能嵌在链接、强调或删除线内。 */
function containsImage(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const element = node as { type?: unknown; tagName?: unknown; children?: unknown };
  if (element.type === "element" && element.tagName === "img") return true;
  return Array.isArray(element.children) && element.children.some(containsImage);
}

export function KnowledgeMarkdown({
  note,
  relations,
  showBrokenLinkWarnings = false,
}: Props) {
  const brokenTargets = new Set(relations.brokenBySlug.get(note.slug) ?? []);
  const visibleTargets = new Set([note.slug, ...(relations.outgoingBySlug.get(note.slug) ?? [])]);

  const components: Components = {
    p({ children, node, ...props }) {
      // 图片查看器包含原生 dialog，图片段落改用 flow 容器避免生成无效的 p > figure 结构。
      return containsImage(node)
        ? <div className="knowledge-image-row" {...props}>{children}</div>
        : <p {...props}>{children}</p>;
    },
    pre({ children }) {
      const codeElement = isValidElement<{ className?: string; children?: ReactNode }>(children)
        ? children
        : null;
      const className = codeElement?.props.className ?? "";
      const language = className.match(/(?:^|\s)language-([\w-]+)/)?.[1] ?? "text";
      const highlighted = codeElement?.props.children ?? children;
      // 复制使用同一节点的纯文本，显示保留 rehype-highlight 清洗后的 token 标记。
      const code = nodeText(highlighted);
      return <CodeBlock code={code} language={language}>{highlighted}</CodeBlock>;
    },
    a({ href, children, node, ...props }) {
      // react-markdown 的 AST 节点不能透传为 DOM 属性。
      const target = getKnowledgeLinkTarget(href);
      // 游客只根据可见出链生成可点击链接；不可见和不存在目标形态完全相同。
      if (target && !visibleTargets.has(target)) {
        const trulyBroken = brokenTargets.has(target);
        if (containsImage(node)) {
          return (
            <div className="knowledge-image-row knowledge-broken-link">
              {children}
              {showBrokenLinkWarnings && trulyBroken ? <small>（链接不存在）</small> : null}
            </div>
          );
        }
        return showBrokenLinkWarnings && trulyBroken ? (
          <span className="knowledge-broken-link" title="链接不存在">
            {children} <small>（链接不存在）</small>
          </span>
        ) : (
          <span>{children}</span>
        );
      }
      if (containsImage(node)) {
        // 图片查看按钮不能嵌套在链接内；保留一个紧邻图片的独立原链接。
        return (
          <div className="knowledge-image-row">
            {children}
            {href?.startsWith("/knowledge/") || href?.startsWith("#")
              ? <Link href={href}>打开原链接</Link>
              : href ? <a href={href}>打开原链接</a> : null}
          </div>
        );
      }
      if (href?.startsWith("/knowledge/") || href?.startsWith("#")) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
      return href ? (
        <a href={href} {...props}>
          {children}
        </a>
      ) : (
        <span>{children}</span>
      );
    },
    em({ children, node, ...props }) {
      return containsImage(node)
        ? <div className="knowledge-image-row">{children}</div>
        : <em {...props}>{children}</em>;
    },
    strong({ children, node, ...props }) {
      return containsImage(node)
        ? <div className="knowledge-image-row">{children}</div>
        : <strong {...props}>{children}</strong>;
    },
    del({ children, node, ...props }) {
      return containsImage(node)
        ? <div className="knowledge-image-row">{children}</div>
        : <del {...props}>{children}</del>;
    },
    img({ src, alt, node }) {
      const isKnowledgeAsset = node?.properties?.dataKnowledgeAsset === "true";
      const source = typeof src === "string" ? src : "";
      const assetUrl = createKnowledgeAssetUrl(note.slug, source);
      if (!assetUrl || (!isKnowledgeAsset && !source.includes("attachments/"))) {
        return <span role="img">图片不可用：{alt || "未命名图片"}</span>;
      }
      return <KnowledgeImage src={assetUrl} alt={alt ?? ""} />;
    },
    blockquote({ children, node, ...props }) {
      const callout = node?.properties?.dataCallout;
      const title = node?.properties?.dataCalloutTitle;
      if (typeof callout === "string") {
        return (
          <aside data-callout={callout} {...props}>
            {typeof title === "string" ? <strong>{title}</strong> : null}
            {children}
          </aside>
        );
      }
      return <blockquote {...props}>{children}</blockquote>;
    },
  };

  return (
    <div className="knowledge-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkObsidian]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        components={components}
        skipHtml
        urlTransform={defaultUrlTransform}
      >
        {note.markdown}
      </ReactMarkdown>
    </div>
  );
}
