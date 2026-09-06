import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 工具页由服务端查询读取现有会话，避免导航前重复刷新令牌。
  matcher: ["/login", "/admin/:path*"],
};
