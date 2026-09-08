# Nginx 从零入门：独立的新手教程

适用对象：第一次接触 Nginx，希望理解它的工作方式、配置结构和常用操作，而不只是复制命令的学习者。

学习目标：完成本教程后，你能够安装 Nginx、读懂基础配置、托管静态网页、配置反向代理、查看日志并按顺序排查常见错误。

## 一、Nginx 是什么

Nginx 是一个 Web Server（网站服务器）。它可以接收浏览器发来的 HTTP 请求，再返回网页内容或把请求转发给其他服务。

Nginx 常见用途包括：

- 托管 HTML、CSS、JavaScript 和图片等静态文件
- 作为 Reverse Proxy（反向代理）转发请求
- 为多个域名提供不同的网站
- 配置 HTTPS 加密连接
- 限制请求大小和访问范围
- 记录访问日志与错误日志
- 在多个后端服务之间分配请求

Nginx 不是编程语言，也不是数据库。它更像网站入口处的接待员：先接收请求，再按照配置决定由谁处理。

## 二、浏览器访问网站时发生了什么

当浏览器访问一个普通网站时，请求大致经过以下步骤：

```text
浏览器输入域名
↓
DNS 把域名解析为服务器 IP
↓
浏览器连接服务器的 80 或 443 端口
↓
Nginx 接收请求
↓
Nginx 返回文件，或把请求转发给后端服务
↓
浏览器收到响应并显示页面
```

其中：

- DNS 是 Domain Name System（域名系统）
- IP 是 Internet Protocol Address（互联网协议地址）
- Port（端口）用于区分同一台服务器上的不同网络服务
- HTTP 默认使用 80 端口
- HTTPS 默认使用 443 端口

## 三、静态服务器与反向代理的区别

Nginx 有两种基础工作方式。

### 1. 直接返回静态文件

```text
浏览器 → Nginx → /var/www/example/index.html
```

这种方式适合不需要服务端计算的 HTML、CSS、JavaScript、图片和下载文件。

### 2. 把请求转发给后端服务

```text
浏览器 → Nginx → 127.0.0.1:8080 → 后端服务
```

这种方式称为 Reverse Proxy（反向代理）。浏览器只连接 Nginx，不需要知道后端服务使用什么端口或技术。

## 四、Nginx 的进程模型

Nginx 通常包含一个 Master Process（主进程）和多个 Worker Process（工作进程）：

```text
Nginx 主进程
├── 工作进程 1
├── 工作进程 2
└── 工作进程 3
```

主进程读取配置并管理工作进程。工作进程负责处理网络请求。

执行平滑重载时，主进程启动使用新配置的工作进程，再让旧工作进程完成已有请求后退出。这也是修改配置后优先使用 `reload` 的原因。

## 五、在 Ubuntu 安装 Nginx

先刷新软件列表：

```bash
sudo apt update
```

- `sudo`：以管理员权限执行命令
- `apt`：Ubuntu 的软件包管理工具
- `update`：刷新可安装软件的版本信息

安装 Nginx：

```bash
sudo apt install nginx -y
```

- `install nginx`：安装名为 `nginx` 的软件包
- `-y`：自动确认安装提示

检查版本：

```bash
nginx -v
```

预期输出类似：

```text
nginx version: nginx/1.x.x
```

版本号会随 Ubuntu 软件源更新，不需要与示例完全相同。

## 六、启动、停止和重载 Nginx

Ubuntu 使用 systemd（系统服务管理器）管理 Nginx。

立即启动 Nginx：

```bash
sudo systemctl start nginx
```

停止 Nginx：

```bash
sudo systemctl stop nginx
```

重新启动 Nginx：

```bash
sudo systemctl restart nginx
```

平滑加载新配置：

```bash
sudo systemctl reload nginx
```

设置开机启动，并立即启动：

```bash
sudo systemctl enable --now nginx
```

- `enable`：设置开机自动启动
- `--now`：同时立即启动本次服务

修改配置后优先使用 `reload`。只有服务卡死或无法平滑加载时才考虑 `restart`。

