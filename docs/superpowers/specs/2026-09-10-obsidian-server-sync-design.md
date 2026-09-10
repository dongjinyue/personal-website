# Obsidian 私有知识库服务器只读同步设计

## 目标

让腾讯云服务器以最小权限定期读取 GitHub 私有仓库 `dongjinyue/obsidian-vault`，并将 Markdown 知识库同步到服务器本地目录，为后续 MY SPACE 网站解析笔记做好准备。

本阶段只建立安全、可观察、失败时不覆盖内容的同步链路，不修改网站页面，不解析 Markdown，也不向访客公开任何知识库内容。

## 边界与原则

- GitHub 私有仓库继续作为知识库远程权威来源。
- Windows 上的 Obsidian 是唯一编辑入口，服务器目录只读使用，不在服务器直接修改笔记。
- 服务器只能读取 `dongjinyue/obsidian-vault`，不能向仓库推送。
- 不在服务器保存 GitHub PAT（访问令牌）。
- 同步失败时保留服务器上最后一次成功版本，不执行强制重置或删除。
- 网站读取与 `public/private` 权限过滤属于后续独立任务。

## 选择的认证方式

使用 GitHub Deploy Key（部署密钥），并在仓库设置中保持只读权限。

服务器生成一对专用 Ed25519 SSH 密钥：

```text
/home/ubuntu/.ssh/obsidian_vault_deploy
/home/ubuntu/.ssh/obsidian_vault_deploy.pub
```

私钥始终保留在服务器，权限为 `600`；公钥添加到 `dongjinyue/obsidian-vault` 的 Deploy Keys，`read_only` 必须为 `true`。这把密钥不复用于网站代码仓库、其他 GitHub 仓库或用户登录。

## 服务器目录

知识库固定克隆到：

```text
/home/ubuntu/content/obsidian-vault
```

目录归属为 `ubuntu:ubuntu`。网站未来只从该目录读取 Markdown 和附件，不读取 `.git` 或 `.obsidian` 中的设备状态。

## SSH 连接配置

在 `/home/ubuntu/.ssh/config` 中增加独立别名：

```sshconfig
Host github-obsidian-vault
    HostName github.com
    User git
    IdentityFile ~/.ssh/obsidian_vault_deploy
    IdentitiesOnly yes
```

同步仓库使用以下只读地址：

```text
git@github-obsidian-vault:dongjinyue/obsidian-vault.git
```

GitHub 主机指纹必须通过 `ssh-keyscan` 获取后与 GitHub 官方公布的指纹核对，再写入 `known_hosts`。不能使用 `StrictHostKeyChecking=no` 跳过主机验证。

## 首次克隆

首次克隆前依次验证：

1. 本地目标目录不存在。
2. Deploy Key 已在 GitHub 设置为只读。
3. `ssh -T git@github-obsidian-vault` 能通过身份验证。
4. 使用 SSH 别名克隆私有仓库。
5. 克隆后的分支为 `main`，工作区干净，远程地址不包含令牌。

如果目标目录已经存在，实施必须停止检查，不能覆盖或合并未知内容。

## 更新脚本

创建可执行脚本：

```text
/home/ubuntu/bin/update-obsidian-vault.sh
```

脚本行为：

1. 使用严格 Shell 模式，任一步失败即退出。
2. 确认目标目录是 Git 仓库。
3. 确认服务器工作区没有本地修改。
4. 执行 `git fetch origin main`。
5. 执行 `git merge --ff-only origin/main`。
6. 输出本次同步后的提交哈希。

选择 `fetch + merge --ff-only` 而不是 `reset --hard`，是为了在服务器出现意外本地修改或分支分叉时安全停止，不覆盖文件。失败时最后一次成功同步的内容仍然保留。

脚本不输出笔记正文、环境变量、私钥内容或 GitHub 凭据。

## systemd 定时同步

创建两个系统单元：

```text
/etc/systemd/system/obsidian-vault-sync.service
/etc/systemd/system/obsidian-vault-sync.timer
```

Service（服务）特性：

- 使用 `ubuntu` 用户执行更新脚本。
- 类型为一次性任务，执行结束后退出。
- 将正常输出和错误写入 systemd journal。
- 不以 root 身份运行 Git 操作。

Timer（定时器）特性：

- 开机后约 2 分钟执行第一次同步。
- 每 5 分钟再次执行。
- 使用 `Persistent=true`，服务器关机期间错过的任务会在下次启动后补执行一次。
- 同一个 Service 不会并行执行，从而避免两个 Git 更新同时操作仓库。

## 数据流

```text
Windows Obsidian
  → Git commit / push
  → GitHub 私有仓库
  → 只读 Deploy Key
  → systemd timer 每 5 分钟触发
  → update-obsidian-vault.sh
  → /home/ubuntu/content/obsidian-vault
```

网站未来只消费服务器同步完成后的目录，不参与 Git 认证和拉取过程。

## 错误处理与观察

- GitHub 无法连接：本次任务失败，保留旧版本，等待下次定时重试。
- 服务器目录有本地修改：任务失败并记录原因，不覆盖修改。
- 远程历史无法快进：任务失败并记录原因，由管理员人工检查。
- Deploy Key 被移除或失效：SSH 认证失败，旧内容继续可用。
- 磁盘不足：Git 命令失败，系统日志保留错误信息。

常用只读检查：

```bash
systemctl status obsidian-vault-sync.timer
systemctl status obsidian-vault-sync.service
journalctl -u obsidian-vault-sync.service --no-pager -n 50
git -C /home/ubuntu/content/obsidian-vault status --short --branch
git -C /home/ubuntu/content/obsidian-vault log -1 --oneline
```

## 安全检查

- GitHub Deploy Key 显示 `read_only: true`。
- 私钥权限为 `600`，`.ssh` 目录为 `700`。
- SSH 配置权限不宽于 `600`。
- Git 远程地址使用 SSH 别名且不包含令牌。
- 更新脚本归属 `ubuntu:ubuntu`，只有所有者可写。
- systemd 服务明确指定 `User=ubuntu`。
- 服务日志不包含笔记正文、密钥或环境变量。

## 验证方案

1. 手动运行同步脚本，确认退出状态为 0。
2. 检查服务器仓库为 `main` 且工作区干净。
3. 检查服务器最新提交与 GitHub `main` 一致。
4. 检查 Timer 已启用，并显示下一次执行时间。
5. 等待一次定时执行，确认 Service 成功完成。
6. 在服务器创建一个临时的未跟踪验证文件，确认脚本按设计拒绝同步；随后使用明确路径删除该验证文件并再次确认同步恢复。此验证文件不进入知识库仓库，也不包含真实内容。
7. 再次查询 GitHub Deploy Key，确认仍为只读。

第 6 步涉及创建和删除临时文件，实施时必须先精确确认文件路径，并只操作专用验证文件。

## 完成标准

- 服务器使用专用 Deploy Key 成功读取唯一的 Obsidian 私有仓库。
- 知识库存在于 `/home/ubuntu/content/obsidian-vault`，分支为 `main` 且工作区干净。
- 更新脚本只接受快进更新，并能拒绝存在本地修改的工作区。
- systemd Timer 每 5 分钟触发，服务以 `ubuntu` 用户执行。
- 首次手动同步与至少一次定时同步均成功。
- GitHub Deploy Key 保持只读。
- 不修改网站功能，不公开笔记，不声称知识库已经接入网站。
