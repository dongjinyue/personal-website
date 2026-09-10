# Obsidian 私有知识库服务器只读同步实施计划

## 执行状态（2026-09-10）

- 状态：已完成并通过端到端验证。
- Deploy Key（部署密钥）：`Tencent Cloud Obsidian read-only sync`，GitHub 返回 `read_only: true` 与 `verified: true`。
- 服务器目录：`/home/ubuntu/content/obsidian-vault`。
- 首次同步提交：`a2bd8bfe05531a18244004affb933e2262a57362`。
- Timer（定时器）：`obsidian-vault-sync.timer` 已启用且处于运行状态，并已自动成功执行一次。
- 失败保护：服务器工作区存在本地文件时同步会拒绝执行；精确删除测试文件后可正常恢复。
- 边界：网站尚未读取或公开知识库内容。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让腾讯云服务器使用仓库专用的只读 Deploy Key，每 5 分钟安全同步一次 `dongjinyue/obsidian-vault` 到服务器本地目录。

**Architecture:** 同步逻辑作为可测试的 Shell 脚本保存在 MY SPACE 仓库，服务器只安装脚本和 systemd 单元。GitHub Deploy Key 只授权读取一个仓库；更新采用 `fetch + merge --ff-only`，遇到服务器本地修改或分支分叉时失败并保留最后一次成功内容。

**Tech Stack:** Bash、Git、GitHub Deploy Key、OpenSSH、systemd、GitHub CLI、PowerShell

**Spec:** `docs/superpowers/specs/2026-09-10-obsidian-server-sync-design.md`

## Global Constraints

- GitHub 仓库固定为 `dongjinyue/obsidian-vault`，Deploy Key 必须保持 `read_only: true`。
- 服务器固定为当前腾讯云 Ubuntu 24.04 主机，执行用户为 `ubuntu`。
- 知识库固定克隆到 `/home/ubuntu/content/obsidian-vault`。
- 私钥固定为 `/home/ubuntu/.ssh/obsidian_vault_deploy`，权限为 `600`。
- SSH 别名固定为 `github-obsidian-vault`，不得使用 `StrictHostKeyChecking=no`。
- 更新脚本固定为 `/home/ubuntu/bin/update-obsidian-vault.sh`。
- Timer 每 5 分钟触发，Service 必须使用 `User=ubuntu`。
- 服务器工作区存在任何已跟踪或未跟踪修改时，同步脚本必须失败，不覆盖内容。
- 本阶段不修改网站页面、不解析 Markdown、不公开知识库内容。
- 不读取或输出笔记正文、私钥、环境变量或访问令牌。

---

### Task 1: 编写并测试同步脚本与 systemd 单元

**Files:**
- Create: `ops/obsidian-sync/update-obsidian-vault.sh`
- Create: `ops/obsidian-sync/obsidian-vault-sync.service`
- Create: `ops/obsidian-sync/obsidian-vault-sync.timer`
- Create: `tests/ops/obsidian-sync.test.sh`

**Interfaces:**
- Consumes: 环境变量 `OBSIDIAN_VAULT_DIR`，未设置时使用 `/home/ubuntu/content/obsidian-vault`。
- Produces: 退出码 `0` 表示同步成功；非 `0` 表示目录无效、工作区不干净、网络失败或无法快进。

- [ ] **Step 1: 编写失败测试**

创建 `tests/ops/obsidian-sync.test.sh`：

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_UNDER_TEST="${1:?请传入同步脚本路径}"
readonly TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "${TEST_ROOT}"' EXIT

readonly REMOTE_REPO="${TEST_ROOT}/remote.git"
readonly SEED_REPO="${TEST_ROOT}/seed"
readonly VAULT_REPO="${TEST_ROOT}/vault"

git init --bare --initial-branch=main "${REMOTE_REPO}" >/dev/null
git init --initial-branch=main "${SEED_REPO}" >/dev/null
git -C "${SEED_REPO}" config user.name "Sync Test"
git -C "${SEED_REPO}" config user.email "sync-test@example.invalid"
printf '# 初始内容\n' > "${SEED_REPO}/README.md"
git -C "${SEED_REPO}" add README.md
git -C "${SEED_REPO}" commit -m "initial" >/dev/null
git -C "${SEED_REPO}" remote add origin "${REMOTE_REPO}"
git -C "${SEED_REPO}" push -u origin main >/dev/null
git clone "${REMOTE_REPO}" "${VAULT_REPO}" >/dev/null

