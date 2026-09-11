import Link from "next/link";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import {
  normalizeKnowledgeAssetReference,
  remarkObsidian,
} from "@/lib/knowledge/obsidian-plugin";
import type { KnowledgeRelations } from "@/lib/knowledge/relations";
import type { KnowledgeNoteSource } from "@/lib/knowledge/types";

type Props = {
  note: KnowledgeNoteSource;
  relations: KnowledgeRelations;
  /** 只有服务端确认管理员身份后才能打开失效链接提示。 */
  showBrokenLinkWarnings?: boolean;
};

const sanitizeSchema = {
  ...defaultSchema,
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

export function KnowledgeMarkdown({
  note,
  relations,
  showBrokenLinkWarnings = false,
}: Props) {
  const brokenTargets = new Set(relations.brokenBySlug.get(note.slug) ?? []);

  const components: Components = {
    a({ href, children, node, ...props }) {
      // react-markdown 的 AST 节点不能透传为 DOM 属性。
      void node;
      const target = getKnowledgeLinkTarget(href);
      if (target && brokenTargets.has(target)) {
        return showBrokenLinkWarnings ? (
          <span className="knowledge-broken-link" title="链接不存在">
            {children} <small>（链接不存在）</small>
          </span>
        ) : (
          <span>{children}</span>
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
    img({ src, alt, node }) {
      const isKnowledgeAsset = node?.properties?.dataKnowledgeAsset === "true";
      const source = typeof src === "string" ? src : "";
      const assetUrl = createKnowledgeAssetUrl(note.slug, source);
      if (!assetUrl || (!isKnowledgeAsset && !source.includes("attachments/"))) {
        return <span role="img">图片不可用：{alt || "未命名图片"}</span>;
      }
      // Task 3 仅输出安全、语义化图片；Task 6 再增加查看大图交互。
      // 动态 Git 附件没有构建时尺寸，Task 6 会用稳定容器补齐布局与大图交互。
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={assetUrl} alt={alt ?? ""} loading="lazy" />;
    },
    blockquote({ children, node }) {
      const callout = node?.properties?.dataCallout;
      const title = node?.properties?.dataCalloutTitle;
      if (typeof callout === "string") {
        return (
          <aside data-callout={callout}>
            {typeof title === "string" ? <strong>{title}</strong> : null}
            {children}
          </aside>
        );
      }
      return <blockquote>{children}</blockquote>;
    },
  };

  return (
    <div className="knowledge-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkObsidian]}
        rehypePlugins={[rehypeSlug, rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        components={components}
        skipHtml
        urlTransform={defaultUrlTransform}
      >
        {note.markdown}
      </ReactMarkdown>
    </div>
  );
}
