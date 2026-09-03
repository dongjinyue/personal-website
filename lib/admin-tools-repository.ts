import "server-only";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validToolId } from "@/lib/tool-form";

export const TOOL_PAGE_SIZE = 10;

export async function getAdminToolsPage(rawPage?: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const counted = await supabase.from("tools").select("id", { count: "exact", head: true });
  if (counted.error || counted.count === null) {
    throw new Error("暂时无法读取工具数量。");
  }

  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / TOOL_PAGE_SIZE));
  const page = Math.min(requested, pages);
  const from = (page - 1) * TOOL_PAGE_SIZE;
  const { data, error } = await supabase
    .from("tools")
    .select("id, name, description, url, category, is_favorite, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + TOOL_PAGE_SIZE - 1);

  if (error) throw new Error("暂时无法读取工具列表。");
  return { rows: data, total, pages, page };
}

export async function getAdminTool(id: string) {
  await requireAdmin();
  if (!validToolId(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tools")
    .select("id, name, description, url, category, is_favorite, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("暂时无法读取该工具。");
  if (!data) notFound();
  return data;
}
