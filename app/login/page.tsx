import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import LogoutButton from "@/components/LogoutButton";
import { getAdminUserId, getCurrentUser, isAdmin } from "@/lib/auth/admin";
import styles from "@/app/auth.module.css";

export const metadata: Metadata = {
  title: "管理员登录",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  getAdminUserId();
  const user = await getCurrentUser();
  if (user && isAdmin(user.id)) redirect("/admin");

  return (
    <main className={styles.panel}>
      <h1>管理员登录</h1>
      <p className={styles.hint}>只有指定管理员可以进入后台；登录后也能查看仅登录可见的工具。</p>
      {user && (
        <section aria-label="当前账号状态">
          <p>当前账号没有管理员权限，请退出后使用管理员账号。</p>
          <LogoutButton />
        </section>
      )}
      <LoginForm />
    </main>
  );
}
