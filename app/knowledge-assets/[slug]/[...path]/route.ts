import { getKnowledgeAssetForCurrentUser } from "@/lib/knowledge/assets";

export const dynamic = "force-dynamic";

/** 私密附件每次请求均重新经过服务端身份与笔记权限校验。 */
export async function GET(
  _request: Request,
  context: RouteContext<"/knowledge-assets/[slug]/[...path]">,
) {
  const { slug, path } = await context.params;
  const asset = await getKnowledgeAssetForCurrentUser(slug, path);
  if (!asset) return new Response("未找到图片。", { status: 404 });

  return new Response(asset.body, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
