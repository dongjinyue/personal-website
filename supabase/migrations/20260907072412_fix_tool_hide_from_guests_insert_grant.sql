-- 工具创建表单会同时写入游客可见性，因此新增操作也需要该列权限。
-- 行级安全策略仍只允许指定管理员新增工具，此处仅补齐缺失的列权限。
grant insert (hide_from_guests)
  on public.tools to authenticated;
