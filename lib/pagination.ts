export type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

/**
 * 生成紧凑页码：页数较多时保留首尾页、当前页和相邻页。
 * 这样既能直接跳页，也不会让分页条在窄屏上无限变宽。
 */
export function getPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount < 1) return [];
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis", pageCount];
  }

  if (currentPage >= pageCount - 3) {
    return [1, "start-ellipsis", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    pageCount,
  ];
}
