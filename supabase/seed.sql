-- Seed 使用事务和冲突处理，重复执行不会累加主体或关联记录。
begin;

insert into public.projects (
  id, slug, name, description, long_description,
  status, cover_image, project_url, github_url, is_featured
) values
  ('ai-workspace-agent', 'ai-workspace-agent', 'AI Workspace Agent', '集成知识库、RAG、Agent 和 MCP 的 AI 工作空间。', '这是一个面向个人知识管理与 AI 协作的工作空间，尝试把知识库检索、智能代理和外部工具连接在统一流程中。', 'completed', null, null, null, true),
  ('personal-website', 'personal-website', 'Personal Website', '用于管理个人项目、常用工具和内容的长期数字空间。', '这是一个用于长期管理个人项目、常用工具与学习内容的网站。项目也作为我的 Next.js 和 TypeScript 学习实践。', 'building', null, null, 'https://github.com/dongjinyue/personal-website', true),
  ('learning-playground', 'learning-playground', 'Learning Playground', '用于练习前端和 AI 应用开发的实验项目。', '这是一个用于验证前端概念和 AI 应用想法的实验空间，小型练习会在这里快速实现、观察并持续整理。', 'building', null, null, null, false)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  long_description = excluded.long_description,
  status = excluded.status,
  cover_image = excluded.cover_image,
  project_url = excluded.project_url,
  github_url = excluded.github_url,
  is_featured = excluded.is_featured;

insert into public.tools (id, name, description, url, category, is_favorite) values
  ('github', 'GitHub', '用于保存代码、管理版本和协作开发。', 'https://github.com', '开发', true),
  ('chatgpt', 'ChatGPT', '用于学习、思考和辅助项目开发。', 'https://chatgpt.com', 'AI', true),
  ('vscode', 'Visual Studio Code', '用于编写、阅读和调试代码的开发编辑器。', 'https://code.visualstudio.com', '开发', true),
  ('mdn', 'MDN Web Docs', '查询 HTML、CSS 和 JavaScript Web 标准。', 'https://developer.mozilla.org', '学习', false),
  ('notion', 'Notion', '整理笔记、任务和长期知识内容。', 'https://www.notion.so', '效率', false),
  ('typescript-playground', 'TypeScript Playground', '在浏览器中快速验证 TypeScript 类型和代码。', 'https://www.typescriptlang.org/play', '学习', false)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  url = excluded.url,
  category = excluded.category,
  is_favorite = excluded.is_favorite;

insert into public.tags (name) values
  ('RAG'), ('Agent'), ('MCP'), ('FastAPI'), ('Next.js'), ('TypeScript'),
  ('个人工具'), ('学习'), ('实验'), ('前端'), ('Git'), ('代码'), ('协作'),
  ('AI'), ('开发'), ('编辑器'), ('调试'), ('插件'), ('文档'), ('Web'),
  ('笔记'), ('知识管理'), ('任务'), ('类型')
on conflict (name) do nothing;

-- 没有自然唯一键的子记录按已知主体清理后重建，保证结果幂等。
delete from public.project_highlights
where project_id in ('ai-workspace-agent', 'personal-website', 'learning-playground');

insert into public.project_highlights (project_id, content, sort_order) values
  ('ai-workspace-agent', '使用 RAG 检索个人知识库中的相关内容', 0),
  ('ai-workspace-agent', '通过 Agent 编排多步骤任务与工具调用', 1),
  ('ai-workspace-agent', '使用 MCP 连接可复用的外部能力', 2),
  ('personal-website', '使用 App Router 组织页面与路由', 0),
  ('personal-website', '使用 TypeScript 建立项目和工具数据模型', 1),
  ('personal-website', '通过响应式布局适配桌面与手机设备', 2),
  ('learning-playground', '以小型实验验证新学到的前端知识', 0),
  ('learning-playground', '记录从想法到可运行页面的实现过程', 1),
  ('learning-playground', '为后续独立项目积累可复用经验', 2);

delete from public.project_tags
where project_id in ('ai-workspace-agent', 'personal-website', 'learning-playground');
delete from public.tool_tags
where tool_id in ('github', 'chatgpt', 'vscode', 'mdn', 'notion', 'typescript-playground');

insert into public.project_tags (project_id, tag_id)
select mapping.project_id, tags.id
from (values
  ('ai-workspace-agent', 'RAG'), ('ai-workspace-agent', 'Agent'),
  ('ai-workspace-agent', 'MCP'), ('ai-workspace-agent', 'FastAPI'),
  ('personal-website', 'Next.js'), ('personal-website', 'TypeScript'),
  ('personal-website', '个人工具'), ('learning-playground', '学习'),
  ('learning-playground', '实验'), ('learning-playground', '前端')
) as mapping(project_id, tag_name)
join public.tags on tags.name = mapping.tag_name
on conflict do nothing;

insert into public.tool_tags (tool_id, tag_id)
select mapping.tool_id, tags.id
from (values
  ('github', 'Git'), ('github', '代码'), ('github', '协作'),
  ('chatgpt', 'AI'), ('chatgpt', '学习'), ('chatgpt', '开发'),
  ('vscode', '编辑器'), ('vscode', '调试'), ('vscode', '插件'),
  ('mdn', '文档'), ('mdn', 'Web'), ('mdn', '前端'),
  ('notion', '笔记'), ('notion', '知识管理'), ('notion', '任务'),
  ('typescript-playground', 'TypeScript'), ('typescript-playground', '类型'),
  ('typescript-playground', '实验')
) as mapping(tool_id, tag_name)
join public.tags on tags.name = mapping.tag_name
on conflict do nothing;

commit;
