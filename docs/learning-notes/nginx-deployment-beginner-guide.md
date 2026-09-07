# Nginx 从零入门：把 Next.js 个人网站部署到腾讯云

适用对象：第一次接触 Linux 服务器、Nginx 和网站部署，希望理解每一步而不只是复制命令的学习者。

配套项目：`personal-website`

示例域名：`dongjinyue.cn`

## 一、这次部署到底在做什么

本项目不是把网页文件直接交给 Nginx，而是由 Next.js 的 Node.js 进程生成页面，再让 Nginx 负责接收公网请求。

完整链路如下：

```text
访客浏览器
↓ 请求 http://dongjinyue.cn
腾讯云防火墙：决定公网请求能否进入服务器
↓ TCP 80 / 443
Ubuntu UFW：服务器内部的第二层端口防护
↓
Nginx：接收域名请求并转发
↓ http://127.0.0.1:3000
Next.js：运行页面、Server Action 和服务端查询
↓
Supabase：提供数据库和身份认证
```

每个组件只承担一种主要职责：

- Next.js 负责网站业务和页面；
- PM2 负责保持 Next.js 进程持续运行；
- Nginx 负责域名入口、反向代理和 HTTPS；
- 腾讯云防火墙和 UFW 负责限制端口访问；
- Supabase 负责云端数据和管理员身份认证。

## 二、为什么不能直接把 3000 端口开放给访客

`npm run start` 默认让 Next.js 监听 `3000` 端口。开发测试时可以直接访问这个端口，但正式网站不推荐这样做：

1. 普通 HTTP 使用 80 端口，HTTPS 使用 443 端口；
2. Nginx 更适合处理公网连接、域名和 TLS 证书；
3. Next.js 可以只在服务器内部被 Nginx 访问；
4. 将来更换应用端口时，访客地址不需要改变；
5. 日志、超时、请求头和安全策略可以集中管理。

这里的 `127.0.0.1` 表示 Loopback（本机回环地址），只能从当前服务器访问：

```text
公网访客 → Nginx:80/443 → 127.0.0.1:3000 → Next.js
```

因此腾讯云防火墙不需要向公网开放 3000 端口。

## 三、Nginx、PM2 和 systemd 的区别

这三个名字经常同时出现，但用途不同：

| 组件 | 简单解释 | 本项目中的作用 |
| --- | --- | --- |
| Nginx | 网站入口和反向代理服务器 | 把域名请求转发给 Next.js |
| PM2 | Node.js 进程管理器 | 在崩溃后重启 Next.js，并保存进程清单 |
| systemd | Ubuntu 系统服务管理器 | 开机时启动 PM2 和 Nginx |

启动关系是：

```text
Ubuntu 开机
├── systemd 启动 nginx.service
└── systemd 启动 pm2-ubuntu.service
    └── PM2 恢复 personal-website
        └── npm start 启动 Next.js
```

## 四、部署前需要具备什么

服务器需要准备：

- Ubuntu Server 24.04 LTS；
- Git；
- Node.js 24 LTS 和 npm；
- Nginx；
- PM2；
- 已克隆的项目代码；
- 只保存在服务器上的 `.env.local`。

