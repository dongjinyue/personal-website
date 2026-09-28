-- Seed 使用事务和冲突处理，重复执行不会累加主体或关联记录。
begin;

insert into public.projects (
  id, slug, name, description, long_description,
  status, cover_image, project_url, github_url, is_featured
) values
  ('ai-workspace-agent', 'ai-workspace-agent', 'AI Workspace Agent', '面向知识问答与 AI 协作的全栈工作空间，集成个人文档 RAG、LangGraph Agent 与真实 MCP 工具调用。', '这是一个围绕知识问答与 AI 协作构建的全栈工作空间。访客可以上传 TXT、Markdown、DOCX、PDF 文档建立仅自己可访问的个人知识库，再通过 RAG 检索相关资料；LangGraph Agent 会根据问题在知识检索、计算、任务技能和 MCP 工具之间进行有限步数的编排。系统由 React + Vite 前端、FastAPI 服务、SQLite 会话存储与 Chroma 向量库组成，并把输入校验、工具白名单、调用限额和 Docker 安全部署纳入完整流程。', 'completed', null, 'https://agent.dongjinyue.cn', null, true),
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
  ('ai-workspace-agent', 'React 19 + Vite 前端连接 FastAPI 后端；SQLite 持久化会话与执行轨迹，Chroma 保存知识向量。', 0),
  ('ai-workspace-agent', '访客可导入 TXT、Markdown、DOCX、PDF 建立个人知识库；检索按访客身份隔离，扫描版 PDF 支持离线 OCR（最多 30 页）。', 1),
  ('ai-workspace-agent', 'LangGraph Agent 组合知识检索、计算器、任务技能和工具注册表处理多步问题，每轮最多 5 步，并单独保存不含隐藏思维链的执行轨迹。', 2),
  ('ai-workspace-agent', 'MCP 客户端真实执行初始化、工具发现和调用；服务端通过工具白名单控制能力，MCP 子进程不会继承模型 API 密钥。', 3),
  ('ai-workspace-agent', '公开体验设有访客每日 10 次问答额度及 IP、上传频率和文件大小限制，并配合签名访客身份、提示词注入检测和非 root Docker 部署。', 4),
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
