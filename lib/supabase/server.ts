import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/** 每个请求单独创建；true 只供能写 Cookie 的 Server Action 使用。 */
export async function createSupabaseServerClient(writableCookies = false) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("缺少 Supabase 环境变量，请检查本地配置。");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // 页面渲染只读，会话刷新由 Proxy 在响应提交前处理。
        if (!writableCookies) return;

        // 登录和退出必须真正写入 Cookie；失败时不能吞掉错误。
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
