import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 配置错误时停止，不把缺少配置解释成“所有人都能进入”。 */
export function getAdminUserId() {
  const id = process.env.ADMIN_USER_ID?.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuid.test(id)) {
    throw new Error("ADMIN_USER_ID 未配置为正确的用户 UUID。");
  }
  return id.toLowerCase();
}

export function isAdmin(userId: string) {
  return userId.toLowerCase() === getAdminUserId();
}

/** 向 Auth 服务确认用户，不直接信任客户端传入的身份。 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isAuthSessionMissingError(error) || error.status === 401 || error.status === 403) {
      return null;
    }
    // 服务故障保留为错误，不伪装成已登录，也不暴露底层响应内容。
    throw new Error("暂时无法确认登录状态，请稍后重试。");
  }
  return data.user;
});

/** 仅用于公开导航分支；本地验证会话声明，减少每次跳转访问 Auth 服务。 */
export const getCurrentUserIdFromClaims = cache(async function getCurrentUserIdFromClaims() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    if (isAuthSessionMissingError(error) || error.status === 401 || error.status === 403) return null;
    throw new Error("暂时无法确认登录状态，请稍后重试。");
  }
  return typeof data?.claims.sub === "string" ? data.claims.sub : null;
});

/** 页面使用跳转；以后每个敏感操作也必须重新调用授权检查。 */
export async function requireAdmin() {
  getAdminUserId();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/login?error=forbidden");
  return user;
}
