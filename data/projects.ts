/**
 * 项目数据模型。
 * 当前使用本地静态数据，后续可以迁移到数据库。
 */
export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
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
    status: "completed",
    tags: ["RAG", "Agent", "MCP", "FastAPI"],
    isFeatured: true,
  },
  {
    id: "personal-website",
    slug: "personal-website",
    name: "Personal Website",
    description: "用于管理个人项目、常用工具和内容的长期数字空间。",
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
    status: "building",
    tags: ["学习", "实验", "前端"],
    isFeatured: false,
  },
];
export type ProjectStatus = "building" | "completed" | "paused";
