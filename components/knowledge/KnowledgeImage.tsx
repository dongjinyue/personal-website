"use client";

import { useId, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
};

/** 原生 dialog 承担模态语义；组件只补齐焦点放置、恢复和图片失败状态。 */
export default function KnowledgeImage({ src, alt }: Props) {
  const [loadFailed, setLoadFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const imageLabel = alt.trim() || "笔记图片";

  function openImage() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open || loadFailed) return;
    dialog.showModal();
    closeRef.current?.focus();
  }

  function closeImage() {
    dialogRef.current?.close();
  }

  if (loadFailed) {
    return (
      <span className="knowledge-image-missing" role="img" aria-label={`${imageLabel}加载失败`}>
        <strong>图片不可用</strong>
        <span>{imageLabel}</span>
      </span>
    );
  }

  return (
    <figure className="knowledge-image-viewer">
      <button
        ref={triggerRef}
        className="knowledge-image-trigger"
        type="button"
        aria-label={`查看大图：${imageLabel}`}
        onClick={openImage}
      >
        {/* Git 仓库附件没有构建时尺寸，外层固定最小比例以避免加载时跳动。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" onError={() => setLoadFailed(true)} />
      </button>

      <dialog
        ref={dialogRef}
        className="knowledge-image-dialog"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          closeImage();
        }}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className="knowledge-image-dialog-header">
          <p id={titleId}>{imageLabel}</p>
          <button ref={closeRef} type="button" onClick={closeImage}>关闭大图</button>
        </div>
        <div className="knowledge-image-dialog-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} />
        </div>
      </dialog>
    </figure>
  );
}