## 七、检查 Nginx 是否正常运行

查看服务状态：

```bash
systemctl status nginx --no-pager
```

- `status`：查看当前服务状态
- `--no-pager`：直接输出结果，不进入分页查看界面

正常状态包含：

```text
Active: active (running)
```

从服务器内部发送 HTTP 请求：

```bash
curl -I http://127.0.0.1
```

- `curl`：发送网络请求
- `-I`：只查看响应头，不下载完整网页
- `127.0.0.1`：当前服务器自身

正常响应通常包含：

```text
HTTP/1.1 200 OK
Server: nginx
```

## 八、理解 Nginx 配置目录

Ubuntu 的 Nginx 配置通常位于 `/etc/nginx`：

```text
/etc/nginx/
├── nginx.conf
├── conf.d/
├── sites-available/
├── sites-enabled/
├── snippets/
├── mime.types
└── modules-enabled/
```

各目录的用途：

- `nginx.conf`：全局配置入口
- `conf.d`：存放额外的通用配置
- `sites-available`：存放可用的网站配置
- `sites-enabled`：存放已经启用的网站配置链接
- `snippets`：存放可以重复引用的配置片段
- `mime.types`：定义文件扩展名对应的内容类型
- `modules-enabled`：启用动态模块

不要在不了解配置层级时把所有内容都写进 `nginx.conf`。将每个网站放进独立配置文件更容易维护。

## 九、配置文件由哪些层级组成

Nginx 使用大括号表示配置 Context（上下文）：

```nginx
events {
    worker_connections 768;
}

http {
    server {
        listen 80;

        location / {
            return 200 "Hello, Nginx!\n";
        }
    }
}
```

常见层级：

```text
main
├── events
└── http
    ├── server
    │   └── location
    └── server
        └── location
```

- `http`：HTTP 相关的全局设置
- `server`：一组域名与端口规则，也称 Virtual Host（虚拟主机）
- `location`：匹配请求路径并决定处理方式

Ubuntu 已经在 `nginx.conf` 中建立这些基础层级。日常添加网站时，通常只需要编写 `server` 块。

## 十、Directive 是什么

Directive（指令）是 Nginx 配置中的一条设置。简单指令以分号结束，块指令使用大括号包含其他指令。

简单指令示例：

```nginx
listen 80;
```

块指令示例：

```nginx
location /images/ {
    root /var/www/example;
}
```

漏写分号、括号不成对、把指令放错层级，都会导致配置检查失败。

## 十一、创建第一个静态网页

创建网站目录：

```bash
sudo mkdir -p /var/www/example/html
```

- `mkdir`：创建目录
- `-p`：同时创建缺失的父目录，目录已存在时不报错

把目录所有者改为当前登录用户：

```bash
sudo chown -R "$USER":"$USER" /var/www/example/html
```

- `chown`：修改所有者
- `-R`：递归处理目录中的内容
- `$USER`：当前登录用户名

创建首页：

```bash
nano /var/www/example/html/index.html
```

写入以下内容：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Nginx 测试页</title>
  </head>
  <body>
    <h1>Nginx 已正常提供静态页面</h1>
  </body>