本项目所需环境变量：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ADMIN_USER_ID=
```

真实值不得写入本文档、Git 仓库、截图或聊天记录。

## 五、项目第一次安装与构建

进入项目目录：

```bash
cd ~/apps/personal-website
```

- `cd` 表示切换目录；
- `~` 表示当前用户的主目录，本项目对应 `/home/ubuntu`。

严格按照锁文件安装依赖：

```bash
npm ci
```

`npm ci` 适合服务器和自动部署。它要求 `package.json` 与 `package-lock.json` 完全同步，不会随意改变依赖版本。

创建环境文件：

```bash
nano .env.local
```

保存后限制读取权限：

```bash
chmod 600 .env.local
```

`600` 表示只有文件所有者可以读写，其他用户没有权限。

执行生产构建：

```bash
npm run build
```

只有看到编译、TypeScript 检查和页面生成完成，才能进入下一步。构建失败时应修复错误，不应跳过构建直接启动。

## 六、使用 PM2 持续运行 Next.js

安装 PM2：

```bash
npm install -g pm2
```

`-g` 表示为当前 Node.js 环境全局安装，使项目目录外也能执行 `pm2`。

启动应用：

```bash
pm2 start npm --name personal-website -- start
```

参数解释：

- `start npm`：让 PM2 管理 npm 进程；
- `--name personal-website`：给进程设置易读名称；
- 第二个 `--`：后面的 `start` 交给 npm；
- `start`：对应 `package.json` 中的 `next start`。

查看状态：

```bash
pm2 status
```

应用状态应为 `online`。服务器内部测试：

```bash
curl -I http://127.0.0.1:3000
```

返回 `HTTP/1.1 200 OK` 表示 Next.js 已经响应。

## 七、让 PM2 随服务器开机启动

生成 systemd 服务：

```bash
pm2 startup systemd
```

PM2 会输出一条以 `sudo env PATH=...` 开头的命令。必须完整复制该命令，不能只复制中间路径。

保存当前进程清单：

```bash
pm2 save
```

如果 PM2 已经由当前终端手动启动，systemd 首次接管时可能出现：

```text
Can't open PID file /home/ubuntu/.pm2/pm2.pid
Failed with result 'protocol'
```

根因通常不是网站崩溃，而是 systemd 执行 `pm2 resurrect` 时连接到了已经存在的 PM2 后台进程，没有创建 systemd 所等待的 PID 文件。

在已经执行 `pm2 save` 的前提下，可让 systemd 正式接管：

```bash
pm2 kill
sudo systemctl reset-failed pm2-ubuntu
sudo systemctl start pm2-ubuntu
```

`pm2 kill` 会造成几秒钟停机，但不会删除项目代码、环境变量或已保存的进程清单。

验证：

```bash
systemctl status pm2-ubuntu --no-pager
pm2 status
curl -I http://127.0.0.1:3000
```

三项分别应显示 systemd 为 `active (running)`、应用为 `online`、HTTP 返回 200。

## 八、安装和启动 Nginx

安装软件：

```bash
sudo apt install nginx -y
```

- `sudo`：以管理员权限执行；
- `apt install nginx`：从 Ubuntu 软件源安装 Nginx；
- `-y`：自动确认安装提示。

立即启动并设置开机启动：

```bash
sudo systemctl enable --now nginx
```

- `enable`：设置开机自动启动；
- `--now`：不仅设置以后启动，也立即启动本次服务。

检查状态：

```bash
systemctl status nginx --no-pager
```

应显示：

```text
Active: active (running)
```

测试默认页面：

```bash
curl -I http://127.0.0.1
```

返回头中包含 `Server: nginx`，说明 80 端口由 Nginx 响应。

## 九、理解 Nginx 配置目录

Ubuntu 的常见 Nginx 配置结构：

```text
/etc/nginx/
├── nginx.conf               # 全局配置入口
├── sites-available/         # 保存可用的网站配置
├── sites-enabled/           # 保存已启用网站的符号链接
└── snippets/                # 可复用的小段配置
```

推荐做法是：

```text
在 sites-available 创建配置
↓
在 sites-enabled 创建符号链接
↓
nginx -t 检查语法
↓
systemctl reload nginx 平滑加载
```

不要每次直接改 `/etc/nginx/nginx.conf`，否则多个网站的配置会逐渐混在一起。

## 十、为 dongjinyue.cn 创建反向代理

创建网站配置：

```bash
sudo nano /etc/nginx/sites-available/dongjinyue.cn
```

写入：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name dongjinyue.cn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # 把访客原始域名、地址和协议传给 Next.js。
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

关键指令：

- `listen 80`：监听 IPv4 的 HTTP 端口；
- `listen [::]:80`：监听 IPv6 的 HTTP 端口；
- `server_name`：只匹配指定域名；
- `location /`：处理该域名下所有路径；
- `proxy_pass`：把请求交给本机 3000 端口的 Next.js；
- `proxy_set_header`：保留访客请求的必要信息。

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/dongjinyue.cn /etc/nginx/sites-enabled/dongjinyue.cn
```

`ln -s` 创建 Symbolic Link（符号链接），不会复制配置内容。

如果提示 `File exists`，先不要删除文件，应检查现有链接：

```bash
ls -l /etc/nginx/sites-enabled/dongjinyue.cn
```

## 十一、先检查，再重载

每次修改 Nginx 配置后先执行：

```bash
sudo nginx -t
```

正常结果：

```text
syntax is ok
test is successful
```

只有检查通过后才平滑重载：

```bash
sudo systemctl reload nginx
```

