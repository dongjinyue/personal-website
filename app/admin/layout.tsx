import type { Metadata } from "next";
import GuardedLink from "@/components/admin/GuardedLink";
import AdminNav from "@/components/admin/AdminNav";
import RefreshButton from "@/components/admin/RefreshButton";
import LogoutButton from "@/components/LogoutButton";
import { requireAdmin } from "@/lib/auth/admin";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: { default: "管理后台 | MY SPACE", template: "%s | 管理后台" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className={styles.shell}>
      <a href="#admin-content" className={styles.skipLink}>跳到后台内容</a>
      <aside className={styles.sidebar}>
        <h2>管理后台</h2>
        <p className={styles.hint}>个人内容工作台</p>
        <AdminNav />
        <GuardedLink className={styles.link} href="/">返回公开网站</GuardedLink>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.hint}>当前账号：{user.email}</p>
            <RefreshButton />
          </div>
          <LogoutButton />
        </header>
        <main id="admin-content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
