#!/usr/bin/env node
// 采集脚本依赖检查：确认 Node.js 版本和网络连通性。
// 在服务器上用 `node ops/news-collector/check.mjs` 运行。

const REQUIRED_MAJOR = 18;
const MINOR = process.versions.node.split(".")[0];
if (Number(MINOR) < REQUIRED_MAJOR) {
  console.error(`Node.js 版本过低: ${process.version}, 需要 >= ${REQUIRED_MAJOR}`);
  process.exit(1);
}
console.log(`Node.js ${process.version} OK`);

const SOURCES = [
  "https://openai.com/blog/rss.xml",
  "https://deepmind.google/blog/rss.xml",
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  "https://www.qbitai.com/feed",
];

let ok = 0;
let fail = 0;
for (const url of SOURCES) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MY-SPACE-News-Collector/1.0" },
    });
    clearTimeout(timeout);
    if (res.ok) {
      console.log(`OK  ${url} (${res.status})`);
      ok++;
    } else {
      console.log(`FAIL ${url} (${res.status})`);
      fail++;
    }
  } catch (err) {
    console.log(`FAIL ${url} (${err.message})`);
    fail++;
  }
}

console.log(`\n连通性: ${ok} OK, ${fail} FAIL`);
if (fail === SOURCES.length) {
  console.error("所有源不可达，请检查服务器网络。");
  process.exit(1);
}

if (!process.env.SUPABASE_URL) {
  console.error("缺少 SUPABASE_URL 环境变量");
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量");
  process.exit(1);
}
console.log("环境变量检查通过");
