import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { getKnowledgeStatusForAdmin } from "@/lib/knowledge/repository";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "知识库状态" };

function formatGeneratedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "暂无记录";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(parsed);
}

/** 页面与 Repository 分别验证管理员；状态只包含元数据，不传递笔记正文。 */
export default async function AdminKnowledgePage() {
  await requireAdmin();
  const status = await getKnowledgeStatusForAdmin();

  return (
    <div className={styles.stack}>
      <section className={styles.panel} aria-labelledby="admin-knowledge-title">
        <h1 className={styles.heading} id="admin-knowledge-title">知识库状态</h1>
        <p className={styles.hint}>
          查看网站当前读取的知识库版本与内容检查结果。上方“刷新数据”只重新读取页面，不会从 Git 拉取笔记。
        </p>
        <dl className={styles.knowledgeVersion}>
          <div><dt>当前版本</dt><dd><code>{status.version}</code></dd></div>
          <div><dt>解析时间</dt><dd>{formatGeneratedAt(status.generatedAt)}（北京时间）</dd></div>
        </dl>
      </section>

      <section aria-label="笔记数量" className={styles.knowledgeStats}>
        <div className={styles.stat}><p>有效笔记总数</p><strong className={styles.value}>{status.total}</strong></div>
        <div className={styles.stat}><p>公开且已发布</p><strong className={styles.value}>{status.publicPublished}</strong></div>
        <div className={styles.stat}><p>私密笔记</p><strong className={styles.value}>{status.privateCount}</strong></div>
        <div className={styles.stat}><p>草稿笔记</p><strong className={styles.value}>{status.draftCount}</strong></div>
      </section>

      <section className={styles.panel} aria-labelledby="admin-knowledge-diagnostics">
        <div className={styles.pageHeading}>
          <h2 id="admin-knowledge-diagnostics" className={styles.knowledgeSectionHeading}>内容诊断</h2>
          <span className={styles.hint}>共 {status.diagnostics.length} 项</span>
        </div>
        {status.diagnostics.length === 0 ? (
          <p className={styles.hint}>当前没有内容诊断。</p>
        ) : (
          <ul className={styles.knowledgeDiagnostics}>
            {status.diagnostics.map((item, index) => (
              <li key={`${item.path}-${item.code}-${index}`}>
                <code>{item.path}</code>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
