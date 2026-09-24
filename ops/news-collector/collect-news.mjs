#!/usr/bin/env node
// AI 新闻定时采集脚本：从 RSS/Atom 源拉取元数据，按标题关键词分类，去重后写入 Supabase。
// 由 systemd timer 每 6 小时运行一次；使用 service_role 密钥绕过 RLS 直接写入。
// 支持 --dry-run 参数：只采集解析分类，不写入数据库，用于本地验证。
import { pathToFileURL } from "node:url";
import { persistNewArticles } from "./news-workflow.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 中英文 AI 新闻 RSS/Atom 源
const RSS_SOURCES = [
  { url: "https://openai.com/blog/rss.xml", name: "OpenAI Blog", lang: "en" },
  { url: "https://deepmind.google/blog/rss.xml", name: "Google DeepMind", lang: "en" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch AI", lang: "en" },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", name: "The Verge AI", lang: "en" },
  { url: "https://www.qbitai.com/feed", name: "量子位", lang: "zh" },
];

// 分类关键词规则：按优先级匹配标题，命中第一个匹配的分类。
const CATEGORY_RULES = [
  {
    category: "模型动态",
    keywords: ["模型", "model", "GPT", "LLM", "Claude", "Gemini", "Llama", "多模态", "multimodal", "推理", "reasoning", "训练", "train", "权重", "weights", "benchmark", "基准", "智能体", "agent", "AGI"],
  },
  {
    category: "AI 产品",
    keywords: ["产品", "product", "发布", "launch", "更新", "update", "ChatGPT", "Copilot", "Cursor", "助手", "assistant", "应用", "app", "平台", "platform", "搜索", "search", "浏览器", "browser"],
  },
  {
    category: "开发技术",
    keywords: ["开发", "developer", "编程", "coding", "代码", "code", "SDK", "API", "开源", "open source", "GitHub", "框架", "framework", "工具", "tool", "部署", "deploy", "本地", "local", "inference", "GPU", "硬件", "hardware", "Docker", "Kubernetes"],
  },
  {
    category: "行业观察",
    keywords: ["行业", "industry", "市场", "market", "融资", "funding", "收购", "acquisition", "投资", "invest", "政策", "policy", "监管", "regulation", "安全", "safety", "伦理", "ethics", "趋势", "trend", "报告", "report", "研究", "research"],
  },
];

const DEFAULT_CATEGORY = "行业观察";
// 每次最多采集 20 条，避免单次写入过多。
const MAX_ARTICLES_PER_RUN = 20;
// 只采集最近 7 天的新闻。
const MAX_AGE_DAYS = 7;

function classifyByTitle(title) {
  const lower = title.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }
  return DEFAULT_CATEGORY;
}

// 解析 RSS 2.0 格式（<item> 标签）。
function parseRSSItems(xmlText, source) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const title = decodeHtmlEntities(extractTag(block, "title"));
    const link = extractTag(block, "link");
    const description = decodeHtmlEntities(stripHtml(extractTag(block, "description")));
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "date");
    if (!title || !link) continue;
    items.push({
      title: title.trim(),
      source_url: link.trim(),
      source_name: source.name,
      description: description ? description.slice(0, 300) : null,
      detail: null,
      category: classifyByTitle(title),
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      _source_lang: source.lang,
      title_zh: null,
      description_zh: null,
    });
  }
  return items;
}

// 解析 Atom 1.0 格式（<entry> 标签）。
// Atom 的 <link> 是自闭合标签，URL 在 href 属性中。
function parseAtomEntries(xmlText, source) {
  const items = [];
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const title = decodeHtmlEntities(extractTag(block, "title"));
    // Atom link 有多种：rel="alternate" 的是正文链接，rel="self" 的是 API 链接
    const link = extractAtomLink(block);
    const summary = decodeHtmlEntities(stripHtml(extractTag(block, "summary") || extractTag(block, "content")));
    const pubDate = extractTag(block, "published") || extractTag(block, "updated");
    if (!title || !link) continue;
    items.push({
      title: title.trim(),
      source_url: link.trim(),
      source_name: source.name,
      description: summary ? summary.slice(0, 300) : null,
      detail: null,
      category: classifyByTitle(title),
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      _source_lang: source.lang,
      title_zh: null,
      description_zh: null,
    });
  }
  return items;
}