</html>
```

在 Nano 编辑器中按 `Ctrl + O` 保存，按 `Enter` 确认文件名，再按 `Ctrl + X` 退出。

## 十二、配置静态网站

创建独立配置文件：

```bash
sudo nano /etc/nginx/sites-available/example
```

写入：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name example.com;
    root /var/www/example/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

各指令的含义：

- `listen 80`：监听 IPv4 的 80 端口
- `listen [::]:80`：监听 IPv6 的 80 端口
- `server_name`：匹配请求中的域名
- `root`：指定静态文件根目录
- `index`：指定目录默认首页
- `try_files`：按顺序查找文件或目录，找不到时返回 404

示例中的 `example.com` 是占位域名。实践时替换为你有权使用的域名。

## 十三、启用网站配置

Ubuntu 通常通过 Symbolic Link（符号链接）启用网站配置：

```bash
sudo ln -s /etc/nginx/sites-available/example /etc/nginx/sites-enabled/example
```

这里没有复制文件。`sites-enabled/example` 只是指向原配置文件的链接。

查看链接：

```bash
ls -l /etc/nginx/sites-enabled/example
```

如果提示 `File exists`，说明同名链接已经存在。先检查链接指向，不要重复创建或直接删除。

## 十四、每次修改后先检查语法

执行配置检查：

```bash
sudo nginx -t
```

正常输出包含：

```text
syntax is ok
test is successful
```

检查成功后再加载配置：

```bash
sudo systemctl reload nginx
```

如果检查失败，输出会提供文件路径和行号。先修复对应位置，不要在配置错误时强制重启 Nginx。

## 十五、server_name 如何选择网站

一台服务器可以配置多个 `server` 块：

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example/html;
}

server {
    listen 80;
    server_name blog.example.com;
    root /var/www/blog/html;
}
```

两个网站都使用 80 端口。Nginx 根据请求中的 `Host` 请求头选择匹配的 `server_name`。

在 DNS 尚未配置时，可以从服务器内部模拟域名请求：

```bash
curl -I -H "Host: example.com" http://127.0.0.1
```

`-H` 用于添加请求头。这条命令不会修改 DNS。

## 十六、location 如何匹配路径

