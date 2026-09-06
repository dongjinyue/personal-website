import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnsavedChangesProvider from "@/components/admin/UnsavedChangesProvider";
import { getCurrentUserIdFromClaims, isAdmin } from "@/lib/auth/admin";
import { getNavigationPublicTools, getPublicToolCategories } from "@/lib/tool-repository";
import "./globals.css";
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 导航入口由服务端会话决定；验证异常时按访客处理，避免泄露后台入口。
  let showAdmin = false;
  let navigationTools: Array<{ name: string; url: string; category: string }> = [];
  let navigationCategories: string[] = [];
  // 身份与导航内容并行读取，避免每次页面跳转串行等待多个网络请求。
  const [userResult, toolsResult, categoriesResult] = await Promise.allSettled([
    getCurrentUserIdFromClaims(), getNavigationPublicTools(), getPublicToolCategories(),
  ]);
  if (userResult.status === "fulfilled") {
    try { showAdmin = Boolean(userResult.value && isAdmin(userResult.value)); }
    catch { showAdmin = false; }
  }
  if (toolsResult.status === "fulfilled") navigationTools = toolsResult.value;
  if (categoriesResult.status === "fulfilled") navigationCategories = categoriesResult.value;

  return (
    <html lang="zh-CN">
      <body>
        <UnsavedChangesProvider>
          <Header showAdmin={showAdmin} tools={navigationTools}
            categories={navigationCategories} />
          {children}
          <Footer />
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
