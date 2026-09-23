import "server-only";

import { getAssetForViewer, type KnowledgeAsset } from "./asset-policy";
import { GitKnowledgeSource } from "./git-source";
import { getKnowledgeViewerForCurrentUser } from "./repository";
import { getKnowledgeSnapshot } from "./snapshot";

export type { KnowledgeAsset } from "./asset-policy";

/** 服务端公开入口：真实鉴权后才取得快照和二进制附件。 */
export async function getKnowledgeAssetForCurrentUser(
  slug: string,
  path: readonly string[],
): Promise<KnowledgeAsset | null> {
  const viewer = await getKnowledgeViewerForCurrentUser();
  const snapshot = await getKnowledgeSnapshot();
  return getAssetForViewer(slug, path, viewer, snapshot, new GitKnowledgeSource());
}
