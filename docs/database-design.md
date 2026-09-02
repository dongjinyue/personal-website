# 个人网站数据库设计

## 1. 迁移到数据库的原因

目前项目和工具保存在 TypeScript（类型脚本）文件中，适合少量、固定的学习数据。随着管理后台加入，继续使用静态文件会让每次新增或修改数据都必须改代码、重新构建并部署，也难以可靠地记录时间、校验数据和维护实体关系。

数据库提供持久化存储和 Schema（模式）约束：程序停止后数据仍然存在；新增、修改和查询可以通过统一接口完成；主键、唯一约束、外键等规则还能在写入时阻止无效数据。Day 10 再由 Prisma ORM（对象关系映射工具）把 TypeScript 对象转换成数据库操作。

## 2. 实体职责

- `Project`：保存项目的名称、简介、详情、状态、链接和展示设置。
- `Tool`：保存常用工具的名称、简介、网址、分类和收藏状态。
- `Tag`：保存可复用且不重复的标签名称，同时服务项目与工具。
- `ProjectHighlight`：保存一个项目的多条亮点，并通过顺序字段控制展示次序。
- `ProjectTag`、`ToolTag`：关联表，只负责记录实体与标签之间的多对多关系。

## 3. 主键、唯一字段与可空字段

每张表都有主键。`projects.id`、`tools.id` 使用稳定的文本标识；亮点和标签使用数据库生成的整数标识；两张关联表使用两个外键组成的复合主键。

`projects.slug` 必须唯一，因为动态路由需要它准确找到一个项目；`tags.name` 必须唯一，避免出现同名标签。`cover_image`、`project_url` 和 `github_url` 是可选信息，因此允许 `NULL`。其余业务字段必须提供。

## 4. 实体关系

```text
Project 1 ─── N ProjectHighlight
Project 1 ─── N ProjectTag N ─── 1 Tag
Tool    1 ─── N ToolTag    N ─── 1 Tag
```

`1` 表示关系这一侧的一条记录，`N` 表示可以有多条记录。一个项目可以拥有多条亮点，但每条亮点只属于一个项目，这是一对多关系。一个项目或工具可以拥有多个标签，同一个标签也能被多个项目或工具复用，因此通过关联表形成多对多关系。

## 5. 删除策略

- 删除 `Project` 时，级联删除它的 `ProjectHighlight` 和 `ProjectTag` 记录。
- 删除 `Tool` 时，级联删除它的 `ToolTag` 记录。
- 删除 `Tag` 时，级联删除引用它的两类关联记录。
- 删除项目或工具不会删除 `Tag` 本身，因为标签可能仍被其他记录复用。

这种策略可以避免孤立的关联行，同时不会意外删除仍有用途的标签。

## 6. 命名约定

- 数据库表名使用复数 `snake_case`（蛇形命名），例如 `project_highlights`。
- 数据库列名使用 `snake_case`，例如 `is_featured`、`created_at`。
- TypeScript 属性继续使用 `camelCase`（小驼峰命名），例如 `isFeatured`、`createdAt`。
- 主键统一命名为 `id`，外键使用“实体单数名 + `_id`”，例如 `project_id`。

## 7. 数据字典

### `projects`

| 字段 | 类型 | 必填 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `id` | TEXT | 是 | 是（主键） | 稳定标识项目 |
| `slug` | TEXT | 是 | 是 | 生成并匹配项目详情路由 |
| `name` | TEXT | 是 | 否 | 项目名称 |
| `description` | TEXT | 是 | 否 | 卡片简介 |
| `long_description` | TEXT | 是 | 否 | 详情页完整说明 |
| `status` | TEXT | 是 | 否 | 项目状态，只允许 `building`、`completed`、`paused` |
| `cover_image` | TEXT | 否 | 否 | 可选封面图片地址 |
| `project_url` | TEXT | 否 | 否 | 可选线上项目地址 |
| `github_url` | TEXT | 否 | 否 | 可选代码仓库地址 |
| `is_featured` | INTEGER | 是 | 否 | 是否精选，限定为 0 或 1，默认 0 |
| `created_at` | TEXT | 是 | 否 | ISO 8601 创建时间 |
| `updated_at` | TEXT | 是 | 否 | ISO 8601 最近更新时间 |

### `project_highlights`

| 字段 | 类型 | 必填 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 是 | 是（主键） | 数据库自动生成的亮点标识 |
| `project_id` | TEXT | 是 | 否 | 关联 `projects.id`，删除项目时级联删除 |
| `content` | TEXT | 是 | 否 | 亮点内容 |
| `sort_order` | INTEGER | 是 | 否 | 显示顺序，默认 0；查询时明确排序 |

### `tools`

| 字段 | 类型 | 必填 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `id` | TEXT | 是 | 是（主键） | 稳定标识工具 |
| `name` | TEXT | 是 | 否 | 工具名称 |
| `description` | TEXT | 是 | 否 | 工具简介 |
| `url` | TEXT | 是 | 是 | 工具的真实 HTTPS 地址，避免重复收录 |
| `category` | TEXT | 是 | 否 | 分类，只允许 `AI`、`开发`、`学习`、`效率` |
| `is_favorite` | INTEGER | 是 | 否 | 是否常用，限定为 0 或 1，默认 0 |
| `created_at` | TEXT | 是 | 否 | ISO 8601 创建时间 |
| `updated_at` | TEXT | 是 | 否 | ISO 8601 最近更新时间 |

### `tags`

| 字段 | 类型 | 必填 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 是 | 是（主键） | 数据库自动生成的标签标识 |
| `name` | TEXT | 是 | 是 | 不重复的标签名称 |

### `project_tags`

| 字段 | 类型 | 必填 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `project_id` | TEXT | 是 | 与 `tag_id` 组合唯一 | 关联 `projects.id` |
| `tag_id` | INTEGER | 是 | 与 `project_id` 组合唯一 | 关联 `tags.id` |

### `tool_tags`

| 字段 | 类型 | 必填 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `tool_id` | TEXT | 是 | 与 `tag_id` 组合唯一 | 关联 `tools.id` |
| `tag_id` | INTEGER | 是 | 与 `tool_id` 组合唯一 | 关联 `tags.id` |

## 8. 迁移前检查清单

- [x] 所有表都有唯一主键；关联表使用复合主键。
- [x] `projects.slug` 设置为 `UNIQUE`，一个路由只对应一个项目。
- [x] 名称、简介、状态、分类和时间等必填字段均设置为 `NOT NULL`。
- [x] 项目封面和两个可选 URL 允许 `NULL`；工具 URL 属于核心信息，不允许为空。
- [x] 项目状态和工具分类使用 `CHECK` 约束限制合法值。
- [x] 项目亮点使用 `sort_order` 保持顺序，读取时使用 `ORDER BY sort_order`。
- [x] 两张多对多关联表使用复合主键，防止重复关联。
- [x] 删除主体或标签后，由 `ON DELETE CASCADE` 清理关联行；可复用标签不会随项目或工具删除。
- [x] `created_at` 在创建记录时由应用写入；`updated_at` 在每次修改时由应用更新。Day 10 可由 Prisma 中间层统一维护。
