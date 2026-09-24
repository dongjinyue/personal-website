import assert from "node:assert/strict";
import test from "node:test";
import { collectLatestNews } from "../../ops/news-collector/collect-news.mjs";
import { persistNewArticles } from "../../ops/news-collector/news-workflow.mjs";

test("已有来源链接全部重复时不调用写入，保留现有新闻", async () => {
  const existing = ["https://news.example/existing"];
  const candidates = [{ source_url: existing[0], title: "已有新闻" }];
  let insertCalled = false;

  const result = await persistNewArticles(
    candidates,
    async () => existing,
    async () => { insertCalled = true; return 1; },
  );

  assert.deepEqual(result, { inserted: 0, skipped: 1 });
  assert.equal(insertCalled, false);
});

test("只写入数据库中不存在且本批次不重复的新闻", async () => {
  const insertedRows = [];
  const candidates = [
    { source_url: "https://news.example/old", title: "旧新闻" },
    { source_url: "https://news.example/new", title: "新新闻" },
    { source_url: "https://news.example/new", title: "重复的新新闻" },
  ];

  const result = await persistNewArticles(
    candidates,
    async () => ["https://news.example/old"],
    async (rows) => { insertedRows.push(...rows); return rows.length; },
  );

  assert.deepEqual(result, { inserted: 1, skipped: 2 });
  assert.deepEqual(insertedRows, [{ source_url: "https://news.example/new", title: "新新闻" }]);
});

test("候选列表为空时不查询或写入新闻", async () => {
  let touchedDatabase = false;

  const result = await persistNewArticles(
    [],
    async () => { touchedDatabase = true; return []; },
    async () => { touchedDatabase = true; return 0; },
  );

  assert.deepEqual(result, { inserted: 0, skipped: 0 });
  assert.equal(touchedDatabase, false);
});

test("从订阅源收集时只保留最近一周新闻并按来源链接去重", async () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title>New AI model announced</title>
    <link>https://news.example/new-model</link>
    <description>A new model release</description>
    <pubDate>Wed, 23 Sep 2026 10:00:00 GMT</pubDate>
  </item><item><title>Old AI research</title>
    <link>https://news.example/old</link>
    <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const result = await collectLatestNews({
    now: Date.parse("2026-09-24T00:00:00Z"),
    fetchImpl: async () => new Response(xml, { status: 200 }),
    translate: async () => 0,
    log: () => {},
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].source_url, "https://news.example/new-model");
});

test("所有新闻源都不可用时报告采集失败，不伪装成没有新新闻", async () => {
  await assert.rejects(
    collectLatestNews({
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
      translate: async () => 0,
      log: () => {},
    }),
    /新闻源暂时都无法访问/,
  );
});
