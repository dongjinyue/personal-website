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

// 每篇笔记需要启动一次 Git 读取；限制并发可避免大型知识库瞬间耗尽进程资源。
const KNOWLEDGE_READ_CONCURRENCY = 4;

function freezeNote(note: KnowledgeNoteSource): KnowledgeNoteSource {
  return Object.freeze({ ...note, tags: Object.freeze([...note.tags]) as string[] });
}

function freezeDiagnostic(diagnostic: KnowledgeDiagnostic): KnowledgeDiagnostic {
  return Object.freeze({ ...diagnostic });
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  transform: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await transform(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function buildSnapshot(
  source: KnowledgeSource,
  commit: string,
): Promise<KnowledgeSnapshot> {
  const files = (await source.listFiles(commit, "notes"))
    .filter((filePath) => filePath.startsWith("notes/") && filePath.endsWith(".md"))
    .sort();
  const parsed = await mapWithConcurrency(
    files,
    KNOWLEDGE_READ_CONCURRENCY,
    async (filePath) => parseKnowledgeNote(filePath, await source.readText(commit, filePath)),
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
  let latestStatusGeneration = 0;
  const inFlightBuilds = new Map<
    string,
    { promise: Promise<KnowledgeSnapshot>; acceptedGeneration: number }
  >();

  return {
    async getSnapshot(): Promise<KnowledgeSnapshot> {
      const requestGeneration = ++latestStatusGeneration;
      let commit: string;
      try {
        commit = await source.getHead();
      } catch {
        if (requestGeneration === latestStatusGeneration) {
          sourceError = lastSuccessfulSnapshot ? FALLBACK_SOURCE_ERROR : INITIAL_SOURCE_ERROR;
        }
        if (lastSuccessfulSnapshot) return lastSuccessfulSnapshot;
        throw new Error(INITIAL_SOURCE_ERROR.message);
      }

      if (lastSuccessfulSnapshot?.version === commit) {
        if (requestGeneration === latestStatusGeneration) sourceError = null;
        return lastSuccessfulSnapshot;
      }

      let buildRecord = inFlightBuilds.get(commit);
      if (buildRecord) {
        if (requestGeneration === latestStatusGeneration) {
          buildRecord.acceptedGeneration = requestGeneration;
        }
        // 已有可用快照时，请求不阻塞在刷新上；最先触发刷新的请求负责等待和替换。
        if (lastSuccessfulSnapshot) return lastSuccessfulSnapshot;
      } else {
        buildRecord = {
          promise: buildSnapshot(source, commit),
          acceptedGeneration: requestGeneration,
        };
        inFlightBuilds.set(commit, buildRecord);
      }

      try {
        const nextSnapshot = await buildRecord.promise;
        // 只有最新成功状态认可的构建可以替换快照，HEAD 失败也会使旧构建失效。
        if (buildRecord.acceptedGeneration === latestStatusGeneration) {
          lastSuccessfulSnapshot = nextSnapshot;
          sourceError = null;
        }
        return nextSnapshot;
      } catch {
        if (buildRecord.acceptedGeneration === latestStatusGeneration) {
          sourceError = lastSuccessfulSnapshot ? FALLBACK_SOURCE_ERROR : INITIAL_SOURCE_ERROR;
        }
        if (lastSuccessfulSnapshot) return lastSuccessfulSnapshot;
        throw new Error(INITIAL_SOURCE_ERROR.message);
      } finally {
        if (inFlightBuilds.get(commit) === buildRecord) inFlightBuilds.delete(commit);
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
