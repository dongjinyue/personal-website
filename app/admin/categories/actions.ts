"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CategoryResult = { ok: boolean; message: string };

async function checkWriter() {
  try {
    const user = await getCurrentUser();
    if (!user) return "登录已失效，请重新登录后再操作。";
    if (!isAdmin(user.id)) return "当前账号没有管理员写入权限。";
    return null;
  } catch {
    return "暂时无法验证权限，请稍后重试。";
  }
}

function parseName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

function validVersion(version: string) {
  return Boolean(version) && Number.isFinite(Date.parse(version));
}

function validateName(name: string): CategoryResult | null {
  return name.length >= 1 && name.length <= 40
    ? null
    : { ok: false, message: "分类名称需要填写 1～40 个字符。" };
}

function invalidateCategoryViews() {
  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/tools");
}

/** 新增分类；数据库唯一约束负责阻止重名。 */
export async function createToolCategory(rawName: string): Promise<CategoryResult> {
  const denied = await checkWriter();
  if (denied) return { ok: false, message: denied };
  const name = parseName(rawName);
  const invalid = validateName(name);
  if (invalid) return invalid;

  const supabase = await createSupabaseServerClient(true);
  const { error } = await supabase.from("tool_categories").insert({ name });
  if (error?.code === "23505") return { ok: false, message: "这个分类已经存在。" };
  if (error) return { ok: false, message: "分类未能新增，请稍后重试。" };

  invalidateCategoryViews();
  return { ok: true, message: `已新增分类“${name}”。` };
}

/** 分类改名会由外键级联同步到所有相关工具。 */
export async function renameToolCategory(
  id: number,
  version: string,
  rawName: string,
): Promise<CategoryResult> {
  const denied = await checkWriter();
  if (denied) return { ok: false, message: denied };
  if (!validId(id) || !validVersion(version)) return { ok: false, message: "分类参数无效，请刷新后重试。" };
  const name = parseName(rawName);
  const invalid = validateName(name);
  if (invalid) return invalid;

  const supabase = await createSupabaseServerClient(true);
  const { data, error } = await supabase.from("tool_categories")
    .update({ name })
    .eq("id", id)
    .eq("updated_at", version)
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return { ok: false, message: "这个分类名称已经存在。" };
  if (error) return { ok: false, message: "分类未能改名，请稍后重试。" };
  if (!data) return { ok: false, message: "分类已被其他操作修改，请刷新后重试。" };

  invalidateCategoryViews();
  return { ok: true, message: `分类已改名为“${name}”，相关工具已同步更新。` };
}

/** 仍有工具使用时，外键会阻止删除，避免产生无分类工具。 */
export async function deleteToolCategory(id: number, version: string): Promise<CategoryResult> {
  const denied = await checkWriter();
  if (denied) return { ok: false, message: denied };
  if (!validId(id) || !validVersion(version)) return { ok: false, message: "分类参数无效，请刷新后重试。" };

  const supabase = await createSupabaseServerClient(true);
  const { data, error } = await supabase.from("tool_categories")
    .delete()
    .eq("id", id)
    .eq("updated_at", version)
    .select("id")
    .maybeSingle();
  if (error?.code === "23503") {
    return { ok: false, message: "该分类仍被工具使用。请先把相关工具移到其他分类，再删除。" };
  }
  if (error) return { ok: false, message: "分类未能删除，请稍后重试。" };
  if (!data) return { ok: false, message: "分类已被修改或删除，请刷新后重试。" };

  invalidateCategoryViews();
  return { ok: true, message: "分类已删除。" };
}
