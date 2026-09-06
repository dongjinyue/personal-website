export type ToolFields = {
  name: string;
  description: string;
  url: string;
  category: string;
  is_favorite: boolean;
  hide_from_guests: boolean;
};

export type FieldErrors = Partial<Record<keyof ToolFields, string>>;

export type ToolActionState = {
  message: string;
  errors: FieldErrors;
  attempt: number;
};

// 允许已有的可读 ID，以及新生成的 UUID。
export function validToolId(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}

/** 类型断言不会验证用户输入，必须做实际检查。 */
export function parseToolForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };

  const values: ToolFields = {
    name: text("name"),
    description: text("description"),
    url: text("url"),
    category: text("category"),
    is_favorite: formData.get("is_favorite") === "on",
    hide_from_guests: formData.get("hide_from_guests") === "on",
  };
  const errors: FieldErrors = {};

  if (!values.name || values.name.length > 80) {
    errors.name = "请输入 1～80 个字符的名称。";
  }
  if (!values.description || values.description.length > 500) {
    errors.description = "请输入 1～500 个字符的简介。";
  }
  if (!values.category || values.category.length > 40) {
    errors.category = "请输入 1～40 个字符的分类名称。";
  }

  try {
    const url = new URL(values.url);
    if (
      !["http:", "https:"].includes(url.protocol)
      || url.username
      || url.password
      || values.url.length > 2048
    ) {
      throw new Error("invalid");
    }
    values.url = url.href;
  } catch {
    errors.url = "请输入有效的 http/https 网址，不包含账号密码，最多 2048 个字符。";
  }

  return { values, errors, valid: Object.keys(errors).length === 0 };
}
