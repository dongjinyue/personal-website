-- 新闻管理操作使用用户会话访问 Supabase；由数据库再次限制为站点管理员。
create policy "Admin inserts news" on public.news_articles
  for insert to authenticated
  with check ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin updates news" on public.news_articles
  for update to authenticated
  using ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid)
  with check ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);

create policy "Admin deletes news" on public.news_articles
  for delete to authenticated
  using ((select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid);
