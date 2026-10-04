import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-metadata";

/** 只列出公开栏目入口，不读取管理员会话或收录私密内容。 */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/news", "/projects", "/tools", "/knowledge"].map((path) => ({
    url: new URL(path, siteUrl).href,
  }));
}
