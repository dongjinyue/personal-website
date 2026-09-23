import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const NEWS_ADMIN_PAGE_SIZE = 10;

export async function getAdminNewsPage(rawPage?: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const counted = await supabase.from("news_articles").select("id", { count: "exact", head: true });
  if (counted.error || counted.count === null) throw new Error("暂时无法读取新闻数量。");

  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / NEWS_ADMIN_PAGE_SIZE));
  const page = Math.min(requested, pages);
  const from = (page - 1) * NEWS_ADMIN_PAGE_SIZE;
  const { data, error } = await supabase.from("news_articles")
    .select("id, title, source_url, source_name, description, category, is_public, hide_from_guests, published_at, collected_at, created_at, updated_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("collected_at", { ascending: false })
    .range(from, from + NEWS_ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error("暂时无法读取新闻列表。");
  return { rows: data, total, pages, page };
}

export async function getAdminNewsItem(id: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("news_articles")
    .select("id, title, source_url, source_name, description, detail, category, is_public, hide_from_guests, published_at, collected_at, created_at, updated_at")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("暂时无法读取该新闻。");
  if (!data) return null;
  return data;
}
