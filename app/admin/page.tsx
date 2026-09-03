import type { Metadata } from "next";
import LogoutButton from "@/components/LogoutButton";
import { requireAdmin } from "@/lib/auth/admin";
import styles from "@/app/auth.module.css";

export const metadata: Metadata = {
  title: "管理入口",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // 在读取或显示后台内容之前完成授权。
  const user = await requireAdmin();

  return (
    <main className={styles.panel}>
      <h1>管理入口</h1>
      <p>你已通过管理员验证。</p>
      <p className={styles.hint}>当前账号：{user.email}</p>
      <p>今天只验证身份；工具和项目管理会在后续课程实现。</p>
      <LogoutButton />
    </main>
  );
}
