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
];