`location` 根据 URL 路径选择处理规则：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        return 200 "首页规则\n";
    }

    location /images/ {
        root /var/www/example;
    }
}
```

请求 `/` 使用第一条规则，请求 `/images/logo.png` 使用更具体的 `/images/` 规则。

初学阶段先使用普通前缀匹配。正则表达式、`^~` 和精确匹配适合在理解匹配优先级后再使用。

## 十七、root 与 alias 的区别

`root` 会把完整请求路径附加到目录后面：

```nginx
location /images/ {
    root /var/www/example;
}
```

请求 `/images/logo.png` 对应：

```text
/var/www/example/images/logo.png
```

`alias` 会用指定目录替换匹配到的路径前缀：

```nginx
location /images/ {
    alias /data/pictures/;
}
```

同一个请求对应：

```text
/data/pictures/logo.png
```

`alias` 的路径和结尾斜杠容易写错。能用 `root` 清楚表达时，优先使用 `root`。

## 十八、配置反向代理

假设后端服务已经监听 `127.0.0.1:8080`，可以创建以下配置：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

关键指令：

- `proxy_pass`：指定接收转发请求的后端地址
- `proxy_http_version`：指定 Nginx 与后端通信使用的 HTTP 版本
- `Host`：保留访客原始访问域名
- `X-Real-IP`：把当前访客地址传给后端
- `X-Forwarded-For`：记录请求经过的代理地址链
- `X-Forwarded-Proto`：告诉后端原始请求使用 HTTP 还是 HTTPS

反向代理配置完成后，仍要执行 `sudo nginx -t` 和 `sudo systemctl reload nginx`。

## 十九、proxy_pass 结尾斜杠为什么重要

下面两个地址看起来接近，但路径处理方式不同：

```nginx
proxy_pass http://127.0.0.1:8080;
```

```nginx
proxy_pass http://127.0.0.1:8080/;
```

当 `proxy_pass` 带有 URI 部分时，Nginx 会替换匹配的请求路径。没有 URI 部分时，Nginx 会保留原始请求路径。

初学配置整个网站的 `location /` 时，两者经常表现相同。代理子路径时必须根据期望结果明确选择，并用实际请求验证。

## 二十、理解 HTTP 状态码

Nginx 排查中常见状态码：

| 状态码 | 含义 | 常见原因 |
| --- | --- | --- |
| 200 | 请求成功 | 页面或后端正常返回 |
| 301 | 永久重定向 | HTTP 跳转 HTTPS 或域名规范化 |
| 302 | 临时重定向 | 临时跳转或登录流程 |
| 403 | 禁止访问 | 文件权限或访问规则拒绝 |
| 404 | 找不到资源 | 路径、文件或 `location` 不匹配 |
| 413 | 请求体过大 | 超过 `client_max_body_size` |
| 499 | 客户端提前断开 | 浏览器在响应完成前取消请求 |
| 500 | 服务器内部错误 | Nginx 或后端处理失败 |
| 502 | 无效的上游响应 | 后端未运行、端口错误或连接失败 |
| 504 | 上游响应超时 | 后端处理时间超过代理等待时间 |

状态码只能指出故障范围。确定根因还需要同时查看 Nginx 日志和后端日志。

## 二十一、访问日志和错误日志

Ubuntu 默认日志目录通常是：

```text
/var/log/nginx/access.log
/var/log/nginx/error.log
```

查看最近 100 条访问记录：

```bash
sudo tail -n 100 /var/log/nginx/access.log
```

查看最近 100 条错误记录：

```bash
sudo tail -n 100 /var/log/nginx/error.log
```

实时观察新增错误：

```bash
sudo tail -f /var/log/nginx/error.log
```

`-f` 表示持续等待新增内容。按 `Ctrl + C` 退出日志查看，不会停止 Nginx。

## 二十二、用日志按顺序排查问题

遇到网站打不开时，按链路从内向外检查：

```text
1. Nginx 进程是否运行
2. Nginx 配置语法是否正确
3. 本机端口是否响应
4. 后端服务是否响应
5. Nginx 错误日志写了什么
6. 主机防火墙是否允许访问
7. 云平台防火墙是否允许访问
8. DNS 是否指向正确服务器
9. 浏览器请求的域名和协议是否正确
```

对应命令：

```bash
systemctl status nginx --no-pager
sudo nginx -t
curl -I http://127.0.0.1
sudo tail -n 50 /var/log/nginx/error.log
```

一次只验证一层。不要同时修改端口、域名、文件权限和代理配置，否则无法判断是哪一项解决了问题。

## 二十三、配置客户端请求大小

Nginx 默认会限制请求体大小。上传文件出现 `413 Request Entity Too Large` 时，可以在 `server` 或合适的 `location` 中设置：

```nginx
client_max_body_size 10m;
```

`10m` 表示允许最大 10 MB 的请求体。不要为了绕过错误设置成没有边界的超大值，应根据实际业务选择上限。

修改后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 二十四、配置代理超时

后端任务确实需要较长时间时，可以设置代理超时：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

- `proxy_connect_timeout`：等待连接后端的时间
- `proxy_send_timeout`：向后端发送请求时允许的间隔
- `proxy_read_timeout`：等待后端连续返回数据时允许的间隔

增加超时不是解决后端性能问题的通用方法。先查看后端为什么没有及时响应，再决定是否调整。

## 二十五、认识 HTTPS

HTTPS 是在 HTTP 外增加 TLS（传输层安全）加密。它提供三个核心能力：

- 加密浏览器与服务器之间的数据
- 验证浏览器连接的域名身份
- 检测传输内容是否被篡改

启用 HTTPS 需要：

1. 一个实际可用的域名
2. 域名 DNS 已指向当前服务器
3. 80 和 443 端口可以从公网访问
4. 一个有效的 TLS Certificate（TLS 证书）

证书工具和具体命令会随操作系统与证书机构变化。执行前应使用证书工具的官方文档生成当前安装步骤。

## 二十六、HTTP 跳转 HTTPS 的原理

HTTPS 配置完成后，通常保留一个监听 80 端口的 `server` 块，只负责跳转：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    return 301 https://$host$request_uri;
}
```

- `301`：永久重定向
- `$host`：当前请求域名
- `$request_uri`：当前路径和查询参数

例如，`http://example.com/docs?page=1` 会跳转到 `https://example.com/docs?page=1`。

证书尚未安装或 443 端口尚未可用时，不要提前强制跳转 HTTPS。

## 二十七、Nginx 与防火墙的关系

Nginx 监听端口不代表公网一定能够访问。请求还可能经过主机防火墙和云平台防火墙。

查看 Ubuntu UFW（简易防火墙）状态：

```bash
sudo ufw status verbose
```

