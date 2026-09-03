"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseProjectForm, validProjectId, type ProjectActionState } from "@/lib/project-form";

async function checkProjectWriter() {
  try {
    const user = await getCurrentUser();
    if (!user) return "登录已失效，请在新标签页重新登录后回来继续。";
    return isAdmin(user.id) ? null : "当前账号没有管理员权限。";
  } catch { return "暂时无法确认身份，请稍后重试。"; }
}

function invalidateProjects(id: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}/edit`);
}

function validVersion(version: string) {
  return Boolean(version) && Number.isFinite(Date.parse(version));
}

export async function saveProject(
  mode: "create" | "edit", id: string, version: string,
  previous: ProjectActionState, formData: FormData,
): Promise<ProjectActionState> {
  const fail = (message: string, errors: ProjectActionState["errors"] = {}) => ({
    message, errors, attempt: (Number(previous?.attempt) || 0) + 1,
  });
  const denied = await checkProjectWriter();
  if (denied) return fail(denied);
  if (!validProjectId(id) || !["create", "edit"].includes(mode)) return fail("操作参数无效。");
  if (mode === "edit" && !validVersion(version)) return fail("版本无效，请重新打开编辑页。");
  const parsed = parseProjectForm(formData);
  if (!parsed.valid) return fail("请修正标出的字段。", parsed.errors);
  const { slug, ...fields } = parsed.values;
  const payload = { ...fields, project_url: fields.project_url || null, github_url: fields.github_url || null };

  try {
    const supabase = await createSupabaseServerClient(true);
    if (mode === "edit") {
      const current = await supabase.from("projects").select("slug").eq("id", id).maybeSingle();
      if (current.error) return fail("暂时无法核对当前项目。");
      if (!current.data) return fail("项目不存在或没有权限。");
      if (current.data.slug !== slug) return fail("创建后不能修改网址短名。", { slug: "请保留原网址短名。" });
    }
    const query = mode === "create"
      ? supabase.from("projects").insert({ id, slug, ...payload })
      : supabase.from("projects").update(payload).eq("id", id).eq("updated_at", version);
    const { data, error } = await query.select("id").maybeSingle();
    if (error?.code === "23505") return fail("网址短名或记录标识已存在，请先核对列表。");
    if (error) return fail("保存未获确认，请检查权限，重试前先核对记录。");
    if (!data) return fail("记录已修改、删除或权限不匹配，请保留输入并重新核对。");
  } catch { return fail("没有收到保存确认，操作可能已完成，请先核对列表。"); }

  invalidateProjects(id);
  redirect(`/admin/projects?page=1&notice=${mode === "create" ? "created" : "updated"}`);
}

export async function setProjectVisibility(id: string, version: string, visible: boolean) {
  const denied = await checkProjectWriter();
  if (denied) return { ok: false, message: denied };
  if (!validProjectId(id) || !validVersion(version) || typeof visible !== "boolean") {
    return { ok: false, message: "公开状态参数无效。" };
  }
  try {
    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase.from("projects").update({ is_public: visible })
      .eq("id", id).eq("updated_at", version).select("id").maybeSingle();
    if (error || !data) return { ok: false, message: "修改未获确认，请核对权限、版本和当前状态。" };
  } catch { return { ok: false, message: "未收到确认，请先刷新列表核对实际公开状态。" }; }
  invalidateProjects(id);
  return { ok: true, message: visible ? "项目已公开。" : "项目已设为私有。" };
}

export async function deleteProject(id: string, version: string) {
  const denied = await checkProjectWriter();
  if (denied) return { ok: false, message: denied };
  if (!validProjectId(id) || !validVersion(version)) return { ok: false, message: "删除参数无效。" };
  try {
    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase.from("projects").delete()
      .eq("id", id).eq("updated_at", version).select("id").maybeSingle();
    if (error || !data) return { ok: false, message: "删除未获确认，请核对权限、版本和当前记录。" };
  } catch { return { ok: false, message: "未收到删除确认，请先核对列表，不要自动重复删除。" }; }
  invalidateProjects(id);
  return { ok: true, message: "项目已删除。" };
}