printf '本地修改\n' > "${VAULT_REPO}/local-only.md"
if OBSIDIAN_VAULT_DIR="${VAULT_REPO}" "${SCRIPT_UNDER_TEST}" >"${TEST_ROOT}/dirty.out" 2>&1; then
  echo 'FAIL: 工作区存在未跟踪文件时脚本仍然成功。' >&2
  exit 1
fi
grep -F '工作区存在本地修改，停止同步。' "${TEST_ROOT}/dirty.out" >/dev/null
rm "${VAULT_REPO}/local-only.md"

printf '# 远程更新\n' > "${SEED_REPO}/README.md"
git -C "${SEED_REPO}" add README.md
git -C "${SEED_REPO}" commit -m "update" >/dev/null
git -C "${SEED_REPO}" push >/dev/null

OBSIDIAN_VAULT_DIR="${VAULT_REPO}" "${SCRIPT_UNDER_TEST}" >"${TEST_ROOT}/sync.out"
test "$(git -C "${VAULT_REPO}" rev-parse HEAD)" = "$(git -C "${REMOTE_REPO}" rev-parse main)"
grep -E '^obsidian-vault synced to [0-9a-f]+$' "${TEST_ROOT}/sync.out" >/dev/null
test -z "$(git -C "${VAULT_REPO}" status --porcelain --untracked-files=normal)"

echo 'PASS: dirty-worktree guard and fast-forward sync'
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' tests/ops/obsidian-sync.test.sh ops/obsidian-sync/update-obsidian-vault.sh
```

Expected: FAIL，因为同步脚本尚不存在。

- [ ] **Step 3: 实现最小同步脚本**

创建 `ops/obsidian-sync/update-obsidian-vault.sh`：

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

readonly VAULT_DIR="${OBSIDIAN_VAULT_DIR:-/home/ubuntu/content/obsidian-vault}"

if [[ ! -d "${VAULT_DIR}/.git" ]]; then
  echo "知识库目录不是 Git 仓库：${VAULT_DIR}" >&2
  exit 1
fi

# 服务器是只读副本；出现本地修改时停止，避免覆盖未知内容。
if [[ -n "$(git -C "${VAULT_DIR}" status --porcelain --untracked-files=normal)" ]]; then
  echo '工作区存在本地修改，停止同步。' >&2
  exit 1
fi

git -C "${VAULT_DIR}" fetch --quiet origin main
git -C "${VAULT_DIR}" merge --ff-only --quiet origin/main

printf 'obsidian-vault synced to %s\n' "$(git -C "${VAULT_DIR}" rev-parse --short HEAD)"
```

- [ ] **Step 4: 创建 systemd Service**

创建 `ops/obsidian-sync/obsidian-vault-sync.service`：

```ini
[Unit]
Description=Sync the private Obsidian vault from GitHub
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=ubuntu
Group=ubuntu
ExecStart=/home/ubuntu/bin/update-obsidian-vault.sh
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/ubuntu/content/obsidian-vault
```

- [ ] **Step 5: 创建 systemd Timer**

创建 `ops/obsidian-sync/obsidian-vault-sync.timer`：

```ini
[Unit]
Description=Run Obsidian vault sync every five minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30s
Persistent=true
Unit=obsidian-vault-sync.service

[Install]
WantedBy=timers.target
```

- [ ] **Step 6: 运行测试并确认通过**

