import Link from "next/link";
import styles from "../admin.module.css";
export default function ProjectNotFound() {
  return <section className={styles.panel}><h1 className={styles.heading}>项目不存在</h1>
    <p className={styles.hint}>该项目可能已被删除，或地址不正确。</p>
    <Link className={styles.link} href="/admin/projects?page=1">返回项目管理</Link></section>;
}
