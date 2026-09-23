"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function checkNewsWriter() {
  try {
    const user = await getCurrentUser();
    if (!user) return "登录已失效，请在新标签页重新登录，再回到这里提交。";
    if (!isAdmin(user.id)) return "当前账号没有管理员写入权限。";
    return null;
  } catch {
    return "暂时无法验证权限，请稍后重试。";
  }
}

function invalidateNews() {
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin");
  revalidatePath("/admin/news");
}

function validVersion(version: string) {
  return Boolean(version) && Number.isFinite(Date.parse(version));
}

/** 批量设置游客可见性；已登录用户不受该字段限制。 */
export async function setNewsGuestVisibility(
  items: Array<{ id: string; updatedAt: string }>,
  visible: boolean,
) {
  const denied = await checkNewsWriter();
  if (denied) return { ok: false, message: denied };
  if (!Array.isArray(items) || items.length === 0 || items.length > 50 || typeof visible !== "boolean") {
    return { ok: false, message: "请选择 1～50 条新闻后再操作。" };
  }
  if (items.some((item) => !item.id || !validVersion(item.updatedAt))) {
    return { ok: false, message: "所选新闻参数无效，请刷新列表后重试。" };
  }

  try {
    const supabase = await createSupabaseServerClient(true);
    for (const item of items) {
      const { data, error } = await supabase.from("news_articles")
        .update({ hide_from_guests: !visible })
        .eq("id", item.id)
        .eq("updated_at", item.updatedAt)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        return { ok: false, message: "部分新闻未修改，请刷新列表核对游客可见状态。" };
      }
    }
  } catch {
    return { ok: false, message: "没有收到完整确认，请刷新列表核对游客可见状态。" };
  }

  invalidateNews();
  return { ok: true, message: visible
    ? `已让 ${items.length} 条新闻对游客可见。`
    : `已将 ${items.length} 条新闻设为仅登录可见。` };
}

export async function deleteNews(
  id: string,
  version: string,
): Promise<{ ok: boolean; message: string }> {
  const denied = await checkNewsWriter();
  if (denied) return { ok: false, message: denied };
  if (!id || !version || !Number.isFinite(Date.parse(version))) {
    return { ok: false, message: "删除参数无效，请刷新后重新确认。" };
  }

  try {
    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase
      .from("news_articles")
      .delete()
      .eq("id", id)
      .eq("updated_at", version)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, message: "删除未获确认，请核对权限和当前列表。" };
    if (!data) return { ok: false, message: "记录已变更、已删除或权限不匹配，请重新核对。" };
  } catch {
    return { ok: false, message: "未收到删除确认，请先核对列表，不要自动重试。" };
  }

  invalidateNews();
  return { ok: true, message: "新闻已删除。" };
}