Run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -n ops/obsidian-sync/update-obsidian-vault.sh
& 'C:\Program Files\Git\bin\bash.exe' -n tests/ops/obsidian-sync.test.sh
& 'C:\Program Files\Git\bin\bash.exe' tests/ops/obsidian-sync.test.sh ops/obsidian-sync/update-obsidian-vault.sh
```

Expected: 两次语法检查退出码为 0，测试输出 `PASS: dirty-worktree guard and fast-forward sync`。

- [ ] **Step 7: 提交同步资产**

```powershell
git add -- ops/obsidian-sync tests/ops/obsidian-sync.test.sh
git diff --cached --check
git commit -m "feat: 添加 Obsidian 只读同步服务"
```

Expected: 提交只包含四个同步资产文件。

---

### Task 2: 创建并注册仓库专用只读 Deploy Key

**Files:**
- Create on server: `/home/ubuntu/.ssh/obsidian_vault_deploy`
- Create on server: `/home/ubuntu/.ssh/obsidian_vault_deploy.pub`
- Modify on server: `/home/ubuntu/.ssh/config`
- Modify on server: `/home/ubuntu/.ssh/known_hosts`
- Modify on GitHub: repository Deploy Keys for `dongjinyue/obsidian-vault`

**Interfaces:**
- Consumes: GitHub 官方 Ed25519 主机指纹 `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`。
- Produces: SSH 别名 `github-obsidian-vault`，只读访问 `dongjinyue/obsidian-vault`。

- [ ] **Step 1: 再次检查冲突**

Run over SSH:

```bash
test ! -e /home/ubuntu/.ssh/obsidian_vault_deploy
test ! -e /home/ubuntu/.ssh/obsidian_vault_deploy.pub
test ! -e /home/ubuntu/content/obsidian-vault
```

Run locally:

```powershell
gh api repos/dongjinyue/obsidian-vault/keys --jq '.[] | select(.title == "Tencent Cloud Obsidian read-only sync")'
```

Expected: 所有服务器检查退出码为 0；GitHub 查询无输出。任一目标已存在时停止，不覆盖。

- [ ] **Step 2: 在服务器生成专用密钥**

Run over SSH as `ubuntu`:

```bash
ssh-keygen -t ed25519 -f /home/ubuntu/.ssh/obsidian_vault_deploy -N '' -C 'obsidian-vault-read-only@tencent-cloud'
chmod 600 /home/ubuntu/.ssh/obsidian_vault_deploy
chmod 644 /home/ubuntu/.ssh/obsidian_vault_deploy.pub
```

Expected: 私钥与公钥生成成功，私钥内容不输出。

- [ ] **Step 3: 获取并验证 GitHub 主机指纹**

Run over SSH:

```bash
ssh-keyscan -t ed25519 github.com > /tmp/github-obsidian-ed25519.key
ssh-keygen -lf /tmp/github-obsidian-ed25519.key -E sha256
```

Expected: 输出指纹必须严格等于 GitHub 官方公布的 `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`。不一致时停止，不能写入 `known_hosts`。官方依据：[GitHub SSH key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)。

- [ ] **Step 4: 写入主机密钥与 SSH 别名**

确认 `/home/ubuntu/.ssh/config` 尚无 `Host github-obsidian-vault` 后，追加：

```sshconfig
Host github-obsidian-vault
    HostName github.com
    User git
    IdentityFile ~/.ssh/obsidian_vault_deploy
    IdentitiesOnly yes
