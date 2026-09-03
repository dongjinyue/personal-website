import type { AdminPreviewResult } from "@/lib/admin-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
import styles from "@/app/admin/admin.module.css";

type Props = {
  result: AdminPreviewResult;
  label: string;
};

export default function AdminPreview({ result, label }: Props) {
  if (result.error) {
    return <div className={styles.state} role="status"><p>{result.error}</p></div>;
  }

  if (result.rows.length === 0) {
    return (
      <div className={styles.state}>
        <p>暂时没有{label}。</p>
        <p className={styles.hint}>本页只读，后续课程会加入新增功能。</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap} tabIndex={0} role="region"
      aria-label={`${label}数据预览，可横向滚动`}>
      <table className={styles.table}>
        <caption>
          当前显示 {result.rows.length} 条，共 {result.total} 条；最多预览 10 条，按最近更新排序。
        </caption>
        <thead>
          <tr>
            <th scope="col">名称</th>
            <th scope="col">简介</th>
            <th scope="col">更新时间（北京时间）</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              <td>{row.description}</td>
              <td>{formatAdminDate(row.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
