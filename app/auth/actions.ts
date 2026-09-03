"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUserId } from "@/lib/auth/admin";
import type { AuthActionState } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 返回可展示的错误，不返回密码、令牌或完整 Auth 响应。 */
export async function loginAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return { message: "请填写邮箱和密码。" };
  }

  const email = emailValue.trim();
  const password = passwordValue; // 密码不能 trim，空格可能是密码的一部分。
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { message: "请输入有效的邮箱地址。" };
  }
  if (!password || password.length > 1024) {
    return { message: "请检查密码长度。" };
  }

  const adminId = getAdminUserId();
  const supabase = await createSupabaseServerClient(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { message: "登录失败，请检查凭据或稍后重试。" };
  }

  if (data.user.id.toLowerCase() !== adminId) {
    // 普通账号认证虽成功，但没有管理权限；清理本次登录会话。
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) throw new Error("清理会话失败，请稍后重试。");
    return { message: "此账号没有管理员权限。" };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

/** 只退出当前会话，不把所有设备一起退出。 */
export async function logoutAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  void formData;
  const supabase = await createSupabaseServerClient(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { message: "退出失败，请稍后重试。" };

  revalidatePath("/", "layout");
  redirect("/login");
}
