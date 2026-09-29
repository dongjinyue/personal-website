import "server-only";

import { cache } from "react";
import type { Tool } from "@/data/tools";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 从可见工具回退生成分类；允许空分类表或网络临时故障时维持页面可用。 */
export function getCategoriesFromTools(tools: Pick<Tool, "category">[]): string[] {
  return [...new Set(tools.map((tool) => tool.category).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "zh-CN"),
  );
}

/**
 * 从 Supabase 查询全部工具及其标签。
 */
export const getTools = cache(async function getTools(): Promise<Tool[]> {
  // 携带当前会话，让数据库策略决定游客或登录用户的可见范围。
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tools")
    .select(`
      id,
      name,
      description,
      url,
      category,
      is_favorite,
      is_public,
      tool_tags (
        tags (
          name
        )
      )
    `)
    .eq("is_public", true)
    .order("name");

  if (error) {
    throw new Error(`读取工具数据失败：${error.message}`);
  }

  return data.map((tool) => {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      url: tool.url,
      category: tool.category,
      isFavorite: tool.is_favorite,

      // 将数据库关联结构转换成页面需要的字符串数组。
      tags: tool.tool_tags.flatMap((relation) =>
        relation.tags ? [relation.tags.name] : [],
      ),
    };
  });
});

/** 分类直接来自分类表，因此尚未绑定工具的新分类也能立即出现在公开界面。 */
export const getPublicToolCategories = cache(async function getPublicToolCategories(): Promise<string[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("tool_categories")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    if (!/fetch failed|failed to fetch|network error/i.test(error.message)) {
      throw new Error(`读取工具分类失败：${error.message}`);
    }
    // 分类表短暂不可达时，工具集仍可用工具记录自带的分类继续展示。
    // getTools 使用 React.cache，同一次服务端渲染不会重复请求工具列表。
    console.warn("读取工具分类失败，临时使用公开工具中的分类。", {
      code: error.code,
    });
    const tools = await getTools();
    return getCategoriesFromTools(tools);
  }
  return data.map((category) => category.name);
});

/** 首页只读取常用工具，确保展示内容与后台管理保持一致。 */
export async function getFavoriteTools(limit = 3): Promise<Tool[]> {
  const tools = await getTools();
  return tools.filter((tool) => tool.isFavorite).slice(0, limit);
}

/** 顶部导航按真实分类展示公开工具；常用工具在同一分类中优先。 */
export async function getNavigationPublicTools() {
  const tools = await getTools();
  return [...tools]
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, "zh-CN"))
    .map((tool) => ({ name: tool.name, url: tool.url, category: tool.category }));
}
