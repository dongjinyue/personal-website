# Obsidian 个人知识库第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Windows 上安装 Obsidian，创建可立即写作的个人知识库，并将其首次推送到 `dongjinyue/obsidian-vault` 私有仓库。

**Architecture:** 知识库位于网站仓库之外，以 Markdown 文件作为权威数据源；Obsidian 只负责本地编辑，GitHub 私有仓库负责版本记录和备份。先在网站工作区内用补丁生成可审查的暂存文件，再将完整目录复制到目标位置，避免用命令行拼接文件内容。

**Tech Stack:** Obsidian、Markdown、YAML Frontmatter（文件头元数据）、Git、GitHub CLI（命令行工具）、PowerShell

**Spec:** `docs/superpowers/specs/2026-09-09-obsidian-vault-design.md`

## 执行状态（2026-09-09）

- 已完成：Obsidian 官方安装器下载、签名验证及 `D:\my\Obsidian` 安装。
- 已完成：本地知识库结构、模板、首页、学习指南和安全默认配置。
- 已完成：独立 Git 初始化、首次提交、GitHub 私有仓库创建与推送。
- 已验证：远程仓库为 `PRIVATE`，默认分支为 `main`，本地知识库工作区干净。
- 待人工确认：从桌面打开 Obsidian 后的阅读视图、模板核心插件和键盘导航。自动化会话只观察到 Obsidian 后台进程，不能代替真实窗口验收。
- 实施差异：当前系统没有 winget，因此改从 Obsidian 官方下载页对应的 GitHub 发布地址获取安装器；未使用第三方下载源。

## Global Constraints

- 本地知识库固定使用 `C:\Users\24315\Desktop\AI\obsidian-vault`。
- GitHub 仓库固定使用 `dongjinyue/obsidian-vault`，且必须为 Private（私有）。
- 默认分支固定为 `main`。
- 第一阶段不修改 MY SPACE 网站功能，不实现服务器同步。
- Obsidian 是唯一的笔记编辑入口，Markdown 文件是权威数据源。
- 内容笔记默认使用 `visibility: "private"` 和 `status: "draft"`。
- 第一阶段不安装社区插件，不写入密钥、令牌或服务器私钥。
- 不覆盖已存在的同名本地目录或 GitHub 仓库；发现冲突时停止并报告。

---

### Task 1: 准备并验证本机工具

**Files:**
- No files changed.

**Interfaces:**
- Consumes: Windows 当前用户环境与联网能力。
- Produces: 可用的 Obsidian、Git、GitHub CLI，以及已登录 `dongjinyue` 的 GitHub 会话。

- [ ] **Step 1: 检查工具与目标是否冲突**

Run:

```powershell
Get-Command git, gh, winget -ErrorAction SilentlyContinue
Test-Path 'C:\Users\24315\Desktop\AI\obsidian-vault'
gh repo view dongjinyue/obsidian-vault --json name,visibility,url 2>$null
```

Expected: `git`、`gh`、`winget` 能被找到；本地目录返回 `False`；远程仓库查询返回“找不到仓库”。如果本地目录或远程仓库已存在，先读取其状态并停止，不能覆盖。

- [ ] **Step 2: 验证 Obsidian 官方安装包信息**

Run:

```powershell
winget show --id Obsidian.Obsidian --exact
```

Expected: 输出的软件名称为 Obsidian，发布者和安装来源可见。如果包 ID 不匹配，不执行安装，改用 Obsidian 官方下载页核对。

- [ ] **Step 3: 安装 Obsidian**

Run:

```powershell
winget install --id Obsidian.Obsidian --exact --accept-source-agreements --accept-package-agreements
```

Expected: winget（Windows 软件包管理器）报告安装成功。该命令会在电脑上安装桌面应用，因此执行前需要用户批准系统级写入。

- [ ] **Step 4: 检查 GitHub 登录身份**

Run:

```powershell
gh auth status
gh api user --jq .login
```

Expected: 当前登录账号输出为 `dongjinyue`。若未登录，运行 `gh auth login --web --git-protocol https`，由用户在浏览器中亲自授权；不读取或记录访问令牌。

---

### Task 2: 创建知识库文件与安全默认配置

**Files:**
- Create in staging: `.codex-tmp/obsidian-vault/.gitignore`
- Create in staging: `.codex-tmp/obsidian-vault/.obsidian/app.json`
- Create in staging: `.codex-tmp/obsidian-vault/README.md`
- Create in staging: `.codex-tmp/obsidian-vault/首页.md`
- Create in staging: `.codex-tmp/obsidian-vault/Obsidian-学习指南.md`
- Create in staging: `.codex-tmp/obsidian-vault/templates/笔记模板.md`
- Create in staging: `.codex-tmp/obsidian-vault/notes/ai/.gitkeep`
- Create in staging: `.codex-tmp/obsidian-vault/notes/programming/.gitkeep`
- Create in staging: `.codex-tmp/obsidian-vault/notes/projects/.gitkeep`
- Create in staging: `.codex-tmp/obsidian-vault/attachments/.gitkeep`

