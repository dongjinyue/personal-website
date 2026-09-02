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
    description: "集成知识库、RAG、Agent 和 MCP 的 AI 工作空间。",
    longDescription: "这是一个面向个人知识管理与 AI 协作的工作空间，尝试把知识库检索、智能代理和外部工具连接在统一流程中。",
    highlights: [
      "使用 RAG 检索个人知识库中的相关内容",
      "通过 Agent 编排多步骤任务与工具调用",
      "使用 MCP 连接可复用的外部能力",
    ],
    status: "completed",
    tags: ["RAG", "Agent", "MCP", "FastAPI"],
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
