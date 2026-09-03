-- Day 13：只允许指定管理员通过 authenticated 角色写入工具表。
alter table public.tools enable row level security;
revoke all privileges on table public.tools from anon, authenticated;
grant select on table public.tools to anon, authenticated;

-- 仅开放表单所需业务列，时间字段继续由数据库维护。
grant insert (id, name, description, url, category, is_favorite)
  on public.tools to authenticated;
grant update (name, description, url, category, is_favorite)
  on public.tools to authenticated;
grant delete on public.tools to authenticated;

create policy "Admin inserts tools" on public.tools
for insert to authenticated
with check ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin updates tools" on public.tools
for update to authenticated
using ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid)
with check ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin deletes tools" on public.tools
for delete to authenticated
using ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);
