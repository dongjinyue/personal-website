-- 为英文新闻新增中文翻译字段，采集时翻译后写入，前端优先展示中文。
alter table public.news_articles
  add column title_zh text,
  add column description_zh text;