```

将已经验证的 `/tmp/github-obsidian-ed25519.key` 追加到 `/home/ubuntu/.ssh/known_hosts`，随后执行：

```bash
chmod 600 /home/ubuntu/.ssh/config /home/ubuntu/.ssh/known_hosts
rm /tmp/github-obsidian-ed25519.key
```

Expected: SSH 配置语法可由 `ssh -G github-obsidian-vault` 正常解析；临时文件已经删除。

- [ ] **Step 5: 向 GitHub 添加只读 Deploy Key**

在本地 PowerShell 中读取服务器公钥到内存并提交到 GitHub：

```powershell
$publicKey = ssh -i 'C:\Users\24315\Desktop\AI\AI学习\CloudServices.pem' ubuntu@182.254.159.50 'cat /home/ubuntu/.ssh/obsidian_vault_deploy.pub'
gh api --method POST repos/dongjinyue/obsidian-vault/keys -f title='Tencent Cloud Obsidian read-only sync' -f key="$publicKey" -F read_only=true
```

Expected: GitHub 返回新 Deploy Key，字段 `read_only` 为 `true`。公钥可以公开，但不把它写入项目文件。

- [ ] **Step 6: 验证认证与最小权限**

Run over SSH:

```bash
ssh -T git@github-obsidian-vault
```

Expected: GitHub 提示认证成功但不提供 Shell；该命令通常返回非 0，因此以提示内容确认身份。

Run locally:

```powershell
gh api repos/dongjinyue/obsidian-vault/keys --jq '.[] | select(.title == "Tencent Cloud Obsidian read-only sync") | {title, read_only, verified}'
```

Expected: `read_only` 为 `true`。

---

### Task 3: 首次克隆并安装定时服务

**Files:**
- Create on server: `/home/ubuntu/content/obsidian-vault/`
- Create on server: `/home/ubuntu/bin/update-obsidian-vault.sh`
- Create on server: `/etc/systemd/system/obsidian-vault-sync.service`
- Create on server: `/etc/systemd/system/obsidian-vault-sync.timer`

**Interfaces:**
- Consumes: Task 1 的四个同步资产、Task 2 的 SSH 别名和 Deploy Key。
- Produces: 服务器知识库副本与已启用的五分钟定时更新服务。

- [ ] **Step 1: 创建父目录并克隆仓库**

Run over SSH:

```bash
mkdir -p /home/ubuntu/content /home/ubuntu/bin
git clone git@github-obsidian-vault:dongjinyue/obsidian-vault.git /home/ubuntu/content/obsidian-vault
git -C /home/ubuntu/content/obsidian-vault switch main
```

Expected: 仓库克隆成功，当前分支为 `main`。

- [ ] **Step 2: 传输部署资产到服务器临时目录**

Run locally from MY SPACE repository:

```powershell
scp -i 'C:\Users\24315\Desktop\AI\AI学习\CloudServices.pem' ops/obsidian-sync/update-obsidian-vault.sh ubuntu@182.254.159.50:/tmp/update-obsidian-vault.sh
scp -i 'C:\Users\24315\Desktop\AI\AI学习\CloudServices.pem' ops/obsidian-sync/obsidian-vault-sync.service ubuntu@182.254.159.50:/tmp/obsidian-vault-sync.service
scp -i 'C:\Users\24315\Desktop\AI\AI学习\CloudServices.pem' ops/obsidian-sync/obsidian-vault-sync.timer ubuntu@182.254.159.50:/tmp/obsidian-vault-sync.timer
```

Expected: 三个文件成功传输，不传输其他项目文件。

- [ ] **Step 3: 校验并安装脚本和 systemd 单元**

Run over SSH:

```bash
bash -n /tmp/update-obsidian-vault.sh
sudo systemd-analyze verify /tmp/obsidian-vault-sync.service /tmp/obsidian-vault-sync.timer
install -m 0755 /tmp/update-obsidian-vault.sh /home/ubuntu/bin/update-obsidian-vault.sh
sudo install -o root -g root -m 0644 /tmp/obsidian-vault-sync.service /etc/systemd/system/obsidian-vault-sync.service
sudo install -o root -g root -m 0644 /tmp/obsidian-vault-sync.timer /etc/systemd/system/obsidian-vault-sync.timer
rm /tmp/update-obsidian-vault.sh /tmp/obsidian-vault-sync.service /tmp/obsidian-vault-sync.timer
```

Expected: 语法与 systemd 校验无错误；脚本归属 `ubuntu:ubuntu`，系统单元归属 `root:root`。

- [ ] **Step 4: 手动运行一次同步**

Run over SSH:

```bash
/home/ubuntu/bin/update-obsidian-vault.sh
git -C /home/ubuntu/content/obsidian-vault status --short --branch
git -C /home/ubuntu/content/obsidian-vault log -1 --oneline
```

Expected: 输出 `obsidian-vault synced to <短哈希>`；分支为 `main`，工作区干净。

- [ ] **Step 5: 启用 Timer**

Run over SSH:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now obsidian-vault-sync.timer
systemctl status obsidian-vault-sync.timer --no-pager
systemctl list-timers obsidian-vault-sync.timer --no-pager
```

Expected: Timer 为 `active (waiting)`，已显示下一次执行时间。

- [ ] **Step 6: 提交安装记录**

修改 `CHANGELOG.md`，只记录已经验证的事实：只读 Deploy Key、服务器克隆目录和定时器已经启用；明确网站尚未读取或公开知识库。