启用 UFW 前先允许 SSH（安全外壳协议），否则可能中断远程管理：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

`Nginx Full` 允许 80 和 443 端口。云服务器还需要在云平台控制台开放相同端口。

## 二十八、文件权限应该怎样理解

Nginx 工作进程通常使用低权限账户读取静态文件。出现 403 时，先检查目录和文件是否允许 Nginx 读取：

```bash
namei -l /var/www/example/html/index.html
```

这条命令会逐层显示路径权限，便于找到阻止访问的目录。

不要使用下面的做法解决权限问题：

```bash
chmod -R 777 /var/www/example
```

`777` 允许所有用户读、写和执行，扩大了攻击与误操作范围。应只给需要访问的账户授予必要权限。

## 二十九、备份配置再修改

修改重要配置前，可以创建带日期的备份：

```bash
sudo cp /etc/nginx/sites-available/example \
  /etc/nginx/sites-available/example.backup
```

`cp` 会复制文件。备份会占用少量磁盘空间，但能在配置错误时快速比较和恢复。

查看改动差异：

```bash
sudo diff -u \
  /etc/nginx/sites-available/example.backup \
  /etc/nginx/sites-available/example
```

确认新配置运行稳定后，再按明确文件名清理过期备份。不要使用宽泛通配符批量删除配置。

## 三十、常见错误与处理方法

### Nginx 无法启动

执行：

```bash
sudo nginx -t
systemctl status nginx --no-pager -l
journalctl -u nginx -n 50 --no-pager
```

重点查看错误文件、行号和端口占用信息。

### 浏览器显示默认欢迎页

可能原因：

- 自己的网站配置没有启用
- `server_name` 与访问域名不匹配
- DNS 指向了其他服务器
- 默认 `server` 块接收了请求

使用带 `Host` 请求头的本机测试，先确认 Nginx 是否能匹配目标配置。

### 出现 403 Forbidden

检查：

- `root` 指向的目录是否正确
- 首页文件是否存在
- Nginx 是否有逐层读取目录的权限
- 是否有 `deny` 等访问限制

### 出现 404 Not Found

检查请求路径、`root`、`alias`、`try_files` 和 `location` 匹配结果。

### 出现 502 Bad Gateway

先直接访问后端：

```bash
curl -I http://127.0.0.1:8080
```

如果后端没有响应，应修复后端进程或端口。如果后端正常，再查看 `proxy_pass` 和 Nginx 错误日志。

### 修改配置后没有变化

