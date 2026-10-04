import type { Metadata } from "next";

export const siteUrl = "https://dongjinyue.cn";
export const siteDescription = "记录 AI 新变化，整理学习笔记，分享 AI 应用与全栈项目的个人数字空间。";

/** 每个公开页面使用自己的规范网址和分享文案，避免继承首页地址。 */
export function createPageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: "MY SPACE",
      title: `${title} | MY SPACE`,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | MY SPACE`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

/** 分页有独立规范网址；非法页码与列表的第一页回退规则保持一致。 */
export function getPaginatedPath(path: string, page: string | string[] | undefined): string {
  const value = typeof page === "string" && /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1;
  return Number.isSafeInteger(value) && value > 1 ? `${path}?page=${value}` : path;
}