**Interfaces:**
- Consumes: Task 1 已确认的本地目标路径。
- Produces: 一个可独立打开、默认安全且不含虚假内容的 Obsidian 知识库目录。

- [ ] **Step 1: 用补丁创建暂存目录中的全部文本文件**

Use `apply_patch` to create the exact file set above. Required content:

- `.gitignore` 忽略 `.obsidian/workspace*.json`、`.obsidian/cache/`、`.trash/`、`.DS_Store`、`Thumbs.db` 和常见编辑器临时文件。
- `.obsidian/app.json` 设置 `attachmentFolderPath` 为 `attachments`、`newFileLocation` 为 `folder`、`newFileFolderPath` 为 `notes`，不保存设备布局。
- `README.md` 写明目录用途、六个 Frontmatter 字段、公开规则、安全边界和 Git 流程。
- `首页.md` 链接 `[[Obsidian-学习指南]]` 与 `[[templates/笔记模板|笔记模板]]`，并说明三类笔记目录。
- `Obsidian-学习指南.md` 讲解创建笔记、属性、内部链接、附件、标签、模板、公开检查和 Git 提交。
- `templates/笔记模板.md` 使用如下安全元数据，并提供“摘要、正文、相关笔记、参考资料”四节：

```yaml
---
title: "新笔记"
slug: "new-note"
visibility: "private"
status: "draft"
tags: []
created_at: "2026-09-09"
updated_at: "2026-09-09"
---
```

Expected: 所有文件均为 UTF-8 文本；注释只解释重要且不直观的规则。

- [ ] **Step 2: 静态检查知识库结构和元数据**

Run from the website repository:

```powershell
Get-ChildItem '.codex-tmp\obsidian-vault' -Recurse -Force | Select-Object FullName
rg -n '^(title|slug|visibility|status|tags|created_at|updated_at):' '.codex-tmp\obsidian-vault\templates\笔记模板.md'
rg -n 'visibility: "private"|status: "draft"' '.codex-tmp\obsidian-vault\templates\笔记模板.md'
```

Expected: 目录清单与设计一致；七个元数据字段各出现一次；安全默认值各出现一次。

- [ ] **Step 3: 将暂存目录移动到独立目标位置**

Run after再次确认目标不存在:

```powershell
Test-Path 'C:\Users\24315\Desktop\AI\obsidian-vault'
Move-Item -LiteralPath 'C:\Users\24315\Desktop\AI\personal-website\.codex-tmp\obsidian-vault' -Destination 'C:\Users\24315\Desktop\AI\obsidian-vault'
```

Expected: 第一个命令返回 `False`；移动后目标目录存在，网站仓库中不残留该暂存目录。移动操作写入网站工作区之外，执行前需要用户批准。

---

### Task 3: 在 Obsidian 中打开并验证知识库

**Files:**
- Verify: `C:\Users\24315\Desktop\AI\obsidian-vault\.obsidian\app.json`
- Verify: `C:\Users\24315\Desktop\AI\obsidian-vault\首页.md`
- Verify: `C:\Users\24315\Desktop\AI\obsidian-vault\templates\笔记模板.md`

**Interfaces:**
- Consumes: Task 1 安装的 Obsidian 与 Task 2 创建的知识库。
- Produces: Obsidian 已识别的本地 Vault（知识库），且渲染和设置符合设计。

- [ ] **Step 1: 启动 Obsidian 并选择现有文件夹作为知识库**

Open Obsidian，选择“打开本地仓库”或等价入口，并选择：

```text
C:\Users\24315\Desktop\AI\obsidian-vault
```

Expected: 左侧文件区显示 `notes`、`attachments`、`templates`、`首页.md` 和学习指南。首次启动产生的工作区状态应被 `.gitignore` 忽略。

- [ ] **Step 2: 配置并检查模板与附件位置**

在 Obsidian 设置中启用内置 Templates（模板）核心插件，将模板文件夹设为 `templates`；确认“新附件的默认位置”为 `attachments`，新笔记默认目录为 `notes`。

Expected: 插入模板时能选择“笔记模板”；粘贴测试图片时目标路径显示为 `attachments`。验证完成后删除测试图片，不留下示例内容。

- [ ] **Step 3: 检查阅读视图**

