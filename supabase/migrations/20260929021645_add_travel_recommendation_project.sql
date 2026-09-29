-- 按项目 README（说明文档）新增公开项目资料；重复应用时更新主体并重建关联内容。
begin;

insert into public.tags (name) values
  ('Vue'), ('Vite'), ('Express'), ('LangChain'), ('SSE'), ('移动端')
on conflict (name) do nothing;

insert into public.projects (
  id, slug, name, description, long_description,
  status, cover_image, project_url, github_url, is_featured,
  is_public, hide_from_guests
) values (
  'travel-recommendation-fullstack',
  'travel-recommendation-fullstack',
  'AI 旅游推荐全栈项目',
  '面向移动端的 AI 旅游规划应用，根据目的地、预算和旅行天数生成逐日行程，并提供流式 AI 旅游问答。',
  '这是一个面向移动端的 AI 旅游规划应用。前端使用 Vue 3 + Vite，服务端使用 Node.js + Express 和 LangChain，通过 SSE 流式返回旅游规划和问答结果，并支持通义千问、DeepSeek、硅基流动等兼容 OpenAI 接口的模型。当前项目不使用数据库，行程与聊天记录不会持久化；个人中心为前端演示页面。',
  'completed',
  null,
  'https://travel.dongjinyue.cn',
  'https://github.com/dongjinyue/travel-recommendation-fullstack',
  false,
  true,
  false
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  long_description = excluded.long_description,
  status = excluded.status,
  cover_image = excluded.cover_image,
  project_url = excluded.project_url,
  github_url = excluded.github_url,
  is_featured = excluded.is_featured,
  is_public = excluded.is_public,
  hide_from_guests = excluded.hide_from_guests;

delete from public.project_highlights
where project_id = 'travel-recommendation-fullstack';

insert into public.project_highlights (project_id, content, sort_order) values
  ('travel-recommendation-fullstack', 'Vue 3 + Vite 构建移动端界面，包含首页、行程详情、AI 助手和个人中心页面。', 0),
  ('travel-recommendation-fullstack', '根据目的地、预算和旅行天数生成每日早中晚行程、景点介绍、交通建议、预算拆分与注意事项。', 1),
  ('travel-recommendation-fullstack', 'Node.js + Express 服务端结合 LangChain 调用通义千问、DeepSeek 和硅基流动等兼容 OpenAI 接口的模型。', 2),
  ('travel-recommendation-fullstack', '旅游规划和问答通过 SSE（流式响应）逐步展示 AI 输出，保留实时交互体验。', 3),
  ('travel-recommendation-fullstack', '当前没有真实账号体系和数据库，行程与聊天记录不会持久保存，个人中心为前端演示页面。', 4);

delete from public.project_tags
where project_id = 'travel-recommendation-fullstack';

insert into public.project_tags (project_id, tag_id)
select 'travel-recommendation-fullstack', tags.id
from public.tags
where tags.name in ('Vue', 'Vite', 'Express', 'LangChain', 'SSE', '移动端', 'AI')
on conflict do nothing;

commit;
