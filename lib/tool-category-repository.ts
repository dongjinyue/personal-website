import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ToolCategoryRecord = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_PAGE_SIZE = 10;

/** 管理端读取全部分类，工具表单和分类管理页共用这一数据源。 */
export async function getToolCategories(): Promise<ToolCategoryRecord[]> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tool_categories")
    .select("id, name, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw new Error("暂时无法读取工具分类。");
  return data;
}

/** 分类管理页使用独立的服务端分页，不影响工具表单读取全部分类。 */
export async function getAdminToolCategoriesPage(rawPage?: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const counted = await supabase.from("tool_categories").select("id", { count: "exact", head: true });

  if (counted.error || counted.count === null) throw new Error("暂时无法读取分类数量。");

  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE));
  const page = Math.min(requested, pages);
  const from = (page - 1) * CATEGORY_PAGE_SIZE;
  const { data, error } = await supabase
    .from("tool_categories")
    .select("id, name, created_at, updated_at")
    .order("name", { ascending: true })
    .range(from, from + CATEGORY_PAGE_SIZE - 1);

  if (error) throw new Error("暂时无法读取工具分类。");
  return { rows: data, total, pages, page };
}
