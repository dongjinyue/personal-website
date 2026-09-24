import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://localhost:3002";
const cases = [
  { path: "/knowledge", status: 200, label: "知识库索引" },
  { path: "/knowledge/react-server-components", status: 200, label: "公开笔记" },
  { path: "/knowledge/private-note", status: 404, label: "私密笔记" },
  { path: "/knowledge/draft-note", status: 404, label: "草稿笔记" },
];

const responses = [];
for (const testCase of cases) {
  const response = await fetch(new URL(testCase.path, baseUrl), { redirect: "manual" });
  const html = await response.text();
  assert.equal(
    response.status,
    testCase.status,
    `${testCase.label} ${testCase.path} 应返回 HTTP ${testCase.status}，实际为 ${response.status}`,
  );
  responses.push({ ...testCase, html });
  console.log(`✓ ${testCase.path}: HTTP ${response.status}`);
}

const [knowledgeIndex, publicNote, privateNote, draftNote] = responses;
assert.match(knowledgeIndex.html, /知识库/);
assert.match(knowledgeIndex.html, /React 服务端组件/);
assert.doesNotMatch(knowledgeIndex.html, /私密检索词|草稿检索词/);
for (const denied of [privateNote, draftNote]) {
  // Next.js 将服务端组件结果序列化到脚本载荷中，因此检查原始响应而不是剥掉脚本后的文本。
  assert.match(denied.html, /NOTE NOT FOUND \/ 404/, `${denied.label} 应显示统一未找到页面`);
  assert.match(denied.html, /没有找到这篇笔记/, `${denied.label} 应使用统一的无权限提示`);
  assert.doesNotMatch(denied.html, /私密笔记|草稿笔记|私密检索词|草稿检索词/);
}

assert.match(publicNote.html, /React 服务端组件/);
assert.doesNotMatch(publicNote.html, /私密检索词|草稿检索词/);
console.log("通过：知识库索引与公开笔记可访问；私密/草稿返回真实 HTTP 404，响应不泄露内容。");
