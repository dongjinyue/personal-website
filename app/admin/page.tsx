import { redirect } from "next/navigation";

/** 后台不再保留概览页，统一从工具管理开始。 */
export default function AdminPage() {
  redirect("/admin/tools");
}
