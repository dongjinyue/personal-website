import "server-only";

import { getCurrentUser, isAdmin, requireAdmin } from "@/lib/auth/admin";
import { filterVisibleNotes, getDetailForViewer, type KnowledgeDetail, type KnowledgeViewer } from "./access";
import {
  parseKnowledgeQuery,
  queryKnowledge,
  type KnowledgeQuery,
  type KnowledgeQueryInput,
} from "./query";
import {
  getKnowledgeSnapshot,
  getKnowledgeSourceError,
} from "./snapshot";
import { summarizeKnowledgeStatus, type KnowledgeAdminStatus } from "./status";

export type KnowledgeListResult = ReturnType<typeof queryKnowledge> & {
  canonicalQuery: KnowledgeQuery;
  isAdmin: boolean;
  visibleTotal: number;
};

export type { KnowledgeDetail, KnowledgeRelationItem } from "./access";

export type { KnowledgeAdminStatus } from "./status";
export { summarizeKnowledgeStatus } from "./status";

/**
 * 私密读取只信任 Auth 服务的 getUser 结果。登录服务暂时不可用时，
 * 公开页面降级为游客，绝不使用 claims（声明）快速路径放宽可见范围。
 */
export async function getKnowledgeViewerForCurrentUser(): Promise<KnowledgeViewer> {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.id)) return { role: "guest" };
    return { role: "admin", userId: user.id };
  } catch {
    return { role: "guest" };
  }
}

/** 列表读取先确定真实服务端身份，再以同一可见集合产生所有派生数据。 */
export async function getKnowledgeListForCurrentUser(
  rawQuery: KnowledgeQueryInput,
): Promise<KnowledgeListResult> {
  const viewer = await getKnowledgeViewerForCurrentUser();
  const snapshot = await getKnowledgeSnapshot();
  const visibleNotes = filterVisibleNotes(snapshot.notes, viewer);
  const parsed = parseKnowledgeQuery(rawQuery);
  const result = queryKnowledge(visibleNotes, parsed);
  const canonicalQuery: KnowledgeQuery = {
    ...parsed,
    category: result.categories.some((item) => item.name === parsed.category) ? parsed.category : "",
    tag: result.tags.some((item) => item.name === parsed.tag) ? parsed.tag : "",
    page: result.page,
  };

  return {
    ...result,
    canonicalQuery,
    isAdmin: viewer.role === "admin",
    visibleTotal: visibleNotes.length,
  };
}

/** 详情在返回 Markdown 和关系数据之前同样执行唯一的服务端权限判断。 */
export async function getKnowledgeNoteForCurrentUser(slug: string): Promise<KnowledgeDetail | null> {
  const viewer = await getKnowledgeViewerForCurrentUser();
  const snapshot = await getKnowledgeSnapshot();
  return getDetailForViewer(slug, viewer, snapshot.notes);
}

/** 管理状态是敏感读取；即使页面布局已经验证过，也在 Repository 再次鉴权。 */
export async function getKnowledgeStatusForAdmin(): Promise<KnowledgeAdminStatus> {
  await requireAdmin();
  const snapshot = await getKnowledgeSnapshot();
  const sourceError = getKnowledgeSourceError();
  return summarizeKnowledgeStatus(snapshot, sourceError);
}
