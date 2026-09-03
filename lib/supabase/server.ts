import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

/**
 * 为每次服务端请求创建独立的 Supabase Client。
 *
 * 不要把 Client 定义成全局单例，因为不同用户拥有不同的 Cookie（会话凭据）。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        /**
         * 将当前请求中的全部 Cookie 交给 Supabase。
         * Day 11 实现管理员登录后，这些 Cookie 将保存登录状态。
         */
        getAll() {
          return cookieStore.getAll();
        },

        /**
         * Supabase 刷新登录状态时，需要更新 Cookie。
         *
         * Server Component（服务端组件）有时不允许直接修改 Cookie，
         * 所以这里捕获异常；Day 11 会通过 Proxy/Middleware 完善会话刷新。
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 在不允许修改 Cookie 的 Server Component 中忽略，
            // 登录会话刷新将由后续的 Proxy/Middleware 负责。
          }
        },
      },
    },
  );
}
