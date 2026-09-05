import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnsavedChangesProvider from "@/components/admin/UnsavedChangesProvider";
import { getCurrentUser, isAdmin } from "@/lib/auth/admin";
import { getNavigationPublicProjects } from "@/lib/project-repository";
import { getNavigationPublicTools, getPublicToolCategories } from "@/lib/tool-repository";
import "./globals.css";
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 导航入口由服务端会话决定；验证异常时按访客处理，避免泄露后台入口。
  let showAdmin = false;
  let navigationProjects: Array<{ name: string; slug: string }> = [];
  let navigationTools: Array<{ name: string; url: string; category: string }> = [];
  let navigationCategories: string[] = [];
  try {
    [navigationProjects, navigationTools, navigationCategories] = await Promise.all([
      getNavigationPublicProjects(), getNavigationPublicTools(), getPublicToolCategories(),
    ]);
  } catch {
    // 公开数据临时不可用时仍保留主导航入口。
  }
  try {
    const user = await getCurrentUser();
    showAdmin = Boolean(user && isAdmin(user.id));
  } catch {
    // 身份验证异常时安全降级为访客，不影响公开导航数据。
  }

  return (
    <html lang="zh-CN">
      <body>
        <UnsavedChangesProvider>
          <Header showAdmin={showAdmin} projects={navigationProjects} tools={navigationTools}
            categories={navigationCategories} />
          {children}
          <Footer />
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