`reload` 会让 Nginx 读取新配置，通常不会中断现有连接。配置错误时不要使用 `restart` 强行重启。

在 DNS 生效前，可直接在服务器内部模拟域名请求：

```bash
curl -I -H "Host: dongjinyue.cn" http://127.0.0.1
```

如果返回 200，并且响应中能看到 Next.js 的特征头，说明反向代理链路正确。

## 十二、两层防火墙不要混淆

本项目有两层常见网络入口控制：

```text
公网
↓ 腾讯云轻量应用服务器防火墙
↓ Ubuntu UFW
↓ Nginx
```

腾讯云控制台应放行：

| 协议 | 端口 | 用途 |
| --- | --- | --- |
| TCP | 22 | SSH 远程管理 |
| TCP | 80 | HTTP 网站访问 |
| TCP | 443 | HTTPS 网站访问 |

不要向公网开放 3000、PostgreSQL 数据库端口或其他不需要的管理端口。

查看 Ubuntu UFW 状态：

```bash
sudo ufw status verbose
```

如果 UFW 当前为 `inactive`，启用前必须先允许 SSH，否则可能把自己挡在服务器外：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

`Nginx Full` 同时允许 80 和 443 端口。启用后再次执行 `sudo ufw status verbose` 检查规则。

## 十三、域名解析是什么

DNS（域名系统）负责把易读域名转换成服务器公网 IP：

```text
dongjinyue.cn
↓ A 记录
服务器公网 IPv4
```

根域名的典型记录：

| 记录类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| A | `@` | 服务器公网 IPv4 |

其中 `@` 表示根域名本身，也就是 `dongjinyue.cn`。

解析生效后可以检查：

```bash
getent hosts dongjinyue.cn
```

返回的地址必须与服务器公网 IPv4 一致。DNS 变更可能需要一段时间传播，不能只根据浏览器缓存判断。

## 十四、中国内地服务器与 ICP 备案

本项目使用中国内地地域的腾讯云服务器。域名解析到中国内地云资源并对外提供网站服务前，需要完成 ICP 备案。

推荐顺序：

```text
购买满足备案条件的中国内地云资源
↓
在腾讯云提交 ICP 备案
↓
备案通过
↓
添加域名 A 记录
↓
验证 HTTP
↓
申请 HTTPS 证书
```

备案办理时间和材料要求可能变化，应以腾讯云备案控制台当时给出的要求为准。不要把“域名实名认证完成”和“网站 ICP 备案完成”当成同一件事。

## 十五、配置 HTTPS

只有满足以下条件后再申请证书：

1. `dongjinyue.cn` 已完成所需备案；
2. DNS 已指向当前服务器；
3. 腾讯云防火墙和 UFW 已开放 80、443；
4. `curl -I http://dongjinyue.cn` 可以访问当前网站。

安装 Certbot（证书自动化工具）及 Nginx 插件：

```bash
sudo apt install certbot python3-certbot-nginx -y
```

申请证书并让 Certbot 修改 Nginx 配置：

```bash
sudo certbot --nginx -d dongjinyue.cn
```

过程中需要填写用于证书到期通知的邮箱，并同意服务条款。建议选择将 HTTP 自动跳转到 HTTPS。

检查自动续期计时器：

```bash
systemctl status certbot.timer --no-pager
```

执行不会真正续期的演练：

```bash
sudo certbot renew --dry-run
```

只有 `dry-run` 成功，才能说明当前续期链路具备正常工作的条件。

## 十六、以后如何更新网站

每次本地修改完成并推送到 GitHub 后，在服务器执行：

```bash
cd ~/apps/personal-website
git pull --ff-only origin main
npm ci
npm run build
pm2 reload personal-website --update-env
```

顺序不能随意调整：

1. `git pull --ff-only` 只接受安全的快进更新，避免服务器自动制造合并提交；
2. `npm ci` 按新锁文件同步依赖；
3. `npm run build` 先确认新版本能构建；
4. 构建成功后再让 PM2 重载应用。

如果构建失败，不要执行最后的重载命令，当前线上进程仍会继续使用上一次成功构建的版本。

## 十七、常用状态与日志命令

### 查看 Next.js 状态

```bash
pm2 status
```

### 查看 Next.js 最近日志

```bash
pm2 logs personal-website --lines 100
```

日志会持续显示，按 `Ctrl + C` 退出查看，不会停止网站。

### 查看 Nginx 状态

