import type { ProjectStatus } from "@/data/projects";

/**
 * 项目状态的统一中文文案。
 * 卡片和详情页共同使用，避免同一状态出现不同叫法。
 */
export const projectStatusLabels: Record<ProjectStatus, string> = {
  building: "开发中",
  completed: "已完成",
  paused: "已暂停",
};
