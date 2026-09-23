"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildClientKnowledgeUrl,
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
  const [value, setValue] = useState(initialQuery);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function cancelPendingNavigation() {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function navigate(nextValue: string) {
    const current = parseKnowledgeQuery(Object.fromEntries(searchParams.entries()));
    router.replace(buildClientKnowledgeUrl({ ...current, q: nextValue, page: 1 }), {
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