```bash
systemctl status nginx --no-pager
```

### 查看 Nginx 访问日志

```bash
sudo tail -n 100 /var/log/nginx/access.log
```

### 查看 Nginx 错误日志

```bash
sudo tail -n 100 /var/log/nginx/error.log
```

### 查看 PM2 systemd 日志

```bash
journalctl -u pm2-ubuntu -n 100 --no-pager
```

排查时先读错误信息，再修改配置，不要连续尝试多个不相关修复。

## 十八、常见错误与排查顺序

### 1. 浏览器显示 Nginx 默认欢迎页

依次检查：

1. `server_name` 是否为 `dongjinyue.cn`；
2. `sites-enabled` 是否存在正确链接；
3. 是否执行过 `sudo nginx -t`；
4. 是否重载过 Nginx；
5. DNS 是否指向当前服务器。

### 2. 出现 502 Bad Gateway

502 表示 Nginx 已收到请求，但无法连接后端 Next.js。检查：

```bash
pm2 status
curl -I http://127.0.0.1:3000
sudo tail -n 50 /var/log/nginx/error.log
```

如果本机 3000 端口没有响应，应先修复 PM2 或 Next.js，而不是反复修改域名。

### 3. 域名打不开，但公网 IP 可以打开

检查 DNS A 记录、备案状态和域名是否指向当前公网 IP。也可以执行：

```bash
getent hosts dongjinyue.cn
```

### 4. 修改配置后 Nginx 启动失败

先执行：

```bash
sudo nginx -t
```

输出会指出错误文件和行号。修正后使用 `reload`，不要在语法错误时反复 `restart`。

### 5. SSH 连接正常，网页仍然超时

SSH 使用 22 端口，网页使用 80/443。SSH 正常不能证明网页端口已经在腾讯云防火墙和 UFW 中放行。

### 6. 登录后立即退出或回调异常

先确认 `.env.local` 中的 Supabase 配置属于正确项目，再检查 Supabase Auth 的 Site URL 和 Redirect URLs 是否包含最终 HTTPS 域名。不要通过公开日志输出会话令牌。

## 十九、安全底线

必须遵守：

1. 不把 SSH 私钥上传到服务器、GitHub 或聊天记录；
2. 不提交 `.env.local`；
3. 不向公网开放 Next.js 的 3000 端口；
4. 修改 UFW 前先允许 OpenSSH；
5. Nginx 配置必须先 `nginx -t`，通过后再重载；
6. 不用 `chmod 777` 解决权限问题；
7. 不把 Supabase Service Role Key 放进浏览器环境变量；
8. 定期安装 Ubuntu 安全更新；
9. 永久删除文件或配置前确认准确路径并准备恢复方式；
10. 不把本地构建成功描述成已经完成上线，公网、DNS、备案和 HTTPS 都要单独验证。

## 二十、完整部署验收清单

部署完成后逐项检查：

```text
[ ] npm ci 成功，且没有锁文件不一致
[ ] npm run build 成功
[ ] pm2 status 显示 personal-website online
[ ] pm2-ubuntu.service 显示 active (running)
[ ] nginx.service 显示 active (running)
[ ] nginx -t 检查成功
[ ] 服务器内部访问 127.0.0.1:3000 返回 200
[ ] 模拟 Host 请求经过 Nginx 返回 200
[ ] 腾讯云防火墙仅开放必要端口
[ ] UFW 已允许 OpenSSH 和 Nginx Full
[ ] ICP 备案状态满足上线要求
[ ] DNS A 记录指向当前服务器
[ ] http://dongjinyue.cn 可以访问
[ ] https://dongjinyue.cn 证书有效
[ ] certbot renew --dry-run 成功
[ ] 首页、新闻、项目、工具、登录和后台完成实际浏览器检查
```

## 二十一、自测题

1. 为什么 Next.js 不直接向公网开放 3000 端口？
2. Nginx、PM2 和 systemd 分别负责什么？
3. 什么是反向代理？
4. 为什么修改 Nginx 配置后要先运行 `nginx -t`？
5. 腾讯云防火墙与 UFW 有什么区别？
6. 为什么启用 UFW 前必须先允许 OpenSSH？
7. 502 Bad Gateway 通常说明哪一段链路有问题？
8. `pm2 save` 保存的是什么？
9. 为什么服务器更新代码时使用 `git pull --ff-only`？
10. 域名实名认证完成是否等于 ICP 备案完成？

