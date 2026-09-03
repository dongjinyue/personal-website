"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveProject } from "@/app/admin/projects/actions";
import GuardedLink from "@/components/admin/GuardedLink";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import { projectStatusLabels } from "@/lib/project-status";
import { projectStatuses, type ProjectActionState, type ProjectFields } from "@/lib/project-form";
import styles from "@/app/admin/admin.module.css";

type Props = { mode: "create" | "edit"; id: string; version: string;
  initial: ProjectFields; returnPage: number; isPublic: boolean };

export default function ProjectForm({ mode, id, version, initial, returnPage, isPublic }: Props) {
  const [values, setValues] = useState(initial);
  const [edited, setEdited] = useState<Partial<Record<keyof ProjectFields, number>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { setFormState } = useUnsavedChanges();
  const initialState: ProjectActionState = { message: "", errors: {}, attempt: 0 };
  const [state, formAction, pending] = useActionState(saveProject.bind(null, mode, id, version), initialState);
  const dirty = useMemo(() => Object.keys(initial).some((key) =>
    values[key as keyof ProjectFields] !== initial[key as keyof ProjectFields]), [initial, values]);

  useEffect(() => {
    setFormState({ dirty, pending });
    return () => setFormState({ dirty: false, pending: false });
  }, [dirty, pending, setFormState]);
  useEffect(() => {
    if (!state.message) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"], [data-form-status]')?.focus();
  }, [state.attempt, state.message]);

  const error = (field: keyof ProjectFields) => edited[field] === state.attempt ? undefined : state.errors[field];
  const update = <K extends keyof ProjectFields>(field: K, value: ProjectFields[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setEdited((current) => ({ ...current, [field]: state.attempt }));
  };
  const textField = (field: "slug" | "name" | "project_url" | "github_url", label: string,
    options: { required?: boolean; maxLength: number; type?: "url"; readOnly?: boolean }) => (
    <div className={styles.field}>
      <label htmlFor={`project-${field}`}>{label}</label>
      <input className={styles.input} id={`project-${field}`} name={field}
        value={values[field]} required={options.required} maxLength={options.maxLength}
        type={options.type} readOnly={options.readOnly}
        onChange={(event) => update(field, event.target.value)}
        aria-invalid={Boolean(error(field))} aria-describedby={`project-${field}-error`} />
      <p className={styles.fieldError} id={`project-${field}-error`}>{error(field)}</p>
    </div>
  );

  return <form ref={formRef} action={formAction} noValidate aria-busy={pending} className={styles.toolForm}>
    {textField("slug", "网址短名（必填）", { required: true, maxLength: 80, readOnly: mode === "edit" })}
    {textField("name", "名称（必填）", { required: true, maxLength: 100 })}
    {(["description", "long_description"] as const).map((field) => {
      const max = field === "description" ? 500 : 5000;
      return <div className={styles.field} key={field}>
        <label htmlFor={`project-${field}`}>{field === "description" ? "简介（必填）" : "详细说明（必填）"}</label>
        <textarea className={styles.textarea} id={`project-${field}`} name={field} required
          rows={field === "description" ? 5 : 10} maxLength={max} value={values[field]}
          onChange={(event) => update(field, event.target.value)} aria-invalid={Boolean(error(field))}
          aria-describedby={`project-${field}-count project-${field}-error`} />
        <span className={styles.hint} id={`project-${field}-count`}>{values[field].length}/{max}</span>
        <p className={styles.fieldError} id={`project-${field}-error`}>{error(field)}</p>
      </div>;
    })}
    <fieldset className={styles.fieldset} data-invalid={Boolean(error("status"))} tabIndex={-1}>
      <legend>进度状态（必填）</legend><div className={styles.choiceGroup}>
        {projectStatuses.map((status) => <label className={styles.choice} key={status}>
          <input type="radio" name="status" value={status} checked={values.status === status}
            onChange={() => update("status", status)} /><span>{projectStatusLabels[status]}</span>
        </label>)}
      </div><p className={styles.fieldError}>{error("status")}</p>
    </fieldset>
    {textField("project_url", "项目网址（可选）", { maxLength: 2048, type: "url" })}
    {textField("github_url", "代码仓库网址（可选）", { maxLength: 2048, type: "url" })}
    <label className={styles.choice}><input type="checkbox" name="is_featured" checked={values.is_featured}
      onChange={(event) => update("is_featured", event.target.checked)} /><span>在首页推荐（仅公开项目会展示）</span></label>
    {mode === "edit" && isPublic && <p className={styles.warning}>此项目已公开，保存后访客会立即看到更新内容。</p>}
    <p className={styles.formMessage} data-form-status tabIndex={-1} role="status" aria-live="polite">{state.message}</p>
    <div className={styles.formActions}>
      <button className={`${styles.button} ${styles.primaryButton}`} disabled={pending}>
        {pending ? "正在保存…" : mode === "create" ? "创建私有项目" : "保存修改"}
      </button>
      <GuardedLink className={styles.link} href={`/admin/projects?page=${returnPage}`}>取消并返回项目列表</GuardedLink>
    </div>
  </form>;
}
