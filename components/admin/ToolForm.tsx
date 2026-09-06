"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveTool } from "@/app/admin/tools/actions";
import GuardedLink from "@/components/admin/GuardedLink";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import { type ToolActionState, type ToolFields } from "@/lib/tool-form";
import styles from "@/app/admin/admin.module.css";

type Props = {
  mode: "create" | "edit";
  id: string;
  version: string;
  initial: ToolFields;
  returnPage: number;
  categories: string[];
};

export default function ToolForm({ mode, id, version, initial, returnPage, categories }: Props) {
  const [values, setValues] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [editedAtAttempt, setEditedAtAttempt] = useState<Partial<Record<keyof ToolFields, number>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const unsaved = useUnsavedChanges();
  const initialState: ToolActionState = { message: "", errors: {}, attempt: 0 };
  const [state, formAction, pending] = useActionState(
    saveTool.bind(null, mode, id, version),
    initialState,
  );
  const { setFormState } = unsaved;

  const dirty = useMemo(() => (
    values.name !== initial.name
    || values.description !== initial.description
    || values.url !== initial.url
    || values.category !== initial.category
    || values.is_favorite !== initial.is_favorite
    || values.hide_from_guests !== initial.hide_from_guests
  ), [initial, values]);

  useEffect(() => {
    setFormState({ dirty, pending });
    return () => setFormState({ dirty: false, pending: false });
  }, [dirty, pending, setFormState]);

  useEffect(() => {
    if (!state.message) return;
    const target = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid="true"], [data-form-status]',
    );
    target?.focus();
  }, [state.attempt, state.message]);

  const fieldError = (field: keyof ToolFields) => (
    editedAtAttempt[field] === state.attempt ? undefined : state.errors[field]
  );
  const update = <K extends keyof ToolFields>(field: K, value: ToolFields[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setEditedAtAttempt((current) => ({ ...current, [field]: state.attempt }));
  };

  return (
    <form ref={formRef} action={formAction} noValidate aria-busy={pending}
      className={styles.toolForm}>
      <div className={styles.field}>
        <label htmlFor="tool-name">名称（必填）</label>
        <input className={styles.input} id="tool-name" name="name" required maxLength={80}
          value={values.name} onChange={(event) => update("name", event.target.value)}
          aria-invalid={Boolean(fieldError("name"))} aria-describedby="tool-name-error" />
        <p className={styles.fieldError} id="tool-name-error">{fieldError("name")}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="tool-description">简介（必填）</label>
        <textarea className={styles.textarea} id="tool-description" name="description"
          required maxLength={500} rows={expanded ? 12 : 6} value={values.description}
          onChange={(event) => update("description", event.target.value)}
          aria-invalid={Boolean(fieldError("description"))}
          aria-describedby="tool-description-help tool-description-error" />
        <div className={styles.fieldMeta}>
          <span id="tool-description-help">{values.description.length}/500</span>
          <button type="button" className={styles.textButton}
            onClick={() => setExpanded((current) => !current)}>
            {expanded ? "收起输入框" : "展开输入框"}
          </button>
        </div>
        <p className={styles.fieldError} id="tool-description-error">
          {fieldError("description")}
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor="tool-url">网址（必填）</label>
        <input className={styles.input} id="tool-url" name="url" type="url" required
          maxLength={2048} value={values.url}
          onChange={(event) => update("url", event.target.value)}
          aria-invalid={Boolean(fieldError("url"))} aria-describedby="tool-url-error" />
        <p className={styles.fieldError} id="tool-url-error">{fieldError("url")}</p>
      </div>

      <fieldset className={styles.fieldset} aria-describedby="tool-category-help tool-category-error"
        data-invalid={Boolean(fieldError("category"))} tabIndex={-1}>
        <legend>分类（必填）</legend>
        {categories.length > 0 ? (
          <div className={styles.choiceGroup}>
            {categories.map((category) => (
              <label key={category} className={styles.choice}>
                <input type="radio" name="category" value={category}
                  checked={values.category === category}
                  onChange={() => update("category", category)} />
                <span>{category}</span>
              </label>
            ))}
          </div>
        ) : <p className={styles.warning}>还没有分类，请先到“分类管理”新增分类。</p>}
        <p className={styles.hint} id="tool-category-help">选项由后台“分类管理”统一维护。</p>
        <p className={styles.fieldError} id="tool-category-error">{fieldError("category")}</p>
      </fieldset>

      <label className={styles.choice}>
        <input type="checkbox" name="is_favorite" value="on"
          checked={values.is_favorite}
          onChange={(event) => update("is_favorite", event.target.checked)} />
        <span>收藏此工具</span>
      </label>

      <label className={styles.choice}>
        <input type="checkbox" name="hide_from_guests" value="on"
          checked={values.hide_from_guests}
          onChange={(event) => update("hide_from_guests", event.target.checked)} />
        <span>对未登录游客隐藏</span>
      </label>
      <p className={styles.hint}>开启后，已登录用户仍能在工具集和顶部工具菜单中看到。</p>

      <p className={styles.formMessage} data-form-status tabIndex={-1}
        role="status" aria-live="polite">{state.message}</p>
      <div className={styles.formActions}>
        <button type="submit" className={`${styles.button} ${styles.primaryButton}`}
          disabled={pending || categories.length === 0}>
          {pending ? "正在保存…" : mode === "create" ? "创建工具" : "保存修改"}
        </button>
        <GuardedLink className={styles.buttonLink} href={`/admin/tools?page=${returnPage}`}>
          取消
        </GuardedLink>
      </div>
    </form>
  );
}
