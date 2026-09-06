-- 统一项目与工具的游客可见性：内容仍然发布，但可只对未登录游客隐藏。
alter table public.projects
  add column hide_from_guests boolean not null default false;

-- 保留旧数据含义：原私有项目改为“仅登录可见”，原公开项目继续对游客展示。
update public.projects
set hide_from_guests = not is_public,
    is_public = true;

alter table public.projects alter column is_public set default true;

grant insert (hide_from_guests) on public.projects to authenticated;
grant update (hide_from_guests) on public.projects to authenticated;

drop policy "Visible projects or admin" on public.projects;
create policy "Published projects by guest visibility" on public.projects
for select to anon, authenticated
using (
  (is_public and (not hide_from_guests or (select auth.uid()) is not null))
  or (select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid
);

create index projects_guest_visibility_idx
  on public.projects (is_public, hide_from_guests, updated_at desc);