```powershell
git add -- CHANGELOG.md
git diff --cached --check
git commit -m "docs: 记录 Obsidian 服务器同步部署"
```

---

### Task 4: 端到端失败保护与定时执行验证

**Files:**
- Temporary on server: `/home/ubuntu/content/obsidian-vault/.codex-sync-guard-check`
- Modify: `docs/superpowers/plans/2026-09-10-obsidian-server-sync-implementation.md`（记录真实执行结果）

**Interfaces:**
- Consumes: Task 3 已启用的 Service 和 Timer。
- Produces: 已验证的失败保护、定时执行、GitHub 只读权限和干净工作区。

- [ ] **Step 1: 验证本地修改保护**

Run over SSH:

```bash
touch /home/ubuntu/content/obsidian-vault/.codex-sync-guard-check
if /home/ubuntu/bin/update-obsidian-vault.sh; then
  echo 'FAIL: dirty worktree was accepted' >&2
  exit 1
fi
```

Expected: 脚本输出“工作区存在本地修改，停止同步。”并返回非 0。

- [ ] **Step 2: 精确删除验证文件并恢复同步**

删除前必须确认解析后的文件严格等于：

```text
/home/ubuntu/content/obsidian-vault/.codex-sync-guard-check
```

随后执行：

```bash
rm -- /home/ubuntu/content/obsidian-vault/.codex-sync-guard-check
/home/ubuntu/bin/update-obsidian-vault.sh
```

Expected: 验证文件删除后同步恢复成功。

- [ ] **Step 3: 等待并验证一次 Timer 执行**

使用不超过 60 秒的分段等待或根据 `systemctl list-timers` 的下一次时间检查，不进行高频轮询：

```bash
systemctl show obsidian-vault-sync.service -p Result -p ExecMainStatus -p ActiveEnterTimestamp
journalctl -u obsidian-vault-sync.service --no-pager -n 20
```

Expected: `Result=success`、`ExecMainStatus=0`，日志只包含提交哈希和服务状态，不包含笔记正文或凭据。

- [ ] **Step 4: 比较服务器与 GitHub 提交**

Run locally:

```powershell
$serverHead = ssh -i 'C:\Users\24315\Desktop\AI\AI学习\CloudServices.pem' ubuntu@182.254.159.50 'git -C /home/ubuntu/content/obsidian-vault rev-parse HEAD'
$githubHead = gh api repos/dongjinyue/obsidian-vault/commits/main --jq .sha
if ($serverHead -ne $githubHead) { throw '服务器知识库版本与 GitHub main 不一致。' }
```

Expected: 两个完整提交哈希相同。

- [ ] **Step 5: 最终安全状态检查**

Run over SSH and locally:

```bash
stat -c '%a %U:%G %n' /home/ubuntu/.ssh/obsidian_vault_deploy /home/ubuntu/.ssh/config /home/ubuntu/.ssh/known_hosts /home/ubuntu/bin/update-obsidian-vault.sh
git -C /home/ubuntu/content/obsidian-vault status --short --branch
systemctl is-enabled obsidian-vault-sync.timer
systemctl is-active obsidian-vault-sync.timer
```

```powershell
gh api repos/dongjinyue/obsidian-vault/keys --jq '.[] | select(.title == "Tencent Cloud Obsidian read-only sync") | {title, read_only, verified}'
git diff --check
git status --short
```

Expected: 私钥和 SSH 配置权限为 `600`；脚本权限为 `755`；仓库干净；Timer 为 `enabled` 和 `active`；Deploy Key 为只读；用户已有的无关未跟踪文件仍未被修改。

- [ ] **Step 6: 更新计划执行状态并提交**

用 `apply_patch` 在本计划顶部增加执行状态，记录实际 Deploy Key 标题、服务器目录、首次同步提交哈希和 Timer 验证结果，不记录公钥、私钥或笔记内容。

```powershell
git add -- docs/superpowers/plans/2026-09-10-obsidian-server-sync-implementation.md
git diff --cached --check
git commit -m "docs: 完成 Obsidian 服务器同步验证"
```

Expected: 提交只包含计划执行状态。