## 二十二、自测题标准答案

### 1. 为什么 Next.js 不直接向公网开放 3000 端口？

标准答案：Nginx 更适合处理公网入口、标准端口、域名和 HTTPS。Next.js 留在本机 3000 端口可以缩小暴露范围，并让网站入口配置集中管理。

### 2. Nginx、PM2 和 systemd 分别负责什么？

标准答案：Nginx 接收和转发网页请求；PM2 保持 Node.js 应用运行；systemd 在 Ubuntu 启动时管理 Nginx 和 PM2 等系统服务。

### 3. 什么是反向代理？

标准答案：访客先请求 Nginx，Nginx 再代表访客请求内部 Next.js，并把结果返回给访客。访客不直接连接内部应用端口。

### 4. 为什么修改 Nginx 配置后要先运行 `nginx -t`？

标准答案：它会在应用配置前检查语法和引用文件，避免错误配置导致网站入口无法加载。

### 5. 腾讯云防火墙与 UFW 有什么区别？

标准答案：腾讯云防火墙位于云平台网络入口；UFW 位于 Ubuntu 主机内部。公网请求需要同时通过两层规则。

### 6. 为什么启用 UFW 前必须先允许 OpenSSH？

标准答案：SSH 使用 22 端口。如果先启用拒绝规则而没有允许 SSH，当前远程连接可能断开，后续也无法登录服务器。

### 7. 502 Bad Gateway 通常说明哪一段链路有问题？

标准答案：说明请求已经到达 Nginx，但 Nginx 无法从配置的 Next.js 上游获得正常响应，应检查 PM2、应用日志和 127.0.0.1:3000。

### 8. `pm2 save` 保存的是什么？

标准答案：保存当前 PM2 应用进程清单，供 `pm2 resurrect` 或 systemd 在重启后恢复，而不是保存项目代码或数据库数据。

### 9. 为什么服务器更新代码时使用 `git pull --ff-only`？

标准答案：它只接受服务器分支可以直接前进到远程提交的情况，避免在生产服务器自动创建难以追踪的合并提交。

### 10. 域名实名认证完成是否等于 ICP 备案完成？

标准答案：不等于。域名实名认证确认域名持有者信息；ICP 备案是中国内地网站使用域名提供互联网信息服务前需要完成的备案流程。

## 二十三、术语速查表

| 术语 | 简单解释 |
| --- | --- |
| Nginx | 接收公网网页请求并转发到应用的网站服务器 |
| Reverse Proxy | 反向代理，代替访客请求内部应用 |
| Upstream | 上游服务，本项目指 127.0.0.1:3000 的 Next.js |
| PM2 | 管理和恢复 Node.js 应用进程的工具 |
| systemd | Ubuntu 的系统服务管理器 |
| PID | 操作系统中的进程编号 |
| Port | 端口，同一服务器上区分不同网络服务的数字 |
| DNS | 把域名转换为 IP 地址的系统 |
| A Record | 把域名指向 IPv4 地址的 DNS 记录 |
| UFW | Ubuntu 提供的简易主机防火墙管理工具 |
| HTTP | 普通网页传输协议，默认端口为 80 |
| HTTPS | 使用 TLS 加密的网页传输协议，默认端口为 443 |
| TLS Certificate | 证明域名身份并启用加密连接的证书 |
| Certbot | 申请和自动续期 TLS 证书的工具 |
| ICP 备案 | 中国内地网站使用域名提供服务前需要办理的备案 |
| Reload | 平滑重新读取配置，通常不中断现有连接 |

## 二十四、官方参考

- [Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx HTTP Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Ubuntu Firewall Documentation](https://ubuntu.com/server/docs/security-firewall/)
- [PM2 Startup Hook](https://pm2.keymetrics.io/docs/usage/startup/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [腾讯云轻量应用服务器：添加域名](https://cloud.tencent.com/document/product/1207/81332)
- [腾讯云轻量应用服务器：添加域名解析](https://cloud.tencent.com/document/product/1207/81333)
- [腾讯云轻量应用服务器：使用限制](https://cloud.tencent.com/document/product/1207/44376)

## 一句话总结

Next.js 负责网站，PM2 保持应用运行，systemd 负责开机恢复，Nginx 负责域名与 HTTPS 入口；部署时每一层都要单独检查，先验证内部应用，再验证反向代理，最后验证防火墙、备案、DNS 和证书。
