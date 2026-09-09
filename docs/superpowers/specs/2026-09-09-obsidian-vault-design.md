# Obsidian 个人知识库第一阶段设计

## 目标

创建一个主要供管理员本人使用的 Obsidian 知识库。Obsidian 是唯一的笔记编辑入口，Markdown 文件是内容的权威数据源。知识库独立于 MY SPACE 网站代码仓库，并通过私有 Git 仓库备份，为后续由服务器拉取并展示笔记做好准备。

第一阶段只完成可立即使用的知识库骨架与基础学习材料，不实现网站读取、服务器自动同步、普通用户注册、会员或付费功能。

## 存储位置与仓库

- 本地目录：`C:\Users\24315\Desktop\AI\obsidian-vault`
- GitHub 仓库：`dongjinyue/obsidian-vault`
- 仓库可见性：Private（私有）
- 创建顺序：先创建本地知识库并初始化 Git，再创建 GitHub 私有仓库并首次推送
- 默认分支：`main`

知识库与 `personal-website` 并列存放，避免笔记历史、附件和 Obsidian 配置进入网站代码仓库。

## 初始目录结构

```text
obsidian-vault/
├── .obsidian/
├── attachments/
├── notes/
│   ├── ai/
│   ├── programming/
│   └── projects/
├── templates/
├── 首页.md
├── Obsidian-学习指南.md
├── README.md
└── .gitignore
```

Git 不能追踪空目录，因此需要保留但暂时为空的内容目录将使用 `.gitkeep` 占位。占位文件没有业务含义，添加第一篇真实笔记后可以删除。

## 笔记元数据

所有准备被网站读取的内容笔记统一使用 YAML Frontmatter（文件头元数据）：

```yaml
---
title: "笔记标题"
slug: "unique-note-slug"
visibility: "private"
status: "draft"
tags: []
created_at: "2026-09-09"
updated_at: "2026-09-09"
---
```

字段规则：

- `title`：网站和 Obsidian 中展示的标题。
- `slug`：稳定且唯一的 URL 标识；使用小写英文字母、数字和连字符，标题变化时不自动修改。
- `visibility`：第一阶段只允许 `public` 或 `private`，模板默认 `private`。
- `status`：第一阶段只允许 `published` 或 `draft`，模板默认 `draft`。
- `tags`：字符串数组，用于分类和检索。
- `created_at`、`updated_at`：使用 `YYYY-MM-DD` 格式，便于人工维护和程序解析。

模板默认采用最保守的 `private + draft`，避免新笔记因遗漏属性而意外公开。未来的 `members` 和 `paid` 仅作为扩展方向，不提前加入第一阶段模板。

## 初始文件职责

### `首页.md`

作为 Obsidian 打开知识库后的导航页，链接到三个主题目录、笔记模板和学习指南。首页只提供导航与简短使用流程，不伪造个人内容。

### `templates/笔记模板.md`

提供统一 Frontmatter、摘要、正文、相关笔记和参考资料结构。保留需要作者填写的明确占位内容，创建真实笔记时替换。

### `Obsidian-学习指南.md`

用简体中文介绍第一阶段真正需要掌握的功能：创建笔记、套用模板、内部链接、图片附件、标签、公开属性、Git 提交流程及常见错误。避免一次引入插件和复杂自动化。

### `README.md`

供 GitHub 和服务器侧阅读，说明目录、元数据规则、安全边界及同步原则。明确仓库私有不等于网站可忽略服务端鉴权。

### `.obsidian/`

只保存必要、可跨电脑复用且不含隐私的配置。第一阶段不安装社区插件，不提交工作区布局、缓存或设备相关状态。

### `.gitignore`

忽略 Obsidian 的设备状态、操作系统临时文件和编辑器缓存，但保留 Markdown、附件、模板及必要配置。

## 图片与附件

- 所有图片第一阶段统一放入 `attachments/`。
- 笔记使用 Obsidian 嵌入语法 `![[图片名.png]]`。
- 文件名应有意义并尽量唯一，避免使用系统自动生成的无意义名称。
- 上传前压缩大图；当前服务器只有 40 GB 系统盘和 3 Mbps 公网带宽，不适合长期堆积原始大图。
- 第一阶段不引入对象存储，后续附件规模明显增长时再评估迁移。

## 权限与安全边界

- 私有 GitHub 仓库用于保存和同步，不直接承担网站访问控制。
- 网站未来解析笔记时，必须在服务端先读取 Frontmatter，再结合管理员登录状态过滤。
- 游客只能收到 `visibility: public` 且 `status: published` 的笔记内容。
- 管理员登录后可以读取 `public`、`private`、`published` 和 `draft` 的组合。
- 未知或缺失的 `visibility`、`status` 必须默认拒绝公开，不能宽松回退。
- 私密 Markdown 正文及附件路径不能提前发送给游客浏览器。
- 仓库内禁止写入密码、访问令牌、服务器私钥或真实环境变量。

## Git 工作流

第一阶段采用简单的单人流程：

1. 在 Obsidian 中编辑并检查属性。
2. 在本地查看 Git 变更。
3. 使用描述清楚的中文提交信息提交。
4. 推送到 GitHub 私有仓库。
5. 后续服务器同步功能完成后，再由服务器以只读凭据拉取。

不在第一阶段加入自动提交插件。显式提交能让作者在推送前发现误公开属性、敏感信息和不必要的大附件。

## 创建与验证

实施时按以下顺序执行：

1. 检查本机 Obsidian、Git 和 GitHub CLI 是否可用及 GitHub 登录状态。
2. 创建本地目录和初始文件。
3. 检查 Frontmatter、内部链接和附件设置是否一致。
4. 用 Obsidian 打开知识库，确认首页、模板和学习指南正常渲染。
5. 初始化 Git，确认忽略规则没有遗漏应提交的文件。
6. 创建 `dongjinyue/obsidian-vault` 私有仓库并首次推送。
7. 通过 GitHub 仓库信息再次确认可见性为私有。

如果 GitHub CLI 尚未登录，实施将在认证步骤暂停，由用户本人完成浏览器授权；不会要求用户提供密码或访问令牌。

## 完成标准

- 本地知识库能被 Obsidian 正常打开。
- 目录、首页、模板、学习指南和说明文件齐全。
- 模板默认使用 `private + draft`。
- 初始文件不含虚假的个人笔记、真实密钥或令牌。
- Git 工作区干净，默认分支为 `main`。
- GitHub 远程仓库存在、可见性为私有，并包含初始提交。
- 本阶段不修改 MY SPACE 的网站功能，也不声称服务器同步已经完成。
