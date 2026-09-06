import "server-only";

import { cache } from "react";
import type { Project } from "@/data/projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectStatuses, validProjectSlug, normalizeProjectUrl } from "@/lib/project-form";

const projectSelect = `
  id, slug, name, description, long_description, status,
  project_url, github_url, is_featured,
  project_highlights(id, content, sort_order),
  project_tags(tags(name))
`;

type ProjectClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function visibleQuery(supabase: ProjectClient) {
  return supabase.from("projects")
    .select(projectSelect, { count: "exact" }).eq("is_public", true);
}

type VisibleRow = NonNullable<Awaited<ReturnType<typeof visibleQuery>>["data"]>[number];

function safeUrl(value: string | null) {
  try { return normalizeProjectUrl(value ?? "") ?? undefined; }
  catch { return undefined; }
}

/** 保持现有页面模型，不把数据库字段命名散布到展示组件。 */
function toProject(row: VisibleRow): Project {
  const status = projectStatuses.find((value) => value === row.status);
  if (!status) throw new Error("项目进度数据无效。");
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    longDescription: row.long_description,
    status,
    isFeatured: row.is_featured,
    projectUrl: safeUrl(row.project_url),
    githubUrl: safeUrl(row.github_url),
    highlights: [...row.project_highlights]
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((item) => item.content),
    tags: row.project_tags.flatMap((item) => item.tags ? [item.tags.name] : []),
  };
}

export async function getPublicProjectsPage(rawPage?: string) {
  // 携带会话，由数据库决定游客或登录用户可以读取哪些项目。
  const supabase = await createSupabaseServerClient();
  const counted = await supabase.from("projects")
    .select("id", { count: "exact", head: true }).eq("is_public", true);
  if (counted.error || counted.count === null) throw new Error("暂时无法读取可见项目数量。");
  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / 10));
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Math.min(requested, pages);
  const from = (page - 1) * 10;
  const { data, error } = await visibleQuery(supabase)
    .order("updated_at", { ascending: false }).order("id").range(from, from + 9);
  if (error) throw new Error("暂时无法读取可见项目。");
  return { projects: data.map(toProject), total, page, pages };
}

export async function getFeaturedPublicProjects() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await visibleQuery(supabase).eq("is_featured", true)
    .order("updated_at", { ascending: false }).order("id").limit(2);
  if (error) throw new Error("暂时无法读取推荐项目。");
  return data.map(toProject);
}

/** 顶部导航只展示少量最近可见项目，避免把全部数据塞进菜单。 */
export const getNavigationPublicProjects = cache(async function getNavigationPublicProjects() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await visibleQuery(supabase)
    .order("updated_at", { ascending: false }).order("id").limit(3);
  if (error) return [];
  return data.map((row) => ({ name: row.name, slug: row.slug }));
});

export const getPublicProjectBySlug = cache(async function getPublicProjectBySlug(slug: string) {
  if (!validProjectSlug(slug)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await visibleQuery(supabase).eq("slug", slug).maybeSingle();
  if (error) throw new Error("暂时无法读取项目。");
  return data ? toProject(data) : null;
});
