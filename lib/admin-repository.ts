import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminMetric = {
  id: string;
  label: string;
  value: number | null;
};

export type AdminPreviewRow = {
  id: string;
  name: string;
  description: string;
  updated_at: string;
};

export type AdminPreviewResult = {
  rows: AdminPreviewRow[];
  total: number | null;
  error: string | null;
};

/** 查询入口自身鉴权，不能只假设父布局已经保护了请求。 */
export async function getAdminMetrics(): Promise<AdminMetric[]> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  // 三项独立读取并行执行；这不是数据库一致性快照。
  const [projects, tools, tags] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("tools").select("id", { count: "exact", head: true }),
    supabase.from("tags").select("id", { count: "exact", head: true }),
  ]);

  return [
    { id: "projects", label: "项目总数", value: projects.error ? null : projects.count },
    { id: "tools", label: "工具总数", value: tools.error ? null : tools.count },
    { id: "tags", label: "标签总数", value: tags.error ? null : tags.count },
  ];
}

/** 只允许两张指定业务表，返回最新 10 条，不提供任意表名查询入口。 */
export async function getAdminPreview(
  kind: "tools" | "projects",
): Promise<AdminPreviewResult> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from(kind)
    .select("id, name, description, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(10);

  if (error || !data || count === null) {
    return { rows: [], total: null, error: "暂时无法读取预览，请点击刷新数据重试。" };
  }

  return { rows: data, total: count, error: null };
}
