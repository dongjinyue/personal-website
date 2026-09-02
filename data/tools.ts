export type ToolCategory = "AI" | "开发" | "学习" | "效率";

/**
 * 工具数据模型。
 * category 用于分类，tags 为后续搜索和筛选做准备。
 */
export type Tool = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: ToolCategory;
  tags: string[];
  isFavorite: boolean;
};

export const tools: Tool[] = [
  {
    id: "github",
    name: "GitHub",
    description: "用于保存代码、管理版本和协作开发。",
    url: "https://github.com",
    category: "开发",
    tags: ["Git", "代码", "协作"],
    isFavorite: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "用于学习、思考和辅助项目开发。",
    url: "https://chatgpt.com",
    category: "AI",
    tags: ["AI", "学习", "开发"],
    isFavorite: true,
  },
  {
    id: "vscode",
    name: "Visual Studio Code",
    description: "用于编写、阅读和调试代码的开发编辑器。",
    url: "https://code.visualstudio.com",
    category: "开发",
    tags: ["编辑器", "调试", "插件"],
    isFavorite: true,
  },
  {
    id: "mdn",
    name: "MDN Web Docs",
    description: "查询 HTML、CSS 和 JavaScript Web 标准。",
    url: "https://developer.mozilla.org",
    category: "学习",
    tags: ["文档", "Web", "前端"],
    isFavorite: false,
  },
  {
    id: "notion",
    name: "Notion",
    description: "整理笔记、任务和长期知识内容。",
    url: "https://www.notion.so",
    category: "效率",
    tags: ["笔记", "知识管理", "任务"],
    isFavorite: false,
  },
  {
    id: "typescript-playground",
    name: "TypeScript Playground",
    description: "在浏览器中快速验证 TypeScript 类型和代码。",
    url: "https://www.typescriptlang.org/play",
    category: "学习",
    tags: ["TypeScript", "类型", "实验"],
    isFavorite: false,
  },
];
