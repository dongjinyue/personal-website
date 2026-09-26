import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bashExecutable =
  process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const bashOnly = { skip: process.platform === "win32" ? "在 Windows 上通过 Ubuntu 执行 Bash 集成测试" : false };

function createSandbox(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "personal-website-deploy-test-"));
  const bin = path.join(root, "bin");
  const log = path.join(root, "events.log");
  mkdirSync(bin, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const commands = {
    npm: [
      "#!/usr/bin/env bash",
      "printf 'npm %s\\n' \"$*\" >> \"$DEPLOY_TEST_LOG\"",
      "case \"$*\" in",
      "  ci) [[ \"${FAKE_NPM_FAIL:-}\" != ci ]] ;;",
      "  \"run build\") [[ \"${FAKE_NPM_FAIL:-}\" != build ]] ;;",
      "  *) exit 64 ;;",
      "esac",
      "",
    ].join("\n"),
    sudo: [
      "#!/usr/bin/env bash",
      "printf 'sudo %s\\n' \"$*\" >> \"$DEPLOY_TEST_LOG\"",
      "[[ \"${FAKE_RESTART_FAIL:-0}\" != 1 ]]",
      "",
    ].join("\n"),
    curl: [
      "#!/usr/bin/env bash",
      "printf 'curl %s\\n' \"$*\" >> \"$DEPLOY_TEST_LOG\"",
      "[[ \"${FAKE_HEALTH_FAIL:-0}\" != 1 ]]",
      "",
    ].join("\n"),
    sleep: "#!/usr/bin/env bash\nexit 0\n",
  };

  for (const [name, contents] of Object.entries(commands)) {
    const file = path.join(bin, name);
    writeFileSync(file, contents, { mode: 0o755 });
    chmodSync(file, 0o755);
  }

  return {
    root,
    bin,
    log,
    run(script, args = [], extraEnv = {}, input = "") {
      return spawnSync(bashExecutable, [script, ...args], {
        cwd: root,
        encoding: "utf8",
        input,
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}`,
          DEPLOY_TEST_LOG: log,
          DEPLOY_HEALTHCHECK_ATTEMPTS: "2",
          DEPLOY_HEALTHCHECK_INTERVAL: "0",
          ...extraEnv,
        },
      });
    },
    events() {
      return existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
    },
  };
}

function installDeployScript(sandbox) {
  const deployDir = path.join(sandbox.root, "ops", "deploy");
  mkdirSync(deployDir, { recursive: true });
  const script = path.join(deployDir, "deploy.sh");
  copyFileSync(path.join(repositoryRoot, "ops", "deploy", "deploy.sh"), script);
  chmodSync(script, 0o755);
  return script;
}

test("deploy.sh 安装依赖失败时不会重启服务", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const script = installDeployScript(sandbox);
  const result = sandbox.run(script, [], { FAKE_NPM_FAIL: "ci" });

  assert.notEqual(result.status, 0);
  assert.deepEqual(sandbox.events(), ["npm ci"]);
});

test("deploy.sh 构建失败时不会重启服务", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const script = installDeployScript(sandbox);
  const result = sandbox.run(script, [], { FAKE_NPM_FAIL: "build" });

  assert.notEqual(result.status, 0);
  assert.deepEqual(sandbox.events(), ["npm ci", "npm run build"]);
});

test("deploy.sh 服务重启失败时返回失败且不做健康检查", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const script = installDeployScript(sandbox);
  const result = sandbox.run(script, [], { FAKE_RESTART_FAIL: "1" });

  assert.notEqual(result.status, 0);
  assert.deepEqual(sandbox.events(), ["npm ci", "npm run build", "sudo -n systemctl restart personal-website.service"]);
});

test("deploy.sh 健康检查失败时返回失败", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const script = installDeployScript(sandbox);
  const result = sandbox.run(script, [], { FAKE_HEALTH_FAIL: "1" });

  assert.notEqual(result.status, 0);
  assert.equal(sandbox.events().filter((event) => event.startsWith("curl ")).length, 2);
  assert.match(sandbox.events().at(-1), /^curl /);
});

test("deploy.sh 按安装、构建、重启、健康检查顺序执行", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const script = installDeployScript(sandbox);
  const result = sandbox.run(script);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(sandbox.events(), [
    "npm ci",
    "npm run build",
    "sudo -n systemctl restart personal-website.service",
    "curl --fail --silent --show-error --output /dev/null http://127.0.0.1:3000/",
  ]);
});

function installRemoteFixtures(sandbox) {
  const repo = path.join(sandbox.root, "repo");
  const scriptsDir = path.join(repo, "ops", "deploy");
  mkdirSync(path.join(repo, ".git"), { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });
  const remoteScript = path.join(repo, "ops", "deploy", "deploy-remote.sh");
  copyFileSync(path.join(repositoryRoot, "ops", "deploy", "deploy-remote.sh"), remoteScript);
  chmodSync(remoteScript, 0o755);
  writeFileSync(path.join(scriptsDir, "deploy.sh"), "#!/usr/bin/env bash\nprintf 'deploy\\n' >> \"$DEPLOY_TEST_LOG\"\n");
  chmodSync(path.join(scriptsDir, "deploy.sh"), 0o755);

  const fakeGit = path.join(sandbox.bin, "git");
  writeFileSync(
    fakeGit,
    [
      "#!/usr/bin/env bash",
      "printf 'git %s\\n' \"$*\" >> \"$DEPLOY_TEST_LOG\"",
      "case \"$*\" in",
      "  'status --porcelain --untracked-files=all') [[ \"${FAKE_DIRTY:-0}\" != 1 ]] || printf ' M tracked-file\\n' ;;",
      "  'branch --show-current') printf '%s\\n' \"${FAKE_BRANCH:-main}\" ;;",
      "  'bundle verify '*|'fetch --quiet '*|'merge --ff-only refs/remotes/origin/main') exit 0 ;;",
      "  'rev-parse --short HEAD') printf 'deadbeef\\n' ;;",
      "  *) exit 64 ;;",
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(fakeGit, 0o755);
  return { repo, remoteScript };
}

test("deploy-remote.sh 遇到脏工作树时不拉取或发布", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const { repo, remoteScript } = installRemoteFixtures(sandbox);
  const result = sandbox.run(remoteScript, [repo], { FAKE_DIRTY: "1" });
  const events = sandbox.events();

  assert.notEqual(result.status, 0);
  assert.equal(events.some((event) => event.startsWith("git fetch")), false);
  assert.equal(events.includes("deploy"), false);
});

test("deploy-remote.sh 不在 main 分支时不发布", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const { repo, remoteScript } = installRemoteFixtures(sandbox);
  const result = sandbox.run(remoteScript, [repo], { FAKE_BRANCH: "feature" });
  const events = sandbox.events();

  assert.notEqual(result.status, 0);
  assert.equal(events.some((event) => event.startsWith("git fetch")), false);
  assert.equal(events.includes("deploy"), false);
});

test("deploy-remote.sh 从标准输入读取 Git bundle 并快进 main 后发布", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const { repo, remoteScript } = installRemoteFixtures(sandbox);
  const result = sandbox.run(remoteScript, [repo], {}, "test bundle data");
  const events = sandbox.events();

  assert.equal(result.status, 0, result.stderr);
  assert.ok(events.some((event) => event.startsWith("git bundle verify ")));
  assert.ok(events.some((event) => event.startsWith("git fetch --quiet ")));
  assert.ok(events.indexOf("git merge --ff-only refs/remotes/origin/main") < events.indexOf("deploy"));
  assert.equal(events.some((event) => event.includes("origin main")), false);
});

test("deploy-remote.sh 不接受空的 bundle 输入", bashOnly, (t) => {
  const sandbox = createSandbox(t);
  const { repo, remoteScript } = installRemoteFixtures(sandbox);
  const result = sandbox.run(remoteScript, [repo]);

  assert.notEqual(result.status, 0);
  assert.equal(sandbox.events().some((event) => event === "deploy"), false);
});
