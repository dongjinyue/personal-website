export type CollectedNewsArticle = {
  title: string;
  title_zh: string | null;
  source_url: string;
  source_name: string;
  description: string | null;
  description_zh: string | null;
  detail: null;
  category: string;
  published_at: string | null;
  _source_lang: string;
};

export function collectLatestNews(options?: {
  fetchImpl?: typeof fetch;
  now?: number;
  translate?: (articles: CollectedNewsArticle[], fetchImpl?: typeof fetch) => Promise<number>;
  log?: (message: string) => void;
}): Promise<CollectedNewsArticle[]>;