// 提取 Atom <link> 的 href 属性，优先取 rel="alternate" 的。
function extractAtomLink(block) {
  // 匹配所有 <link> 标签
  const linkRegex = /<link[^>]*>/gi;
  const links = block.match(linkRegex);
  if (!links || links.length === 0) return "";
  // 优先取 rel="alternate" 的 link
  for (const tag of links) {
    if (/rel=["']alternate["']/i.test(tag) || !/rel=/i.test(tag)) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) return hrefMatch[1];
    }
  }
  // 没找到 alternate，取第一个有 href 的
  for (const tag of links) {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) return hrefMatch[1];
  }
  return "";
}

// 统一解析入口：自动判断 RSS 还是 Atom 格式。
function parseFeed(xmlText, source) {
  if (/<entry/i.test(xmlText)) {
    return parseAtomEntries(xmlText, source);
  }
  return parseRSSItems(xmlText, source);
}

function extractTag(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  const match = block.match(regex);
  return match ? match[1].trim() : "";
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").trim();
}

// 解码 HTML 实体编码（如 &#8217; → '）
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&#8216;/g, "'")   // 左单引号
    .replace(/&#8217;/g, "'")   // 右单引号
    .replace(/&#8220;/g, '"')  // 左双引号
    .replace(/&#8221;/g, '"')  // 右双引号
    .replace(/&#8230;/g, "...") // 省略号
    .replace(/&#038;/g, "&")   // &
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function isRecent(dateStr, now = Date.now()) {
  if (!dateStr) return true; // 没有日期的条目不按时间过滤。
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return true;
  const cutoff = now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
}

// MyMemory 翻译 API：免费无需 key，本地网络可达，每日 5000 词额度。
async function translateText(text, sourceLang, fetchImpl = fetch) {
  if (!text || sourceLang !== "en") return null;
  try {
    // MyMemory 单次请求限制 500 字节，超长文本截断。
    const truncated = text.length > 500 ? text.slice(0, 500) : text;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=en|zh-CN`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // 返回格式：{ responseData: { translatedText: "译文" } }
    if (data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // MyMemory 偶尔返回原文（翻译失败时），跳过。
      if (translated.toLowerCase() === truncated.toLowerCase()) return null;
      return translated;
    }
    return null;
  } catch {
    return null;
  }
}

// 批量翻译英文文章的标题和摘要；中文源跳过。
async function translateArticles(articles, fetchImpl = fetch) {
  let translated = 0;
  for (const article of articles) {
    if (article._source_lang !== "en") continue;
    const [titleZh, descZh] = await Promise.all([
      translateText(article.title, "en", fetchImpl),
      translateText(article.description, "en", fetchImpl),
    ]);
    if (titleZh) { article.title_zh = titleZh; translated++; }
    if (descZh) article.description_zh = descZh;
  }
  return translated;
}

async function fetchRSS(source, fetchImpl = fetch, log = console.error, onSuccess = () => {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetchImpl(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "MY-SPACE-News-Collector/1.0" },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      log(`[WARNING] ${source.name} 返回 ${response.status}`);
      return [];
    }
    onSuccess();
    const text = await response.text();
    return parseFeed(text, source);
  } catch (err) {
    log(`[WARNING] 获取 ${source.name} 失败: ${err.message}`);
    return [];
  }
}

/** 从公开 RSS/Atom 源收集、过滤并翻译近期新闻；网站按钮和定时脚本共用此入口。 */
export async function collectLatestNews({ fetchImpl = fetch, now = Date.now(), translate = translateArticles, log = console.log } = {}) {
  let successfulSources = 0;
  const sourceResults = await Promise.all(
    RSS_SOURCES.map((source) => fetchRSS(source, fetchImpl, log, () => { successfulSources++; })),
  );
  if (successfulSources === 0) throw new Error("新闻源暂时都无法访问。");
  let allArticles = sourceResults.flat().filter((article) => isRecent(article.published_at, now));

  const seen = new Set();
  allArticles = allArticles.filter((article) => {
    if (!article.source_url || seen.has(article.source_url)) return false;
    seen.add(article.source_url);
    return true;
  });

  allArticles.sort((a, b) => {
    const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return timeB - timeA;
  });
  allArticles = allArticles.slice(0, MAX_ARTICLES_PER_RUN);
  await translate(allArticles, fetchImpl);
  return allArticles;
}

async function insertArticles(articles) {
  let inserted = 0;
  const result = await persistNewArticles(
    articles,
    async (sourceUrls) => {
      // 一次查询整批来源链接，避免逐条请求 Supabase。
      const url = new URL("/rest/v1/news_articles", SUPABASE_URL);
      url.searchParams.set("source_url", `in.(${sourceUrls.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`);
      url.searchParams.set("select", "source_url");
      const checkRes = await fetch(url, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      if (!checkRes.ok) throw new Error(`读取已有新闻失败: ${checkRes.status}`);
      const existing = await checkRes.json();
      return Array.isArray(existing) ? existing.map((row) => row.source_url).filter(Boolean) : [];
    },
    async (newArticles) => {
      for (const article of newArticles) {
        try {
          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/news_articles`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              title: article.title,
              title_zh: article.title_zh || null,
              source_url: article.source_url,
              source_name: article.source_name,
              description: article.description,
              description_zh: article.description_zh || null,
              detail: null,
              category: article.category,
              is_public: true,
              hide_from_guests: false,
              published_at: article.published_at,
            }),
          });
          if (insertRes.ok) inserted++;
          else console.error(`[WARNING] 写入失败: ${article.title.slice(0, 40)}`);
        } catch (err) {
          console.error(`[WARNING] 处理条目失败: ${err.message}`);
        }
      }
      return inserted;
    },
  );

  return result.inserted;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量。");
    console.error("如需本地验证采集逻辑（不写库），请使用 --dry-run 参数。");
    process.exitCode = 1;
    return;
  }

  console.log(`[INFO] 采集开始 ${new Date().toISOString()}${dryRun ? " (DRY RUN)" : ""}`);

  const allArticles = await collectLatestNews({ log: console.log });

  console.log(`[INFO] 去重和过滤后共 ${allArticles.length} 条候选`);

  // 翻译英文新闻的标题和摘要。
  const translated = allArticles.filter((article) => article.title_zh).length;
  console.log(`[INFO] 翻译完成: ${translated} 条英文新闻已生成中文标题`);

  if (dryRun) {
    console.log("\n--- 采集结果预览 ---");
    for (const a of allArticles) {
      console.log(`[${a.category}] ${a.source_name} | ${a.title.slice(0, 60)}`);
      if (a.title_zh) console.log(`  中译: ${a.title_zh}`);
      console.log(`  ${a.source_url}`);
      console.log(`  发布: ${a.published_at || "未知"}`);
      if (a.description) console.log(`  摘要: ${a.description.slice(0, 80)}...`);
      if (a.description_zh) console.log(`  摘要中译: ${a.description_zh.slice(0, 80)}...`);
      console.log();
    }
    // 分类统计
    const stats = {};
    for (const a of allArticles) {
      stats[a.category] = (stats[a.category] || 0) + 1;
    }
    console.log("--- 分类统计 ---");
    for (const [cat, count] of Object.entries(stats)) {
      console.log(`  ${cat}: ${count} 条`);
    }
    console.log("\n[INFO] DRY RUN 完成，未写入数据库。");
    return;
  }

  const inserted = await insertArticles(allArticles);
  console.log(`[INFO] 新写入 ${inserted} 条，采集结束`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[ERROR] 采集脚本异常退出: ${err.message}`);
    process.exitCode = 1;
  });
}
