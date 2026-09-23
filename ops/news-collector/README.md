# AI 新闻采集部署指南

本指南指导在腾讯云服务器上配置和启用 AI 新闻定时采集。

## 前置条件

- 腾讯云服务器已可访问
- `personal-website` 仓库已克隆到 `/home/ubuntu/personal-website`
- Node.js >= 18 已安装
- Supabase 项目已创建 `news_articles` 表（已在迁移文件中定义）

## 1. 在 Supabase 获取 service_role key

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)
2. 进入项目 → Settings → API
3. 找到 **service_role key**（不是 anon key）
4. 复制该密钥（此密钥可绕过行级安全策略，仅用于服务端）

## 2. 在服务器上配置环境变量

创建环境变量文件：

```bash
mkdir -p ~/.config
cat > ~/.config/news-collector.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
chmod 600 ~/.config/news-collector.env
```

将 `SUPABASE_URL` 替换为你的 Supabase 项目地址（与 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 相同），`SUPABASE_SERVICE_ROLE_KEY` 替换为上一步获取的密钥。

## 3. 安装依赖

采集脚本使用 Node.js 内置模块（`fetch`、`fs`），无需额外安装 npm 依赖。

## 4. 验证连通性

```bash
cd /home/ubuntu/personal-website
source ~/.config/news-collector.env
node ops/news-collector/check.mjs
```

预期输出：
- Node.js 版本检查通过
- 各 RSS 源连通性检查（部分源失败不影响整体运行）
- 环境变量检查通过

## 5. 手动测试采集

### 5a. 干运行（不写库，验证采集逻辑）

无需配置密钥即可验证 RSS 源连通性、解析、分类和去重：

```bash
cd /home/ubuntu/personal-website
node ops/news-collector/collect-news.mjs --dry-run
```

预期输出：各源条目数、7 天过滤结果、分类统计、候选新闻预览。

### 5b. 完整采集（写入数据库）

```bash
cd /home/ubuntu/personal-website
source ~/.config/news-collector.env
node ops/news-collector/collect-news.mjs
```

检查 Supabase 控制台的 `news_articles` 表是否有新数据。

## 6. 安装 systemd 服务

```bash
sudo cp ops/news-collector/news-collector.service /etc/systemd/system/
sudo cp ops/news-collector/news-collector.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable news-collector.timer
sudo systemctl start news-collector.timer
```

## 7. 验证定时任务

```bash
# 查看定时器状态
systemctl status news-collector.timer

# 查看下次运行时间
systemctl list-timers news-collector.timer

# 手动触发一次
sudo systemctl start news-collector.service

# 查看运行日志
journalctl -u news-collector.service -n 50 --no-pager
```

## 8. 安全说明

- `news-collector.env` 文件权限为 `600`，仅 ubuntu 用户可读
- service_role key 只配置在服务器上，不写入代码仓库
- systemd 服务使用 `ProtectSystem=strict` 和 `ProtectHome=read-only` 限制文件系统访问
- 采集脚本只写入 `news_articles` 表，不修改其他表
- `news-collector.env` 已在 `.gitignore` 的模式覆盖范围内（不提交到仓库）

## RSS 源管理

采集源定义在 `ops/news-collector/collect-news.mjs` 的 `RSS_SOURCES` 数组中。要增加或删除源，编辑该数组后重新部署即可。

当前源：

| 源 | 语言 | 格式 |
|----|------|------|
| OpenAI Blog | 英文 | RSS 2.0 |
| Google DeepMind | 英文 | RSS 2.0 |
| TechCrunch AI | 英文 | RSS 2.0 |
| The Verge AI | 英文 | Atom 1.0 |
| 量子位 | 中文 | RSS 2.0 |

> 原始方案中的机器之心 (`jiqizhixin.com/rss`)、Anthropic、Hugging Face、Google AI Blog 四个源因 RSS 地址失效或网络不可达已替换。如需恢复，在 `RSS_SOURCES` 中添加对应 URL 并用 `--dry-run` 验证即可。

## 分类规则

分类通过标题关键词匹配实现，规则定义在 `collect-news.mjs` 的 `CATEGORY_RULES` 中：

- **模型动态**：model、GPT、LLM、多模态、训练、推理、智能体等
- **AI 产品**：产品、发布、ChatGPT、Copilot、应用、平台等
- **开发技术**：开发、编程、SDK、API、开源、GitHub、框架、GPU等
- **行业观察**：行业、市场、融资、政策、监管、安全等

未匹配任何关键词的新闻默认归入"行业观察"。
