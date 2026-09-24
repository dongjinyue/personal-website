/**
 * 仅保存真正的新新闻；已有记录只用于去重，绝不做覆盖或删除。
 * 将数据库访问作为参数传入，方便网站 Server Action 和定时脚本共用规则。
 */
export async function persistNewArticles(candidates, loadExistingUrls, insertArticles) {
  if (candidates.length === 0) return { inserted: 0, skipped: 0 };

  const uniqueCandidates = [];
  const seen = new Set();
  for (const article of candidates) {
    if (!article.source_url || seen.has(article.source_url)) continue;
    seen.add(article.source_url);
    uniqueCandidates.push(article);
  }

  const existingUrls = new Set(await loadExistingUrls(uniqueCandidates.map((article) => article.source_url)));
  const newArticles = uniqueCandidates.filter((article) => !existingUrls.has(article.source_url));
  const inserted = newArticles.length === 0 ? 0 : await insertArticles(newArticles);

  return { inserted, skipped: candidates.length - newArticles.length };
}
