import { parseKnowledgeNote } from "./frontmatter";
import { GitKnowledgeSource } from "./git-source";
import type { KnowledgeDiagnostic, KnowledgeNoteSource } from "./types";

export type KnowledgeSource = {
  getHead(): Promise<string>;
  listFiles(commit: string, prefix: string): Promise<string[]>;
  readText(commit: string, path: string): Promise<string>;
  readBinary(commit: string, path: string): Promise<Buffer>;
};

export type KnowledgeSnapshot = {
  version: string;
  generatedAt: string;
  notes: readonly KnowledgeNoteSource[];
  diagnostics: readonly KnowledgeDiagnostic[];
};

export type KnowledgeSnapshotStore = {
  getSnapshot(): Promise<KnowledgeSnapshot>;
  getSourceError(): KnowledgeDiagnostic | null;
};

const FALLBACK_SOURCE_ERROR: Readonly<KnowledgeDiagnostic> = Object.freeze({
  path: "knowledge-source",
  code: "source-error",
  message: "知识库新版本读取失败，当前继续使用上一个成功版本。",
});

const INITIAL_SOURCE_ERROR: Readonly<KnowledgeDiagnostic> = Object.freeze({
  path: "knowledge-source",
  code: "source-error",
  message: "知识库快照构建失败，请检查内容仓库状态。",
});

function freezeNote(note: KnowledgeNoteSource): KnowledgeNoteSource {
  return Object.freeze({ ...note, tags: Object.freeze([...note.tags]) as string[] });
}

function freezeDiagnostic(diagnostic: KnowledgeDiagnostic): KnowledgeDiagnostic {
  return Object.freeze({ ...diagnostic });
}

async function buildSnapshot(
  source: KnowledgeSource,
  commit: string,
): Promise<KnowledgeSnapshot> {
  const files = (await source.listFiles(commit, "notes"))
    .filter((filePath) => filePath.startsWith("notes/") && filePath.endsWith(".md"))
    .sort();
  const parsed = await Promise.all(
    files.map(async (filePath) => parseKnowledgeNote(filePath, await source.readText(commit, filePath))),
  );

  const diagnostics: KnowledgeDiagnostic[] = [];
  const candidates: KnowledgeNoteSource[] = [];
  for (const result of parsed) {
    if (result.ok) candidates.push(result.note);
    else diagnostics.push(result.diagnostic);
  }

  const pathsBySlug = new Map<string, string[]>();
  for (const note of candidates) {
    const paths = pathsBySlug.get(note.slug) ?? [];
    paths.push(note.path);
    pathsBySlug.set(note.slug, paths);
  }

  const duplicateSlugs = new Set(
    [...pathsBySlug.entries()].filter(([, paths]) => paths.length > 1).map(([slug]) => slug),
  );
  const notes = candidates.filter((note) => !duplicateSlugs.has(note.slug));
  for (const note of candidates) {
    if (duplicateSlugs.has(note.slug)) {
      diagnostics.push({
        path: note.path,
        code: "duplicate-slug",
        message: `slug “${note.slug}” 被多篇笔记重复使用`,
      });
    }
  }

  diagnostics.sort((left, right) => left.path.localeCompare(right.path));
  return Object.freeze({
    version: commit,
    generatedAt: new Date().toISOString(),
    notes: Object.freeze(notes.map(freezeNote)),
    diagnostics: Object.freeze(diagnostics.map(freezeDiagnostic)),
  });
}

/** 创建独立快照存储，便于生产注入内容源，也让测试无需暴露重置钩子。 */
export function createKnowledgeSnapshotStore(source: KnowledgeSource): KnowledgeSnapshotStore {
  let lastSuccessfulSnapshot: KnowledgeSnapshot | null = null;
  let sourceError: KnowledgeDiagnostic | null = null;
  let latestRequestedCommit: string | null = null;
  const inFlightBuilds = new Map<string, Promise<KnowledgeSnapshot>>();

  return {
    async getSnapshot(): Promise<KnowledgeSnapshot> {
      let commit: string;
      try {
        commit = await source.getHead();
      } catch {
        sourceError = lastSuccessfulSnapshot ? FALLBACK_SOURCE_ERROR : INITIAL_SOURCE_ERROR;
        if (lastSuccessfulSnapshot) return lastSuccessfulSnapshot;
        throw new Error(INITIAL_SOURCE_ERROR.message);
      }

      latestRequestedCommit = commit;
      if (lastSuccessfulSnapshot?.version === commit) {
        sourceError = null;
        return lastSuccessfulSnapshot;
      }

      let build = inFlightBuilds.get(commit);
      if (!build) {
        build = buildSnapshot(source, commit);
        inFlightBuilds.set(commit, build);
      }

      try {
        const nextSnapshot = await build;
        // 较旧请求可能晚于新提交完成；只有最近观察到的提交可以替换全局成功快照。
        if (latestRequestedCommit === commit) {
          lastSuccessfulSnapshot = nextSnapshot;
          sourceError = null;
        }
        return nextSnapshot;
      } catch {
        if (latestRequestedCommit === commit) {
          sourceError = lastSuccessfulSnapshot ? FALLBACK_SOURCE_ERROR : INITIAL_SOURCE_ERROR;
        }
        if (lastSuccessfulSnapshot) return lastSuccessfulSnapshot;
        throw new Error(INITIAL_SOURCE_ERROR.message);
      } finally {
        if (inFlightBuilds.get(commit) === build) inFlightBuilds.delete(commit);
      }
    },

    getSourceError(): KnowledgeDiagnostic | null {
      return sourceError;
    },
  };
}

const defaultStore = createKnowledgeSnapshotStore(new GitKnowledgeSource());

export function getKnowledgeSnapshot(): Promise<KnowledgeSnapshot> {
  return defaultStore.getSnapshot();
}

/** 仅供已通过管理员鉴权的数据访问层读取最近一次内容源错误。 */
export function getKnowledgeSourceError(): KnowledgeDiagnostic | null {
  return defaultStore.getSourceError();
}
