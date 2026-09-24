# Linux 云服务器服务排查命令速查表

本文适用于常见的 Linux 云服务器，例如 Ubuntu、Debian、CentOS 和 Rocky Linux。排查服务器启动了哪些服务时，建议依次检查：系统服务、监听端口、运行进程、容器、定时任务、防火墙和日志。

> 提示：带有 `sudo` 的命令需要管理员权限。停止、重启或禁用服务会改变服务器状态，执行前请确认服务名称及影响。

## 1. 查看正在运行的系统服务

查看当前正在运行的 systemd（系统与服务管理器）服务：

```bash
systemctl list-units --type=service --state=running
```

- `--type=service`：只显示服务。
- `--state=running`：只显示正在运行的服务。

查看所有已安装的服务，包括未启动的服务：

```bash
systemctl list-unit-files --type=service
```

查看设置为开机自动启动的服务：

```bash
systemctl list-unit-files --type=service --state=enabled
```

查看启动失败的服务：

```bash
systemctl --failed
```

查看某个服务的详细状态，以 Nginx（Web 服务器）为例：

```bash
sudo systemctl status nginx
```

常用服务管理命令：

```bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
sudo systemctl disable nginx
```

这些命令依次表示启动、停止、重启、设置开机启动和取消开机启动。

## 2. 查看正在监听的端口

下面是排查服务器对外提供了哪些服务时最重要的命令：

```bash
sudo ss -lntup
```

- `-l`：只显示监听中的端口。
- `-n`：直接显示端口号，不将其转换为服务名称。
- `-t`：显示 TCP（传输控制协议）端口。
- `-u`：显示 UDP（用户数据报协议）端口。
- `-p`：显示占用端口的进程。

常见端口如下：

| 端口 | 常见服务 |
| ---: | --- |
| 22 | SSH（远程登录） |
| 80 | HTTP（普通网站访问） |
| 443 | HTTPS（加密网站访问） |
| 3000、8080 | Web 应用或开发服务器 |
| 3306 | MySQL（数据库） |
| 5432 | PostgreSQL（数据库） |
| 6379 | Redis（缓存数据库） |

检查某个端口，以 `3000` 为例：

```bash
sudo ss -lntup | grep ':3000'
```

也可以使用 `lsof` 查看占用端口的程序：

```bash
sudo lsof -i :3000
```

监听地址的含义：

- `127.0.0.1:3000`：只有服务器本机可以访问。
- `0.0.0.0:3000`：所有 IPv4（互联网协议第四版）网卡均在监听，可能允许外部访问。
- `[::]:3000`：IPv6（互联网协议第六版）地址正在监听；是否同时接受 IPv4 连接取决于系统配置。

## 3. 查看正在运行的进程

显示全部进程：

```bash
ps aux
```

查看 CPU 使用率最高的 20 个进程：

```bash
ps aux --sort=-%cpu | head -20
```

查看内存使用率最高的 20 个进程：

```bash
ps aux --sort=-%mem | head -20
```

动态查看 CPU、内存和进程：

```bash
top
```

如果服务器安装了 `htop`，可以使用更直观的交互界面：

```bash
htop
```

按名称查找程序：

```bash
pgrep -a nginx
pgrep -a node
pgrep -a python
```

`-a` 会同时显示进程的完整启动命令。

## 4. 查看 Docker 容器

如果应用通过 Docker（容器平台）运行，查看正在运行的容器：

```bash
sudo docker ps
```

查看全部容器，包括已经停止的容器：

```bash
sudo docker ps -a
```

查看容器映射的端口：

```bash
sudo docker port 容器名称
```

查看容器最近 100 行日志：

```bash
sudo docker logs --tail 100 容器名称
```

持续观察容器日志：

```bash
sudo docker logs -f 容器名称
```

如果使用 Docker Compose（多容器编排工具），请在包含 `compose.yaml` 或 `docker-compose.yml` 的目录执行：

```bash
sudo docker compose ps
```

## 5. 查看服务日志

查看某个服务最近 100 行日志，以 Nginx 为例：

```bash
sudo journalctl -u nginx -n 100 --no-pager
```

- `-u nginx`：指定服务。
- `-n 100`：显示最后 100 行。
- `--no-pager`：直接输出，不进入翻页界面。

持续观察服务的新日志：

```bash
sudo journalctl -u nginx -f
```

查看本次开机以来的错误日志：

```bash
sudo journalctl -b -p err
```

## 6. 查看其他启动方式

一些程序不是 systemd 服务，可能由进程管理器或定时任务启动。

查看 PM2（Node.js 进程管理器）管理的程序：

```bash
pm2 list
```

查看 Supervisor（进程管理器）管理的程序：

```bash
sudo supervisorctl status
```

查看当前用户的 Cron（定时任务）：

```bash
crontab -l
```

查看 `root` 用户的定时任务：

```bash
sudo crontab -l
```

查看系统级定时任务目录：

```bash
ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly
```

查看 systemd 定时器：

```bash
systemctl list-timers --all
```

查看传统启动脚本：

```bash
ls -la /etc/rc.local /etc/init.d 2>/dev/null
```

## 7. 查看防火墙规则

Ubuntu、Debian 常见的 UFW（简化防火墙）命令：

```bash
sudo ufw status verbose
```

CentOS、Rocky Linux 常见的 firewalld（动态防火墙管理器）命令：

```bash
sudo firewall-cmd --list-all
```

查看 nftables（Linux 防火墙框架）规则：

```bash
sudo nft list ruleset
```

服务器系统防火墙允许某个端口，不代表云平台一定允许外部访问。还需要在阿里云、腾讯云、华为云、AWS 等云平台控制台检查安全组的入站规则。

## 8. 一组常用的快速排查命令

依次执行下面的命令，通常可以较完整地了解服务器正在运行的内容：

```bash
hostnamectl
systemctl --failed
systemctl list-units --type=service --state=running
systemctl list-unit-files --type=service --state=enabled
sudo ss -lntup
ps aux --sort=-%cpu | head -20
ps aux --sort=-%mem | head -20
sudo docker ps -a
systemctl list-timers --all
```

其中最关键的是：

```bash
sudo ss -lntup
```

它可以直接显示哪些程序正在通过哪些端口提供服务。找到进程或服务名称后，再使用下面的命令继续调查：

```bash
sudo systemctl status 服务名
sudo journalctl -u 服务名 -n 100 --no-pager
```

## 9. 推荐排查顺序

1. 使用 `systemctl --failed` 检查是否存在启动失败的服务。
2. 使用 `sudo ss -lntup` 找出监听端口及对应进程。
3. 使用 `systemctl status` 查看目标服务的运行状态。
4. 使用 `journalctl` 查看服务日志和报错原因。
5. 使用 `docker ps -a`、`pm2 list` 等命令检查非 systemd 管理的程序。
6. 检查服务器防火墙和云平台安全组，确认端口是否允许外部访问。
