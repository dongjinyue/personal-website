"use client";

import { useRef, useState } from "react";
import type { Tool } from "@/data/tools";
import { getPaginationItems } from "@/lib/pagination";
import ToolCard from "./ToolCard";
import styles from "./ToolExplorer.module.css";

type ToolExplorerProps = {
  tools: Tool[];
  categories: string[];
};

type ToolFilterCategory = "全部" | string;
const TOOL_PAGE_SIZE = 8;

export default function ToolExplorer({ tools, categories: categoryOptions }: ToolExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolFilterCategory>("全部");
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // 分类按钮直接来自公开工具数据，管理员新增分类后无需修改代码。
  const categories: ToolFilterCategory[] = [
    "全部",
    ...Array.from(new Set(categoryOptions))
      .sort((left, right) => left.localeCompare(right, "zh-CN")),
  ];

  // 搜索结果由当前数据和筛选条件直接计算，不需要维护第二份结果状态。
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const filteredTools = tools.filter((tool) => {
    const searchableText = [
      tool.name,
      tool.description,
      tool.category,
      ...tool.tags,
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN");

    const matchesQuery = searchableText.includes(normalizedQuery);
    const matchesCategory =
      activeCategory === "全部" || tool.category === activeCategory;

    return matchesQuery && matchesCategory;
  });
  const pageCount = Math.max(1, Math.ceil(filteredTools.length / TOOL_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = getPaginationItems(currentPage, pageCount);
  const visibleTools = filteredTools.slice(
    (currentPage - 1) * TOOL_PAGE_SIZE,
    currentPage * TOOL_PAGE_SIZE,
  );

  function clearSearch() {
    setQuery("");
    setPage(1);
    searchInputRef.current?.focus();
  }

  function resetFilters() {
    setQuery("");
    setActiveCategory("全部");
    setPage(1);
    // 清除按钮会随空状态一起卸载，下一帧再聚焦，避免焦点落回页面顶部。
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  if (tools.length === 0) {
    return (
      <section className={styles.emptyState}>
        <h2>还没有工具</h2>
        <p>添加第一个常用工具后，它会显示在这里。</p>
      </section>
    );
  }

  return (
    <section className={styles.explorer} aria-label="工具搜索与筛选">
      <div className={styles.controls}>
        <label className={styles.label} htmlFor="tool-search">
          搜索工具
        </label>
        <div className={styles.searchRow}>
          <input
            ref={searchInputRef}
            className={styles.input}
            id="tool-search"
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="搜索名称、简介、分类或标签"
          />
          {query && (
            <button
              className={styles.clearButton}
              type="button"
              onClick={clearSearch}
              aria-label="清除搜索内容"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filters} aria-label="按分类筛选工具">
          {categories.map((category) => (
            <button
              className={styles.filterButton}
              key={category}
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => { setActiveCategory(category); setPage(1); }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.resultCount} aria-live="polite">
        找到 {filteredTools.length} 个工具，第 {currentPage}/{pageCount} 页
      </p>

      {filteredTools.length > 0 ? (
        <div className={styles.grid} aria-label="工具搜索结果">
          {visibleTools.map((tool) => (
            <ToolCard
              key={tool.id}
              name={tool.name}
              description={tool.description}
              url={tool.url}
              category={tool.category}
              tags={tool.tags}
              isFavorite={tool.isFavorite}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>没有找到匹配的工具</h2>
          <p>尝试更换关键词、选择其他分类，或清除全部筛选。</p>
          <button className={styles.resetButton} type="button" onClick={resetFilters}>
            清除全部筛选
          </button>
        </div>
      )}

      {filteredTools.length > 0 && (
        <nav className={styles.pagination} aria-label="工具集分页">
          <button type="button" className={styles.paginationEdge} disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
          <div className={styles.pageNumbers}>
            {pageItems.map((item) => typeof item === "number" ? (
              item === currentPage ? (
                <span className={styles.currentPage} aria-current="page" key={item}>{item}</span>
              ) : (
                <button type="button" className={styles.pageNumber} key={item}
                  aria-label={`第 ${item} 页`} onClick={() => setPage(item)}>{item}</button>
              )
            ) : (
              <span className={styles.paginationEllipsis} aria-hidden="true" key={item}>…</span>
            ))}
          </div>
          <button type="button" className={styles.paginationEdge} disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页</button>
        </nav>
      )}
    </section>
  );
}
