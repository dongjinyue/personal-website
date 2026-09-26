import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "deploy.yml");

test("部署工作流是可解析的 YAML，且包含推送与手动触发器", () => {
  const workflow = load(readFileSync(workflowPath, "utf8"));

  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.ok(Object.hasOwn(workflow.on, "workflow_dispatch"));
});

test("部署工作流仅在 main 推送或手动触发，且串行执行", () => {
  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /concurrency:[\s\S]*?cancel-in-progress:\s*false/);
  assert.match(workflow, /if:\s*github\.ref == 'refs\/heads\/main'/);
});

test("部署工作流固定第三方 Action 版本并限定仓库权限", () => {
  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /uses:\s*actions\/checkout@[0-9a-f]{40}\s+# v7\.0\.1/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
});

test("部署工作流读取所需机密并严格验证 SSH 主机", () => {
  const workflow = readFileSync(workflowPath, "utf8");
  const requiredSecrets = [
    "DEPLOY_HOST",
    "DEPLOY_PORT",
    "DEPLOY_USER",
    "DEPLOY_SSH_KEY",
    "DEPLOY_KNOWN_HOSTS",
  ];

  for (const secret of requiredSecrets) {
    assert.ok(workflow.includes("secrets." + secret), "缺少 GitHub Secret：" + secret);
  }

  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no|ssh-keyscan/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /git bundle create .*refs\/remotes\/origin\/main/);
  assert.match(workflow, /cat "\$bundle_file" \| ssh/);
  assert.doesNotMatch(workflow, /< ops\/deploy\/deploy-remote\.sh/);
});
