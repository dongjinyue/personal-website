export type ProjectStatus = "building" | "completed" | "paused";

/**
 * 项目数据模型。
 * 当前使用本地静态数据，后续可以迁移到数据库。
 */
export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  highlights: string[];
  status: ProjectStatus;
  tags: string[];
  coverImage?: string;
  projectUrl?: string;
  githubUrl?: string;
  isFeatured: boolean;
};

export const projects: Project[] = [
  {
    id: "ai-workspace-agent",
    slug: "ai-workspace-agent",
    name: "AI Workspace Agent",
    description: "面向知识问答与 AI 协作的全栈工作空间，集成个人文档 RAG、LangGraph Agent 与真实 MCP 工具调用。",
    longDescription: "这是一个围绕知识问答与 AI 协作构建的全栈工作空间。访客可以上传 TXT、Markdown、DOCX、PDF 文档建立仅自己可访问的个人知识库，再通过 RAG 检索相关资料；LangGraph Agent 会根据问题在知识检索、计算、任务技能和 MCP 工具之间进行有限步数的编排。系统由 React + Vite 前端、FastAPI 服务、SQLite 会话存储与 Chroma 向量库组成，并把输入校验、工具白名单、调用限额和 Docker 安全部署纳入完整流程。",
    highlights: [
      "React 19 + Vite 前端连接 FastAPI 后端；SQLite 持久化会话与执行轨迹，Chroma 保存知识向量。",
      "访客可导入 TXT、Markdown、DOCX、PDF 建立个人知识库；检索按访客身份隔离，扫描版 PDF 支持离线 OCR（最多 30 页）。",
      "LangGraph Agent 组合知识检索、计算器、任务技能和工具注册表处理多步问题，每轮最多 5 步，并单独保存不含隐藏思维链的执行轨迹。",
      "MCP 客户端真实执行初始化、工具发现和调用；服务端通过工具白名单控制能力，MCP 子进程不会继承模型 API 密钥。",
      "公开体验设有访客每日 10 次问答额度及 IP、上传频率和文件大小限制，并配合签名访客身份、提示词注入检测和非 root Docker 部署。",
    ],
    status: "completed",
    tags: ["RAG", "Agent", "MCP", "FastAPI"],
    projectUrl: "https://agent.dongjinyue.cn",
    isFeatured: true,
  },
  {
    id: "personal-website",
    slug: "personal-website",
    name: "Personal Website",
    description: "用于管理个人项目、常用工具和内容的长期数字空间。",
    longDescription: "这是一个用于长期管理个人项目、常用工具与学习内容的网站。项目也作为我的 Next.js 和 TypeScript 学习实践。",
    highlights: [
      "使用 App Router 组织页面与路由",
      "使用 TypeScript 建立项目和工具数据模型",
      "通过响应式布局适配桌面与手机设备",
    ],
    status: "building",
    tags: ["Next.js", "TypeScript", "个人工具"],
    githubUrl: "https://github.com/dongjinyue/personal-website",
    isFeatured: true,
  },
  {
    id: "travel-recommendation-fullstack",
    slug: "travel-recommendation-fullstack",
    name: "AI 旅游推荐全栈项目",
    description: "面向移动端的 AI 旅游规划应用，根据目的地、预算和旅行天数生成逐日行程，并提供流式 AI 旅游问答。",
    longDescription: "这是一个面向移动端的 AI 旅游规划应用。前端使用 Vue 3 + Vite，服务端使用 Node.js + Express 和 LangChain，通过 SSE 流式返回旅游规划和问答结果，并支持通义千问、DeepSeek、硅基流动等兼容 OpenAI 接口的模型。当前项目不使用数据库，行程与聊天记录不会持久化；个人中心为前端演示页面。",
    highlights: [
      "Vue 3 + Vite 构建移动端界面，包含首页、行程详情、AI 助手和个人中心页面。",
      "根据目的地、预算和旅行天数生成每日早中晚行程、景点介绍、交通建议、预算拆分与注意事项。",
      "Node.js + Express 服务端结合 LangChain 调用通义千问、DeepSeek 和硅基流动等兼容 OpenAI 接口的模型。",
      "旅游规划和问答通过 SSE（流式响应）逐步展示 AI 输出，保留实时交互体验。",
      "当前没有真实账号体系和数据库，行程与聊天记录不会持久保存，个人中心为前端演示页面。",
    ],
    status: "completed",
    tags: ["Vue", "Vite", "Express", "LangChain", "SSE", "移动端", "AI"],
    projectUrl: "https://travel.dongjinyue.cn",
    githubUrl: "https://github.com/dongjinyue/travel-recommendation-fullstack",
    isFeatured: false,
  },
  {
    id: "learning-playground",
    slug: "learning-playground",
    name: "Learning Playground",
    description: "用于练习前端和 AI 应用开发的实验项目。",
    longDescription: "这是一个用于验证前端概念和 AI 应用想法的实验空间，小型练习会在这里快速实现、观察并持续整理。",
    highlights: [
      "以小型实验验证新学到的前端知识",
      "记录从想法到可运行页面的实现过程",
      "为后续独立项目积累可复用经验",
    ],
    status: "building",
    tags: ["学习", "实验", "前端"],
    isFeatured: false,
  },
];
