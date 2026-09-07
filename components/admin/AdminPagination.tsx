import GuardedLink from "@/components/admin/GuardedLink";
import { getPaginationItems } from "@/lib/pagination";
import styles from "@/app/admin/admin.module.css";

type Props = {
  currentPage: number;
  pageCount: number;
  basePath: string;
  label: string;
};

/** 后台列表共用分页，避免项目、工具和分类出现不同的页码行为。 */
export default function AdminPagination({ currentPage, pageCount, basePath, label }: Props) {
  const items = getPaginationItems(currentPage, pageCount);

  return (
    <nav className={styles.pagination} aria-label={label}>
      {currentPage > 1 ? (
        <GuardedLink className={styles.paginationEdge} href={`${basePath}?page=${currentPage - 1}`}>
          上一页
        </GuardedLink>
      ) : (
        <span className={styles.paginationEdgeDisabled} aria-disabled="true">上一页</span>
      )}

      <div className={styles.pageNumbers}>
        {items.map((item) => typeof item === "number" ? (
          item === currentPage ? (
            <span className={styles.currentPage} aria-current="page" key={item}>
              <span className={styles.visuallyHidden}>当前页：</span>{item}
            </span>
          ) : (
            <GuardedLink className={styles.pageNumber} href={`${basePath}?page=${item}`} key={item}
              aria-label={`第 ${item} 页`}>
              {item}
            </GuardedLink>
          )
        ) : (
          <span className={styles.paginationEllipsis} aria-hidden="true" key={item}>…</span>
        ))}
      </div>

      {currentPage < pageCount ? (
        <GuardedLink className={styles.paginationEdge} href={`${basePath}?page=${currentPage + 1}`}>
          下一页
        </GuardedLink>
      ) : (
        <span className={styles.paginationEdgeDisabled} aria-disabled="true">下一页</span>
      )}
    </nav>
  );
}
