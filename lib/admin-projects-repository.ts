import "server-only";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validProjectId } from "@/lib/project-form";

export const PROJECT_PAGE_SIZE = 10;

export async function getAdminProjectsPage(rawPage?: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const counted = await supabase.from("projects").select("id", { count: "exact", head: true });
  if (counted.error || counted.count === null) throw new Error("暂时无法读取项目数量。");
  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / PROJECT_PAGE_SIZE));
  const page = Math.min(requested, pages);
  const from = (page - 1) * PROJECT_PAGE_SIZE;
  const { data, error } = await supabase.from("projects")
    .select("id, slug, name, status, is_public, is_featured, updated_at")
    .order("updated_at", { ascending: false }).order("id", { ascending: true })
    .range(from, from + PROJECT_PAGE_SIZE - 1);
  if (error) throw new Error("暂时无法读取项目列表。");
  return { rows: data, total, pages, page };
}

export async function getAdminProject(id: string) {
  await requireAdmin();
  if (!validProjectId(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects")
    .select("id, slug, name, description, long_description, status, project_url, github_url, is_featured, is_public, created_at, updated_at")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("暂时无法读取该项目。");
  if (!data) notFound();
  return data;
}