Open `首页.md` and `Obsidian-学习指南.md` in reading view.

Expected: 中文标题正常显示，内部链接可点击，代码块和提示块无明显渲染错误；键盘可在文件列表与正文间导航。

---

### Task 4: 初始化 Git 并创建 GitHub 私有仓库

**Files:**
- Create: `C:\Users\24315\Desktop\AI\obsidian-vault\.git\`（由 Git 管理）
- Track: Task 2 创建的全部知识库文件

**Interfaces:**
- Consumes: Task 2 与 Task 3 验证完成的知识库，以及 Task 1 的 GitHub 登录会话。
- Produces: 默认分支为 `main` 的本地仓库和 `dongjinyue/obsidian-vault` 私有远程仓库。

- [ ] **Step 1: 初始化本地仓库并检查忽略规则**

Run:

```powershell
git init -b main
git status --short --ignored
git check-ignore -v '.obsidian\workspace.json'
```

Working directory: `C:\Users\24315\Desktop\AI\obsidian-vault`

Expected: 当前分支为 `main`；知识库文件显示为未跟踪；`workspace.json` 命中 `.gitignore`。如果文件已由 Obsidian 生成，它不能进入待提交清单。

- [ ] **Step 2: 检查敏感内容与大文件**

Run:

```powershell
rg -n -i 'password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key' --glob '!Obsidian-学习指南.md' --glob '!README.md' .
Get-ChildItem -Recurse -File | Where-Object Length -GT 10MB | Select-Object FullName,Length
```

Expected: 不出现真实秘密信息；没有超过 10 MB 的文件。文档中用于说明安全规则的英文关键词不作为泄露处理。

- [ ] **Step 3: 创建初始提交**

Run:

```powershell
git add --all
git diff --cached --check
git diff --cached --stat
git commit -m "chore: 初始化 Obsidian 个人知识库"
```

Expected: 检查无空白错误；提交只包含设计规定的知识库文件与必要的 Obsidian 配置。

- [ ] **Step 4: 创建私有远程仓库并推送**

Run:

```powershell
gh repo create dongjinyue/obsidian-vault --private --source . --remote origin --push
```

Expected: GitHub 返回仓库地址，`main` 推送成功，`origin` 指向 `https://github.com/dongjinyue/obsidian-vault.git` 或等价的 GitHub 地址。

- [ ] **Step 5: 验证远程隐私和本地状态**

Run:

```powershell
gh repo view dongjinyue/obsidian-vault --json nameWithOwner,visibility,url,defaultBranchRef
git remote -v
git status --short
```

Expected: `nameWithOwner` 为 `dongjinyue/obsidian-vault`，`visibility` 为 `PRIVATE`，默认分支为 `main`；`git status --short` 无输出。

---

### Task 5: 回写项目记录并做最终核验

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-09-09-obsidian-vault-implementation.md`（勾选已完成步骤）

**Interfaces:**
- Consumes: Task 1–4 的真实执行结果。
- Produces: MY SPACE 项目中准确记录的知识库阶段状态，不把后续网站集成或服务器同步描述成已完成。

- [ ] **Step 1: 更新变更记录**

Use `apply_patch` to add a dated entry to `CHANGELOG.md` stating only verified facts: Obsidian 已安装、本地知识库已创建、私有 GitHub 仓库已建立。明确网站读取和服务器同步仍未实施。

- [ ] **Step 2: 运行与本次文档改动直接相关的检查**

Run from the website repository:

```powershell
git diff --check
rg -n 'obsidian-vault|服务器同步仍未实施' CHANGELOG.md docs/superpowers/plans/2026-09-09-obsidian-vault-implementation.md
git status --short
```

Expected: `git diff --check` 无错误；变更记录包含准确状态；用户已有的无关文件仍未被修改或暂存。

- [ ] **Step 3: 提交项目文档更新**

Run:

```powershell
git add -- CHANGELOG.md docs/superpowers/plans/2026-09-09-obsidian-vault-implementation.md
git diff --cached --check
git commit -m "docs: 记录 Obsidian 知识库创建结果"
```

Expected: 提交仅包含计划执行状态和 `CHANGELOG.md`，不包含已有的无关未跟踪文件。

- [ ] **Step 4: 最终交付检查**

Run:

```powershell
Test-Path 'C:\Users\24315\Desktop\AI\obsidian-vault\首页.md'
git -C 'C:\Users\24315\Desktop\AI\obsidian-vault' status --short
gh repo view dongjinyue/obsidian-vault --json visibility,url
```

Expected: 首页存在；知识库 Git 工作区干净；远程仓库可见性再次确认为 `PRIVATE`。
