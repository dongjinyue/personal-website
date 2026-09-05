-- 工具分类由管理员自由维护，不再限制为最初的四个固定值。
alter table public.tools
  drop constraint if exists tools_category_check;

-- 保留基础数据质量约束，避免空分类或异常长文本进入导航与筛选器。
alter table public.tools
  add constraint tools_category_not_blank
  check (char_length(btrim(category)) between 1 and 40);
