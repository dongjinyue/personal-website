import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { GitKnowledgeSource } from "../../lib/knowledge/git-source";

const execFileAsync = promisify(execFile);

async function git(repository: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", repository, ...args], {
    encoding: "utf8",
  });
  return stdout.trim();
}

async function commitFile(repository: string, contents: string, message: string): Promise<string> {
  const notePath = path.join(repository, "notes", "programming", "a.md");
  await mkdir(path.dirname(notePath), { recursive: true });
  await writeFile(notePath, contents, "utf8");
  await git(repository, ["add", "notes"]);
  await git(repository, ["commit", "-m", message]);
  return git(repository, ["rev-parse", "HEAD"]);
}

test("始终从指定提交读取文字、二进制与文件列表", async (t) => {
  const repository = await mkdtemp(path.join(tmpdir(), "knowledge-git-source-"));
  await git(repository, ["init", "--initial-branch=main"]);
  await git(repository, ["config", "user.name", "Knowledge Test"]);
  await git(repository, ["config", "user.email", "knowledge@example.invalid"]);

  const firstMarkdown = "第一版内容\n";
  const secondMarkdown = "第二版内容\n";
  const firstCommit = await commitFile(repository, firstMarkdown, "v1");
  const secondCommit = await commitFile(repository, secondMarkdown, "v2");
  const source = new GitKnowledgeSource(repository);

  assert.equal(await source.getHead(), secondCommit);
  assert.deepEqual(await source.listFiles(firstCommit, "notes"), ["notes/programming/a.md"]);
  assert.equal(await source.readText(firstCommit, "notes/programming/a.md"), firstMarkdown);
  assert.equal(await source.readText(secondCommit, "notes/programming/a.md"), secondMarkdown);
  assert.deepEqual(
    await source.readBinary(firstCommit, "notes/programming/a.md"),
    Buffer.from(firstMarkdown),
  );

  await t.test("拒绝目录穿越、绝对路径、反斜杠和不可信提交", async () => {
    for (const unsafePath of ["../secret", "/notes/a.md", "notes\\a.md", "notes/./a.md", "notes//a.md"]) {
      await assert.rejects(() => source.readText(firstCommit, unsafePath), /不安全/);
    }
    await assert.rejects(() => source.readText("--help", "notes/a.md"), /提交/);
  });
});

test("Git 错误不会泄漏知识库绝对路径", async () => {
  const repository = await mkdtemp(path.join(tmpdir(), "knowledge-git-error-"));
  const source = new GitKnowledgeSource(repository);

  await assert.rejects(
    () => source.getHead(),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, new RegExp(repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(error.message, /Git/);
      return true;
    },
  );
});
