# 腾讯云自动部署初始化

本文配置 GitHub Actions（GitHub 自动化工作流）在 `main` 有新提交时，把个人网站更新到腾讯云。部署通过专用 SSH（安全外壳协议）密钥登录 `ubuntu`，服务器只允许自动化重启 `personal-website.service`。

> 目前服务器上的网站由 PM2 管理，且同一个 PM2 实例还运行 QQ 转发器。请严格按顺序只切换 `personal-website`；不要停止 PM2 总服务，也不要复用管理员私钥 `CloudServices.pem` 作为自动部署密钥。

## 服务器一次性初始化

先在服务器上进入项目目录，并确认代码干净、当前为 `main`：

```bash
cd /home/ubuntu/apps/personal-website
git status --short --branch
```

如果显示本地改动，先保留并处理这些改动，不要覆盖。安装项目自带的 systemd 服务文件并让 systemd 校验：

```bash
sudo install -o root -g root -m 0644 ops/deploy/personal-website.service /etc/systemd/system/personal-website.service
sudo systemd-analyze verify /etc/systemd/system/personal-website.service
sudo systemctl daemon-reload
```

给 `ubuntu` 增加仅可重启个人网站服务的免交互权限。以下命令会打开安全编辑器；只加入这一行并保存：

```bash
sudo visudo -f /etc/sudoers.d/personal-website-deploy
```

```text
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart personal-website.service
```

然后确认规则语法有效：

```bash
sudo chmod 0440 /etc/sudoers.d/personal-website-deploy
sudo visudo -c
```

确认输出包含 `parsed OK` 后，再进行网站进程切换。这个步骤会让网站短暂重启，但不会停止 PM2 总服务或 QQ 转发器：

```bash
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 stop personal-website
sudo systemctl enable --now personal-website.service
systemctl is-active personal-website.service
curl --fail --show-error --silent http://127.0.0.1:3000/ --output /dev/null
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 list
```

期望 systemd 返回 `active`、网页检查退出码为 0，且 `pm2 list` 中 QQ 转发器仍在线。如果新服务没有通过检查，立即回退网站进程：

```bash
sudo systemctl stop personal-website.service
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 restart personal-website
```

只有新服务已通过健康检查后，才从 PM2 中移除旧的网站进程定义并保存；再次确认 QQ 转发器仍在线：

```bash
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 delete personal-website
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 save
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 list
```

systemd 会在开机时运行网站。新闻与 Obsidian 定时器、网站环境文件 `.env.local`、Nginx（网页反向代理）及其他 PM2 应用不需要修改。

## 创建专用部署密钥

在自己的 Windows 电脑上创建一对仅用于 GitHub Actions 的密钥，不要把 `CloudServices.pem` 复制、上传或提交到仓库。PowerShell 命令：

```powershell
ssh-keygen -t ed25519 -C "GitHub Actions personal website" -f "$env:USERPROFILE\.ssh\personal-website-deploy"
```

自动化需要无人值守，因此提示设置私钥口令时留空；私钥文件必须妥善保管，之后只写入 GitHub Secret。公钥文件名以 `.pub` 结尾，可以安全地添加到服务器的 `ubuntu` 账号：

```powershell
Get-Content "$env:USERPROFILE\.ssh\personal-website-deploy.pub"
```

将输出的**完整单行公钥**通过现有安全 SSH 登录添加到服务器 `/home/ubuntu/.ssh/authorized_keys` 末尾，保留其他已有行，不要覆盖该文件。该公钥必须限制为只运行部署脚本，并拒绝转发和伪终端；格式如下（把示例公钥替换为刚生成的实际公钥）：

```text
restrict,command="bash /home/ubuntu/apps/personal-website/ops/deploy/deploy-remote.sh /home/ubuntu/apps/personal-website" ssh-ed25519 AAAA... GitHub Actions personal website
```

`restrict` 会关闭端口转发、代理转发和伪终端；`command=` 让此密钥不能获得普通 SSH Shell（命令行），只运行固定部署脚本。脚本只接受标准输入中的 Git bundle（Git 代码包），不接受 GitHub Actions 传来的任意命令。确认权限：

```bash
chmod 700 /home/ubuntu/.ssh
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
```

## 配置 GitHub Actions Secrets

打开 GitHub 仓库 `dongjinyue/personal-website` 的 **Settings → Secrets and variables → Actions**，新增以下 Repository secrets（仓库加密配置项）：

| Secret 名称 | 填写内容 |
| --- | --- |
| `DEPLOY_HOST` | `182.254.159.50` |
| `DEPLOY_PORT` | SSH 端口，当前使用 `22` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | 专用私钥 `personal-website-deploy` 的完整文件内容，包含首尾标记行 |
| `DEPLOY_KNOWN_HOSTS` | 服务器 SSH 主机公钥的一整行，供工作流验证连接的服务器身份 |

主机密钥指纹此前已通过可信 SSH 连接核对为：

```text
SHA256:/uqbI0Im5UhUDap+eCPB1yaCpJxm4VEe9uC+X5Ul/gA
```

可在本机生成候选主机公钥行，并在写入 Secret 前核对其指纹一致：

```powershell
ssh-keyscan -t ed25519 -p 22 182.254.159.50 2>$null | Set-Content "$env:TEMP\personal-website-known-hosts"
ssh-keygen -lf "$env:TEMP\personal-website-known-hosts"
```

只有 `ssh-keygen` 显示的指纹与上方可信指纹相同，才将该文件的一整行内容填入 `DEPLOY_KNOWN_HOSTS`。`ssh-keyscan` 只负责获取候选公钥，本身不验证公钥真假；必须比对指纹。不要把任何私钥写入普通变量、日志、工单或仓库文件。

配置完成后，在 GitHub 的 **Actions → Deploy personal website → Run workflow** 手动触发一次。确认工作流显示部署提交号、服务重启完成并通过健康检查；之后每次推送到 `main` 会自动触发同一流程。并发部署会排队，不会取消正在运行的部署。

部署通过 Actions Runner（工作流执行机器）创建 `main` 的完整 Git bundle，并经 SSH 标准输入传到服务器。服务器当前不能出站访问 GitHub，所以不在服务器上执行 `git fetch`；服务器只从收到的 bundle 快进到 `main`，仍会拒绝本地未提交改动和非快进更新。

远程 SSH 是非交互会话，不会自动加载 NVM 初始化配置；部署脚本会显式将 `/home/ubuntu/.nvm/versions/node/v24.20.0/bin` 加入命令搜索路径，供 `npm ci` 和生产构建使用。

## 失败排查与回退

查看网站服务状态和最近日志：

```bash
systemctl status personal-website.service --no-pager
journalctl -u personal-website.service -n 100 --no-pager
```

工作流会在更新前拒绝服务器脏工作树或非快进更新；先检查服务器代码状态，不要用强制重置解决。依赖安装或构建失败时工作流不会主动重启服务；健康检查失败时，Actions 会标记失败，需要先从服务日志定位问题。

如果必须恢复 PM2 管理，在服务器执行：

```bash
sudo systemctl stop personal-website.service
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 start npm --name personal-website --cwd /home/ubuntu/apps/personal-website -- run start
/home/ubuntu/.nvm/versions/node/v24.20.0/bin/node /home/ubuntu/.nvm/versions/node/v24.20.0/lib/node_modules/pm2/bin/pm2 save
```

本方案直接在现有目录构建，尚不提供零停机切换或自动回滚。若之后把 Node.js 主版本或安装路径改掉，还需同步更新服务单元中的绝对路径。
