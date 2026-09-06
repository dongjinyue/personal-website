export const projectStatuses = ["building", "completed", "paused"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export type ProjectFields = {
  slug: string;
  name: string;
  description: string;
  long_description: string;
  status: string;
  project_url: string;
  github_url: string;
  is_featured: boolean;
  hide_from_guests: boolean;
};

export type ProjectErrors = Partial<Record<keyof ProjectFields, string>>;
export type ProjectActionState = { message: string; errors: ProjectErrors; attempt: number };

export function validProjectId(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}

export function validProjectSlug(value: string) {
  return value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** 空网址合法；非空网址只接受不带账号密码的 HTTP/HTTPS 地址。 */
export function normalizeProjectUrl(value: string): string | null {
  if (!value.trim()) return null;
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || url.href.length > 2048) throw new Error("网址不合法");
  return url.href;
}

export function parseProjectForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const values: ProjectFields = {
    slug: text("slug"),
    name: text("name"),
    description: text("description"),
    long_description: text("long_description"),
    status: text("status"),
    project_url: text("project_url"),
    github_url: text("github_url"),
    is_featured: formData.get("is_featured") === "on",
    hide_from_guests: formData.get("hide_from_guests") === "on",
  };
  const errors: ProjectErrors = {};

  if (!validProjectSlug(values.slug)) errors.slug = "请输入不超过 80 字符的小写英文、数字或中间连字符。";
  if (!values.name || values.name.length > 100) errors.name = "名称需为 1～100 个字符。";
  if (!values.description || values.description.length > 500) errors.description = "简介需为 1～500 个字符。";
  if (!values.long_description || values.long_description.length > 5000) {
    errors.long_description = "详细说明需为 1～5000 个字符。";
  }
  if (!projectStatuses.some((status) => status === values.status)) {
    errors.status = "请选择开发中、已完成或暂停。";
  }
  for (const key of ["project_url", "github_url"] as const) {
    try { values[key] = normalizeProjectUrl(values[key]) ?? ""; }
    catch { errors[key] = "请输入有效 HTTP/HTTPS 网址，或留空。"; }
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}
