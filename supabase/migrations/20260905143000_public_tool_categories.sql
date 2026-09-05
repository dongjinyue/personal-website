-- 分类名称本身属于公开导航信息；写入权限仍只属于管理员。
grant select on public.tool_categories to anon, authenticated;

drop policy if exists "Admin reads tool categories" on public.tool_categories;
create policy "Public reads tool categories" on public.tool_categories
for select to anon, authenticated
using (true);
