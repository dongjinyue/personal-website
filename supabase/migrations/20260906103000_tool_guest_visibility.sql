-- 工具的“隐藏”只针对未登录游客；登录用户仍可在工具集看到。
alter table public.tools
  add column hide_from_guests boolean not null default false;

-- 将旧的“隐藏”状态迁移为“仅登录可见”，避免已有工具继续完全不可见。
update public.tools
set hide_from_guests = not is_public,
    is_public = true;

alter table public.tools
  alter column is_public set default true;

create index tools_guest_visibility_updated_idx
  on public.tools(hide_from_guests, updated_at desc);

drop policy "Visible tools or admin" on public.tools;
create policy "Published tools by audience or admin" on public.tools
for select to anon, authenticated
using (
  (is_public and (not hide_from_guests or (select auth.uid()) is not null))
  or (select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid
);

grant update (hide_from_guests) on public.tools to authenticated;
