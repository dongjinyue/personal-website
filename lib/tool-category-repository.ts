import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ToolCategoryRecord = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

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
