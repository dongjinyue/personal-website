-- 建立 AI 新闻数据表，支持服务器端定时采集脚本写入和网站动态读取。
create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  source_name text not null,
  description text,
  detail text,
  category text not null default '行业观察' check (category in ('模型动态', 'AI 产品', '开发技术', '行业观察')),
  is_public boolean not null default true,
  hide_from_guests boolean not null default false,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 采集脚本按 source_url 去重；手动创建的新闻可以不填来源链接。
create unique index news_articles_source_url_key
  on public.news_articles(source_url) where source_url is not null;

create index news_articles_public_updated_idx
  on public.news_articles(is_public, published_at desc);

create index news_articles_category_idx
  on public.news_articles(category);

-- 由数据库统一维护更新时间，与项目和工具保持一致。
create trigger news_articles_set_updated_at
  before update on public.news_articles
  for each row execute function public.set_updated_at();

-- 默认拒绝所有访问，再通过策略逐条开放。
alter table public.news_articles enable row level security;

-- 游客只能读取已发布且对游客可见的新闻；登录用户可以读取已发布的全部新闻；管理员可以读取所有新闻。
create policy "Visible news by guest visibility" on public.news_articles
  for select to anon, authenticated
  using (
    (is_public and (not hide_from_guests or (select auth.uid()) is not null))
    or (select auth.uid()) = 'e640aac4-933c-4c59-b28b-12ec7561bceb'::uuid
  );

-- 已登录用户可以新增新闻；采集脚本使用 service_role 密钥绕过 RLS 直接写入。
grant insert on public.news_articles to authenticated;

-- 管理员可以修改和删除新闻。
grant update, delete on public.news_articles to authenticated;
