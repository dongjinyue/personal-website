"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildKnowledgeSearchUrl,
  parseKnowledgeQuery,
} from "@/lib/knowledge/url";
import styles from "@/app/knowledge/knowledge.module.css";

const SEARCH_DEBOUNCE_MS = 300;

/** URL 是搜索状态的权威来源；本地状态只负责让输入过程立即响应。 */
export default function KnowledgeSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const pendingQueryRef = useRef<string | null>(null);
  const [value, setValue] = useState(initialQuery);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const urlQuery = parseKnowledgeQuery(
      Object.fromEntries(searchParams.entries()),
    ).q;

    // 搜索导航完成后解除保护；较慢的旧响应不能覆盖仍在输入的新内容。
    if (pendingQueryRef.current === urlQuery) {
      pendingQueryRef.current = null;
      return;
    }
    if (pendingQueryRef.current !== null) return;

    setValue(urlQuery);
  }, [searchParams]);

  function cancelPendingNavigation() {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function markPendingQuery(nextValue: string) {
    const normalizedNext = parseKnowledgeQuery({ q: nextValue }).q;
    const currentParams = new URLSearchParams(window.location.search);
    const currentQuery = parseKnowledgeQuery({ q: currentParams.getAll("q") }).q;
    pendingQueryRef.current = normalizedNext === currentQuery ? null : normalizedNext;
  }

  function navigate(nextValue: string) {
    // 执行时读取浏览器当前地址，避免防抖任务持有安排时的旧筛选快照。
    router.replace(buildKnowledgeSearchUrl(window.location.search, nextValue), {
      scroll: false,
    });
  }

  function scheduleNavigation(nextValue: string) {
    cancelPendingNavigation();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      navigate(nextValue);
    }, SEARCH_DEBOUNCE_MS);
  }

  function clearSearch() {
    cancelPendingNavigation();
    markPendingQuery("");
    setValue("");
    navigate("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className={styles.searchField}>
      <label className={styles.searchLabel} htmlFor="knowledge-search">
        搜索笔记
      </label>
      <div className={styles.searchInputWrap}>
        <span className={styles.searchIcon} aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          className={styles.searchInput}
          id="knowledge-search"
          type="search"
          value={value}
          placeholder="搜索标题、正文或标签"
          autoComplete="off"
          onChange={(event) => {
            const nextValue = event.target.value;
            markPendingQuery(nextValue);
            setValue(nextValue);
            if (!composingRef.current) {
              scheduleNavigation(nextValue);
            }
          }}
          onCompositionStart={() => {
            composingRef.current = true;
            cancelPendingNavigation();
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false;
            scheduleNavigation(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            cancelPendingNavigation();
            markPendingQuery(event.currentTarget.value);
            navigate(event.currentTarget.value);
          }}
        />
        {value ? (
          <button
            className={styles.searchClear}
            type="button"
            onClick={clearSearch}
            aria-label="清除搜索内容"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
