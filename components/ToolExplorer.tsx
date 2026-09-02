"use client";

import { useRef, useState } from "react";
import type { Tool, ToolCategory } from "@/data/tools";
import ToolCard from "./ToolCard";
import styles from "./ToolExplorer.module.css";

type ToolExplorerProps = {
  tools: Tool[];
};

type ToolFilterCategory = "全部" | ToolCategory;

const categories: ToolFilterCategory[] = ["全部", "AI", "开发", "学习", "效率"];

export default function ToolExplorer({ tools }: ToolExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolFilterCategory>("全部");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  function clearSearch() {
    setQuery("");
    searchInputRef.current?.focus();
  }

  function resetFilters() {
    setQuery("");
    setActiveCategory("全部");
    searchInputRef.current?.focus();
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
            onChange={(event) => setQuery(event.target.value)}
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
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.resultCount} aria-live="polite">
        找到 {filteredTools.length} 个工具
      </p>

      {filteredTools.length > 0 ? (
        <div className={styles.grid} aria-label="工具搜索结果">
          {filteredTools.map((tool) => (
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
    </section>
  );
}
