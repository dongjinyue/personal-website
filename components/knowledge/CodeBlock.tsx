"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

type Props = {
  code: string;
  language?: string;
};

/**
 * 代码复制是详情页唯一需要浏览器剪贴板权限的区域。
 * 失败时选中完整代码，用户仍可使用系统快捷键手动复制。
 */
export default function CodeBlock({ code, language = "text" }: Props) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const codeRef = useRef<HTMLElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  function scheduleReset() {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  function selectCodeForManualCopy() {
    const codeElement = codeRef.current;
    const selection = window.getSelection();
    if (!codeElement || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(codeElement);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      selectCodeForManualCopy();
      setCopyState("failed");
    }
    scheduleReset();
  }

  const buttonLabel = copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败" : "复制";
  const statusMessage = copyState === "copied"
    ? "代码已复制到剪贴板"
    : copyState === "failed"
      ? "复制失败，请手动选择"
      : "";

  return (
    <figure className="knowledge-code-block">
      <figcaption>
        <span>{language}</span>
        <button type="button" onClick={handleCopy}>{buttonLabel}</button>
      </figcaption>
      <pre><code ref={codeRef} className={`language-${language}`}>{code}</code></pre>
      <span className="knowledge-code-status" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </span>
    </figure>
  );
}
