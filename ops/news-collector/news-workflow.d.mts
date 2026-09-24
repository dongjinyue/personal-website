export type NewsCandidate = { source_url: string };

export function persistNewArticles<T extends NewsCandidate>(
  candidates: T[],
  loadExistingUrls: (sourceUrls: string[]) => Promise<string[]>,
  insertArticles: (articles: T[]) => Promise<number>,
): Promise<{ inserted: number; skipped: number }>;
