-- Day 14：项目可见性与管理员写入权限。
alter table public.projects
  add column is_public boolean not null default false;

alter table public.projects enable row level security;
alter table public.project_highlights enable row level security;
alter table public.project_tags enable row level security;

-- 替换 Day 10 的无条件公开读取策略。
drop policy "Public can read projects" on public.projects;
drop policy "Public can read project highlights" on public.project_highlights;
drop policy "Public can read project tags" on public.project_tags;

revoke all privileges on table public.projects from anon, authenticated;
revoke all privileges on table public.project_highlights from anon, authenticated;
revoke all privileges on table public.project_tags from anon, authenticated;
grant select on public.projects, public.project_highlights, public.project_tags
  to anon, authenticated;

-- 新建时不允许直接公开，使用 is_public 的数据库默认值 false。
grant insert (id, slug, name, description, long_description, status,
  project_url, github_url, is_featured)
  on public.projects to authenticated;
grant update (name, description, long_description, status,
  project_url, github_url, is_featured, is_public)
  on public.projects to authenticated;
grant delete on public.projects to authenticated;

create policy "Visible projects or admin" on public.projects
for select to anon, authenticated
using (is_public or (select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin inserts projects" on public.projects
for insert to authenticated
with check ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin updates projects" on public.projects
for update to authenticated
using ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid)
with check ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin deletes projects" on public.projects
for delete to authenticated
using ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

-- 子表只能读取调用者有权读取的父项目关联内容。
create policy "Readable project highlights" on public.project_highlights
for select to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_highlights.project_id
));

create policy "Readable project tags" on public.project_tags
for select to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_tags.project_id
));
