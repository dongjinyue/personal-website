"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { collectLatestNews, type CollectedNewsArticle } from "@/ops/news-collector/collect-news.mjs";
import { persistNewArticles } from "@/ops/news-collector/news-workflow.mjs";

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

/** 首页手动采集：先验证管理员身份，再只插入 RSS 中尚不存在的来源链接。 */
export async function refreshAiNewsNow(): Promise<{ ok: boolean; inserted: number; message: string }> {
  const denied = await checkNewsWriter();
  if (denied) {
    const message = denied.startsWith("登录已失效")
      ? "请先使用管理员账号登录，再获取新闻。"
      : denied;
    return { ok: false, inserted: 0, message };
  }

  try {
    const candidates: CollectedNewsArticle[] = await collectLatestNews();
    const supabase = await createSupabaseServerClient(true);
    let failedWrites = 0;
    const result = await persistNewArticles(
      candidates,
      async (sourceUrls) => {
        const { data, error } = await supabase
          .from("news_articles")
          .select("source_url")
          .in("source_url", sourceUrls);
        if (error) throw error;
        return (data ?? []).map((row) => row.source_url).filter((url): url is string => Boolean(url));
      },
      async (newArticles) => {
        let inserted = 0;
        for (const article of newArticles) {
          const { error } = await supabase.from("news_articles").insert({
            title: article.title,
            title_zh: article.title_zh || null,
            source_url: article.source_url,
            source_name: article.source_name,
            description: article.description,
            description_zh: article.description_zh || null,
            detail: null,
            category: article.category,
            is_public: true,
            hide_from_guests: false,
            published_at: article.published_at,
          });
          // 并发采集时另一请求可能先插入同一链接；唯一索引会安全拦下重复项。
          if (error?.code === "23505") continue;
          if (error) {
            failedWrites++;
            continue;
          }
          inserted++;
        }
        return inserted;
      },
    );

    if (result.inserted > 0) invalidateNews();
    if (failedWrites > 0 && result.inserted === 0) {
      return { ok: false, inserted: 0, message: "新闻源已读取，但部分内容没有写入；请稍后重试或在后台核对。" };
    }
    if (failedWrites > 0) {
      return { ok: true, inserted: result.inserted, message: `已新增 ${result.inserted} 条；另有 ${failedWrites} 条写入失败。` };
    }
    return result.inserted > 0
      ? { ok: true, inserted: result.inserted, message: `已获取最新新闻，新增 ${result.inserted} 条。` }
      : { ok: true, inserted: 0, message: "没有发现新新闻，原有列表保持不变。" };
  } catch {
    return { ok: false, inserted: 0, message: "暂时无法获取新闻，请稍后重试。" };
  }
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
