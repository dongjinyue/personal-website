import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_VAULT_DIR = "/home/ubuntu/content/obsidian-vault";
const COMMIT_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

function validateCommit(commit: string): string {
  if (!COMMIT_PATTERN.test(commit)) {
    throw new Error("知识库提交标识不合法");
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

function gitError(operation: string): Error {
  // 不附带原始进程错误，因为 stderr 可能包含服务器上的绝对路径。
  return new Error(`知识库 Git ${operation}失败`);
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

  private async executeBuffer(args: string[], operation: string): Promise<Buffer> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: this.vaultDir,
        encoding: "buffer",
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
      });
      return stdout;
    } catch {
      throw gitError(operation);
    }
  }

  async getHead(): Promise<string> {
    const head = (await this.executeText(["rev-parse", "HEAD"], "读取版本")).trim();
    return validateCommit(head);
  }

  async listFiles(commit: string, prefix: string): Promise<string[]> {
    const safeCommit = validateCommit(commit);
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
    const safeCommit = validateCommit(commit);
    const safePath = validateRepositoryPath(filePath);
    return this.executeBuffer(["show", `${safeCommit}:${safePath}`], "读取文件");
  }
}