依次确认：

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo nginx -T
```

`nginx -T` 会检查并输出 Nginx 实际加载的完整配置。输出可能很长，不要把其中可能存在的内部地址或证书路径随意公开。

## 三十一、日常维护流程

修改 Nginx 配置时遵循固定顺序：

```text
确认要修改的 server 块
↓
备份当前配置
↓
只修改一个目标
↓
运行 nginx -t
↓
平滑 reload
↓
用 curl 验证
↓
检查 access.log 和 error.log
```

更新 Ubuntu 软件包时执行：

```bash
sudo apt update
sudo apt upgrade
```

升级后检查 Nginx 状态和网站响应。不要只根据命令退出码判断网站已经可用。

## 三十二、安全底线

必须遵守：

1. 不向公网开放不需要的端口
2. 启用防火墙前先允许 SSH
3. 不使用 `chmod 777` 作为常规权限修复
4. 不在配置文件中保存密码、私钥或访问令牌
5. 每次修改配置后先运行 `nginx -t`
6. 定期查看错误日志和安装安全更新
7. 不隐藏 502、504 等错误，应继续检查后端根因
8. 不在证书尚未可用时强制跳转 HTTPS
9. 删除配置前确认准确路径并保留恢复方式
10. 不把本机请求成功当成公网已经可访问

## 三十三、自测题

1. Nginx 可以承担哪些主要工作？
2. 静态文件服务与反向代理有什么区别？
3. Master Process 和 Worker Process 分别负责什么？
4. `sites-available` 与 `sites-enabled` 有什么关系？
5. `server` 和 `location` 分别匹配什么？
6. 为什么修改配置后要先执行 `nginx -t`？
7. `root` 和 `alias` 怎样组合文件路径？
8. 502 状态码通常说明哪一段连接有问题？
9. 为什么启用 UFW 前要允许 OpenSSH？
10. 为什么不能用 `chmod 777` 解决所有权限问题？

## 三十四、自测题标准答案

### 1. Nginx 可以承担哪些主要工作？

标准答案：它可以提供静态文件、反向代理请求、处理多个域名、配置 HTTPS、记录日志并执行部分请求限制。

### 2. 静态文件服务与反向代理有什么区别？

标准答案：静态服务直接读取磁盘文件并返回；反向代理把请求转发给另一个服务，再把对方的响应返回给浏览器。

### 3. Master Process 和 Worker Process 分别负责什么？

标准答案：主进程读取配置并管理工作进程；工作进程负责处理实际网络请求。

### 4. `sites-available` 与 `sites-enabled` 有什么关系？

标准答案：前者保存可用配置，后者通过符号链接选择当前启用的配置。

### 5. `server` 和 `location` 分别匹配什么？

标准答案：`server` 主要根据端口和域名选择网站，`location` 根据请求路径选择处理规则。

### 6. 为什么修改配置后要先执行 `nginx -t`？

标准答案：它会在加载配置前检查语法和引用文件，避免错误配置影响正在运行的网站。

### 7. `root` 和 `alias` 怎样组合文件路径？

标准答案：`root` 在指定目录后附加完整请求路径；`alias` 用指定目录替换匹配到的路径前缀。

### 8. 502 状态码通常说明哪一段连接有问题？

标准答案：请求已经到达 Nginx，但 Nginx 没有从配置的后端服务获得有效响应。

### 9. 为什么启用 UFW 前要允许 OpenSSH？

标准答案：远程管理通常依赖 SSH 的 22 端口。没有放行就启用防火墙，可能导致当前连接断开并阻止再次登录。

### 10. 为什么不能用 `chmod 777` 解决所有权限问题？

标准答案：它会给所有用户写入和执行权限，扩大攻击与误操作范围，也掩盖真正缺少权限的具体账户和目录。

## 三十五、术语速查表

| 术语 | 简单解释 |
| --- | --- |
| Nginx | 网站服务器、静态文件服务器和反向代理工具 |
| HTTP | 浏览器与网站传输请求和响应的协议 |
| HTTPS | 使用 TLS 加密的 HTTP |
| Port | 同一地址上区分网络服务的端口号 |
| Directive | Nginx 配置中的一条指令 |
| Context | 能包含其他指令的配置层级 |
| Server Block | 定义端口、域名和处理规则的网站配置块 |
| Location | 根据请求路径选择处理方式的配置块 |
| Root | 通过拼接完整请求路径寻找文件的目录指令 |
| Alias | 通过替换匹配路径前缀寻找文件的目录指令 |
| Reverse Proxy | 接收请求并转发给内部后端服务 |
| Upstream | 接收代理请求的后端服务 |
| systemd | Ubuntu 的系统服务管理器 |
| PID | 操作系统中的进程编号 |
| UFW | Ubuntu 的简易防火墙管理工具 |
| DNS | 把域名解析为 IP 地址的系统 |
| TLS | 为网络连接提供加密和身份验证的协议 |
| Reload | 平滑加载新配置，尽量不中断现有连接 |

## 三十六、官方参考

- [Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx Core Module](https://nginx.org/en/docs/ngx_core_module.html)
- [Nginx HTTP Core Module](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [Nginx HTTP Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Nginx Admin Guide](https://docs.nginx.com/nginx/admin-guide/)
- [Ubuntu Firewall Documentation](https://ubuntu.com/server/docs/security-firewall/)

## 一句话总结

Nginx 根据端口、域名和路径处理请求：它可以直接返回静态文件，也可以把请求转发给后端服务；每次改配置都应先检查语法，再平滑加载，并通过请求和日志验证真实结果。
