import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_VAULT_DIR = "/home/ubuntu/content/obsidian-vault";
const COMMIT_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

function validateCommit(commit: string, operation: string): string {
  if (!COMMIT_PATTERN.test(commit)) {
    throw gitError(operation);
  }
  return commit;
}

/**
 * Git 对象路径只能是仓库内的规范相对路径。
 * 明确拒绝反斜杠可以避免不同操作系统对同一路径产生不同解释。
 */
function validateRepositoryPath(value: string): string {
  if (
    !value ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[a-zA-Z]:/.test(value)
  ) {
    throw new Error("知识库路径不安全");
  }

  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("知识库路径不安全");
  }
  return segments.join("/");
}

export type KnowledgeGitErrorCode = "missing-object" | "operation-failed";

/** 不向响应泄漏 Git stderr，但保留调用方需要的安全错误类别。 */
export class KnowledgeGitError extends Error {
  constructor(readonly code: KnowledgeGitErrorCode, operation: string) {
    super(`知识库 Git ${operation}失败`);
    this.name = "KnowledgeGitError";
  }
}

function reportsMissingPath(error: unknown): boolean {
  // 不附带原始进程错误，因为 stderr 可能包含服务器上的绝对路径。
  const stderr = typeof error === "object" && error && "stderr" in error
    ? String((error as { stderr?: unknown }).stderr ?? "")
    : "";
  return /(?:does not exist in|exists on disk, but not in)/i.test(stderr);
}

function gitError(operation: string): KnowledgeGitError {
  return new KnowledgeGitError("operation-failed", operation);
}

/** 从 Git 对象数据库读取固定提交，绝不读取可能正在变动的工作区正文。 */
export class GitKnowledgeSource {
  private readonly vaultDir: string;

  constructor(vaultDir = process.env.OBSIDIAN_VAULT_DIR?.trim() || DEFAULT_VAULT_DIR) {
    this.vaultDir = vaultDir;
  }

  private async executeText(args: string[], operation: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: this.vaultDir,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      return stdout;
    } catch {
      throw gitError(operation);
    }
  }

  private async executeBuffer(
    args: string[],
    operation: string,
    commitForMissingPath?: string,
  ): Promise<Buffer> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: this.vaultDir,
        encoding: "buffer",
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
      });
      return stdout;
    } catch (error) {
      if (commitForMissingPath && reportsMissingPath(error)) {
        try {
          // Git 对不存在的提交也可能报告“路径不存在”，因此先确认提交对象真实可读。
          await this.executeText(["cat-file", "-e", `${commitForMissingPath}^{commit}`], "验证版本");
        } catch {
          throw gitError(operation);
        }
        throw new KnowledgeGitError("missing-object", operation);
      }
      throw gitError(operation);
    }
  }

  async getHead(): Promise<string> {
    const head = (await this.executeText(["rev-parse", "HEAD"], "读取版本")).trim();
    return validateCommit(head, "读取版本");
  }

  async listFiles(commit: string, prefix: string): Promise<string[]> {
    const safeCommit = validateCommit(commit, "列出文件");
    const safePrefix = validateRepositoryPath(prefix);
    const output = await this.executeBuffer(
      ["ls-tree", "-r", "--name-only", "-z", safeCommit, "--", safePrefix],
      "列出文件",
    );

    return output
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map(validateRepositoryPath)
      .sort();
  }

  async readText(commit: string, filePath: string): Promise<string> {
    return (await this.readBinary(commit, filePath)).toString("utf8");
  }

  async readBinary(commit: string, filePath: string): Promise<Buffer> {
    const safeCommit = validateCommit(commit, "读取文件");
    const safePath = validateRepositoryPath(filePath);
    return this.executeBuffer(
      ["show", `${safeCommit}:${safePath}`],
      "读取文件",
      safeCommit,
    );
  }
}
