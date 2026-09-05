-- 为工具增加公开/隐藏控制；现有工具保持公开，新建工具默认隐藏。
alter table public.tools
  add column is_public boolean not null default true;

alter table public.tools
  alter column is_public set default false;

create index tools_public_updated_idx
  on public.tools(is_public, updated_at desc);

drop policy "Public can read tools" on public.tools;
create policy "Visible tools or admin" on public.tools
for select to anon, authenticated
using (
  is_public
  or (select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid
);

-- 新建工具使用数据库默认值 false；公开状态只能由管理员后续修改。
grant update (is_public) on public.tools to authenticated;

drop policy "Public can read tool tags" on public.tool_tags;
create policy "Readable tool tags" on public.tool_tags
for select to anon, authenticated
using (exists (
  select 1 from public.tools t
  where t.id = tool_tags.tool_id
));
