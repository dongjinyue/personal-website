"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseToolForm, validToolId, type ToolActionState } from "@/lib/tool-form";

// 表单过期时返回提示，保留屏幕上的输入，而不是立即跳走丢稿。
async function checkWriter() {
  try {
    const user = await getCurrentUser();
    if (!user) return "登录已失效，请在新标签页重新登录，再回到这里提交。";
    if (!isAdmin(user.id)) return "当前账号没有管理员写入权限。";
    return null;
  } catch {
    return "暂时无法验证权限，请稍后重试。";
  }
}

function invalidateTools() {
  revalidatePath("/admin");
  revalidatePath("/admin/tools");
  revalidatePath("/tools");
}

export async function saveTool(
  mode: "create" | "edit",
  id: string,
  version: string,
  previous: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const fail = (message: string, errors: ToolActionState["errors"] = {}) => ({
    message,
    errors,
    attempt: (Number(previous?.attempt) || 0) + 1,
  });
  const denied = await checkWriter();
  if (denied) return fail(denied);
  if (!validToolId(id) || !["create", "edit"].includes(mode)) return fail("操作参数无效。");
  if (mode === "edit" && (!version || !Number.isFinite(Date.parse(version)))) {
    return fail("缺少有效版本，请重新打开编辑页。");
  }

  const parsed = parseToolForm(formData);
  if (!parsed.valid) return fail("请修正标出的字段。", parsed.errors);

  try {
    const supabase = await createSupabaseServerClient(true);
    const query = mode === "create"
      ? supabase.from("tools").insert({ id, ...parsed.values })
      : supabase.from("tools").update(parsed.values).eq("id", id).eq("updated_at", version);
    const { data, error } = await query.select("id").maybeSingle();

    if (error?.code === "23505") {
      return fail("网址或记录标识已存在。若上次提交中断，请先回列表核对，不要反复新建。");
    }
    if (error) return fail("保存未获确认，请检查权限和网络；重试前先核对列表。");
    if (!data) return fail("记录已变更、已删除或权限不匹配。请保留输入并重新核对。");
  } catch {
    return fail("没有收到保存确认。操作可能已完成，请先在新标签页核对列表。");
  }

  // redirect 会中断控制流，不能放进上面的通用 catch。
  invalidateTools();
  revalidatePath(`/admin/tools/${id}/edit`);
  redirect(`/admin/tools?page=1&notice=${mode === "create" ? "created" : "updated"}`);
}

export async function deleteTool(
  id: string,
  version: string,
): Promise<{ ok: boolean; message: string }> {
  const denied = await checkWriter();
  if (denied) return { ok: false, message: denied };
  if (!validToolId(id) || !version || !Number.isFinite(Date.parse(version))) {
    return { ok: false, message: "删除参数无效，请刷新后重新确认。" };
  }

  try {
    const supabase = await createSupabaseServerClient(true);
    // 只操作指定 ID 和版本，绝不发无条件 delete。
    const { data, error } = await supabase
      .from("tools")
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

  invalidateTools();
  revalidatePath(`/admin/tools/${id}/edit`);
  return { ok: true, message: "工具已删除。" };
}
