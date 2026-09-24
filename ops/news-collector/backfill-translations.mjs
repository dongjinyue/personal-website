#!/usr/bin/env node
/**
 * 补翻译脚本：给已入库但 title_zh IS NULL 的英文新闻补上中文翻译。
 *
 * 用法：
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backfill-translations.mjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backfill-translations.mjs --dry-run
 *
 * 翻译服务：MyMemory API（免费、无需 key、本地网络可达）。
 * 翻译范围：仅 title_zh 和 description_zh，不影响其他字段。
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] 缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  console.error("用法: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backfill-translations.mjs");
  process.exit(1);
}

const API_BASE = `${SUPABASE_URL}/rest/v1/news_articles`;

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

/** 解码 HTML 实体（与采集脚本一致） */
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** MyMemory 翻译：免费、无需 key、本地可达 */
async function translateText(text) {
  if (!text) return null;
  try {
    const truncated = text.length > 500 ? text.slice(0, 500) : text;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=en|zh-CN`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (translated.toLowerCase() === truncated.toLowerCase()) return null;
      return translated;
    }
    return null;
  } catch {
    return null;
  }
}

/** 判断是否为英文（简单启发式：ASCII 字符占比 > 80%） */
function isEnglish(text) {
  if (!text) return false;
  const ascii = text.replace(/[^\x00-\x7F]/g, "").length;
  return ascii / text.length > 0.8;
}

async function fetchUntranslatedArticles() {
  // 读取所有 title_zh IS NULL 的记录
  const res = await fetch(
    `${API_BASE}?title_zh=is.null&select=id,title,description,source_name`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`读取失败: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  // 只翻译英文记录
  return rows.filter((r) => isEnglish(r.title));
}

async function updateTranslation(id, titleZh, descriptionZh) {
  const body = {};
  if (titleZh) body.title_zh = titleZh;
  if (descriptionZh) body.description_zh = descriptionZh;
  if (Object.keys(body).length === 0) return false;

  const res = await fetch(`${API_BASE}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function main() {
  console.log(`[INFO] 补翻译开始 ${new Date().toISOString()}${DRY_RUN ? " (DRY RUN)" : ""}`);

  const articles = await fetchUntranslatedArticles();
  console.log(`[INFO] 待翻译: ${articles.length} 条英文新闻（title_zh 为空）`);

  if (articles.length === 0) {
    console.log("[INFO] 没有需要补翻译的新闻，退出。");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const article of articles) {
    const title = decodeHtmlEntities(article.title);
    const description = decodeHtmlEntities(article.description);

    const [titleZh, descZh] = await Promise.all([
      translateText(title),
      translateText(description),
    ]);

    if (DRY_RUN) {
      console.log(`[预览] ${article.source_name} | ${title.slice(0, 50)}`);
      if (titleZh) console.log(`  标题中译: ${titleZh}`);
      if (descZh) console.log(`  摘要中译: ${descZh?.slice(0, 80)}...`);
      console.log();
      if (titleZh) success++;
      else failed++;
      continue;
    }

    const updated = await updateTranslation(article.id, titleZh, descZh);
    if (updated) {
      success++;
      console.log(`[OK] ${article.id} | ${title.slice(0, 40)} -> ${titleZh?.slice(0, 30)}`);
    } else {
      failed++;
      console.error(`[FAIL] ${article.id} | ${title.slice(0, 40)}`);
    }

    // MyMemory 限速：每秒约 1 请求
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n[INFO] 补翻译完成: 成功 ${success} 条, 失败 ${failed} 条${DRY_RUN ? " (DRY RUN)" : ""}`);
}

main().catch((err) => {
  console.error(`[ERROR] 补翻译脚本异常退出: ${err.message}`);
  process.exit(1);
});
