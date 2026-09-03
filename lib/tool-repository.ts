import type { Tool, ToolCategory } from "@/data/tools";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 判断数据库中的分类是否属于网站支持的工具分类。
 *
 * PostgreSQL 的 CHECK 约束不会自动生成 TypeScript 联合类型，
 * 因此需要在运行时再次验证，防止异常数据进入页面。
 */
function isToolCategory(category: string): category is ToolCategory {
  return ["AI", "开发", "学习", "效率"].includes(category);
}

/**
 * 从 Supabase 查询全部工具及其标签。
 */
export async function getTools(): Promise<Tool[]> {
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
      tool_tags (
        tags (
          name
        )
      )
    `)
    .order("name");

  if (error) {
    throw new Error(`读取工具数据失败：${error.message}`);
  }

  return data.map((tool) => {
    if (!isToolCategory(tool.category)) {
      throw new Error(`发现不支持的工具分类：${tool.category}`);
    }

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
}