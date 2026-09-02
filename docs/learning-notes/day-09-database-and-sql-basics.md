# Day 9：Database（数据库）基础、SQL（结构化查询语言）与数据建模

状态：进行中

## 一、今天最终要完成什么

前八天的数据保存在 TypeScript 文件里：

```text
data/projects.ts
data/tools.ts
```

这种方式适合学习和少量固定数据，但以后制作管理后台时会遇到问题：

- 新增工具必须修改代码；
- 修改后需要重新构建和部署；
- 普通管理员不能通过表单管理数据；
- 多个用户同时修改时难以协调；
- 很难记录创建时间、更新时间和数据关系。

Day 9 先不安装 Prisma（数据库操作工具），而是学习它下面真正存在的数据库概念。今天要完成两个学习成果：

```text
docs/database-design.md
database/day-09-practice.sql
```

第一个文件记录本项目的数据表设计，第二个文件用 SQL 练习建表、增加、查询、修改和删除。

## 二、为什么 Day 9 不直接安装 Prisma

Prisma 是 ORM（对象关系映射工具），它让 TypeScript 代码更方便地操作数据库。但它不是数据库本身。

关系如下：

```text
Next.js 应用
↓ 调用
Prisma ORM
↓ 生成并执行 SQL
Database 数据库
↓ 保存
Table 表、Row 行、Column 列
```

如果跳过 SQL 和数据建模，只会机械复制 Prisma 命令。一旦发生这些问题就难以判断原因：

- 唯一字段冲突；
- 外键错误；
- 查询结果为空；
- 删除造成关联数据问题；
- Migration（迁移）和实际结构不一致。

所以今天学“数据库是什么”，Day 10 再学“Prisma 如何操作数据库”。

## 三、数据库是什么

Database（数据库）是按照一定结构持久保存数据的系统。

“持久”表示程序停止运行后，数据仍然存在。React State（状态）刷新页面可能丢失；数据库中的数据会被写入存储介质，下一次启动仍能读取。

当前项目的数据流：

```text
TypeScript 文件 → 构建进应用 → 页面读取
```

未来的数据流：

```text
管理员表单 → 服务端校验 → Prisma → 数据库
                                    ↓
公开页面 ← Server Component ← 查询数据
```

## 四、关系型数据库的基本结构

本项目计划使用 Relational Database（关系型数据库）。它把数据组织成表。

以 tools 表为例：

| id | name | url | category | is_favorite |
| --- | --- | --- | --- | --- |
| github | GitHub | https://github.com | 开发 | 1 |
| chatgpt | ChatGPT | https://chatgpt.com | AI | 1 |

### Table（表）

一类数据的集合，例如：

```text
projects 表 → 保存项目
tools 表    → 保存工具
tags 表     → 保存标签
```

### Row（行）

一条完整记录。例如 GitHub 是 tools 表中的一行。

### Column（列）

一类属性，例如 name、url、category。

### Schema（模式）

描述数据库有哪些表、每张表有哪些列、列的类型和约束。可以把它理解为数据库版本的 TypeScript 类型定义，但数据库 Schema 还会真正限制写入的数据。

## 五、数据库类型和 TypeScript 类型的区别

TypeScript 类型：

```ts
type Tool = {
  id: string;
  name: string;
  isFavorite: boolean;
};
```

SQL 表：

```sql
CREATE TABLE tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0
);
```

区别：

| TypeScript | 数据库 |
| --- | --- |
| 主要在开发和编译阶段检查 | 数据写入时也会检查 |
| 程序停止后类型本身不保存数据 | 持久保存真实记录 |
| 可用数组和对象直接嵌套 | 关系型数据通常拆表并建立关系 |

两边都要有约束。不能因为 TypeScript 已经定义类型，就认为数据库可以接受任意数据。

## 六、常见 SQL 数据类型

今天以接近 SQLite（轻量本地数据库）的写法学习：

| SQL 类型 | 含义 | 项目示例 |
| --- | --- | --- |
| `TEXT` | 文字 | 名称、简介、URL |
| `INTEGER` | 整数 | 排序、布尔值 0/1 |
| `REAL` | 小数 | 暂时不用 |
| `BLOB` | 二进制数据 | 暂时不用 |

SQLite 常用整数 `0` 和 `1` 表示 false 和 true。以后 Prisma 会把它映射成 TypeScript 的 boolean。

时间可以先保存为 ISO 8601 文本：

```text
2026-09-02T10:30:00.000Z
```

Day 10 会让 Prisma 管理日期映射。

## 七、约束：数据库的数据守门员

Constraint（约束）用于阻止不合法数据进入数据库。

### NOT NULL

字段必须有值：

```sql
name TEXT NOT NULL
```

项目名称不能缺失，因此适合 NOT NULL。

### UNIQUE

字段值不能重复：

```sql
slug TEXT NOT NULL UNIQUE
```

两个项目不能使用同一个 slug，否则详情路由不知道应该显示哪一个。

### DEFAULT

没有提供值时使用默认值：

```sql
is_favorite INTEGER NOT NULL DEFAULT 0
```

### CHECK

限制允许的值：

```sql
category TEXT NOT NULL
  CHECK (category IN ('AI', '开发', '学习', '效率'))
```

它类似 TypeScript 的联合类型，但约束发生在数据库中。

## 八、Primary Key（主键）

主键唯一标识一行记录：

```sql
id TEXT PRIMARY KEY
```

主键必须：

- 唯一；
- 不能为空；
- 尽量稳定；
- 不因显示文案变化而变化。

当前 `github`、`personal-website` 可以作为学习阶段的字符串 id。以后也可以使用 UUID（通用唯一标识符）或数据库生成的 id。

不要使用数组下标作为数据库主键。数组顺序变化后，下标会改变。

## 九、Foreign Key（外键）与关系

外键让一张表引用另一张表的主键。

项目亮点适合 One-to-Many（一对多）：

```text
一个 Project
↓ 拥有多个
ProjectHighlight
```

表结构：

```sql
CREATE TABLE project_highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

其中 `project_id` 是外键。它表示这条亮点属于哪个项目。

## 十、为什么数组字段通常需要拆表

TypeScript 中可以直接写：

```ts
tags: ["Next.js", "TypeScript", "个人工具"]
```

关系型数据库中有三种常见方案：

1. 保存成一个用逗号分隔的字符串；
2. 保存成 JSON；
3. 拆成标签表和关联表。

逗号字符串最简单，但难以可靠搜索、去重和建立关系：

```text
"AI,学习,开发"
```

本项目采用关系表思路：

```text
tools
tags
tool_tags
```

一个工具有多个标签，一个标签也能属于多个工具，这叫 Many-to-Many（多对多）。

```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE tool_tags (
  tool_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (tool_id, tag_id),
  FOREIGN KEY (tool_id) REFERENCES tools(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

`PRIMARY KEY (tool_id, tag_id)` 是 Composite Primary Key（复合主键），它阻止同一个标签被重复关联到同一个工具。

## 十一、CRUD 与 SQL

CRUD 是四类基础数据操作：

| CRUD | 含义 | SQL |
| --- | --- | --- |
| Create | 新增 | `INSERT` |
| Read | 查询 | `SELECT` |
| Update | 修改 | `UPDATE` |
| Delete | 删除 | `DELETE` |

### Create：新增

```sql
INSERT INTO tools (
  id,
  name,
  description,
  url,
  category,
  is_favorite
) VALUES (
  'github',
  'GitHub',
  '用于保存代码、管理版本和协作开发。',
  'https://github.com',
  '开发',
  1
);
```

### Read：查询

查询全部列：

```sql
SELECT * FROM tools;
```

只查询需要的列：

```sql
SELECT name, url FROM tools;
```

带条件：

```sql
SELECT name, url
FROM tools
WHERE category = '开发';
```

排序：

```sql
SELECT name, category
FROM tools
ORDER BY name ASC;
```

`ASC` 表示升序，`DESC` 表示降序。

### Update：修改

```sql
UPDATE tools
SET is_favorite = 1
WHERE id = 'mdn';
```

### Delete：删除

```sql
DELETE FROM tools
WHERE id = 'temporary-tool';
```

`UPDATE` 和 `DELETE` 写之前必须先检查 WHERE。漏掉 WHERE 会修改或删除整张表的全部记录。

安全习惯：先用相同条件 SELECT：

```sql
SELECT * FROM tools WHERE id = 'temporary-tool';
```

确认目标正确后再执行 DELETE。

## 十二、WHERE、LIKE、AND 与 OR

精确匹配：

```sql
WHERE category = '学习'
```

模糊匹配：

```sql
WHERE name LIKE '%TypeScript%'
```

`%` 表示任意数量字符。

组合条件：

```sql
WHERE category = '学习' AND is_favorite = 1
```

满足任一条件：

```sql
WHERE category = 'AI' OR category = '开发'
```

复杂条件要加括号明确顺序：

```sql
WHERE (category = 'AI' OR category = '开发')
  AND is_favorite = 1
```

## 十三、JOIN：把关系重新组合

数据拆表后，通过 JOIN（连接查询）组合：

```sql
SELECT
  tools.name AS tool_name,
  tags.name AS tag_name
FROM tools
JOIN tool_tags ON tool_tags.tool_id = tools.id
JOIN tags ON tags.id = tool_tags.tag_id
ORDER BY tools.name, tags.name;
```

`AS` 给结果列设置更清楚的别名。

执行逻辑：

```text
tools
↓ 用 tool_id 连接
tool_tags
↓ 用 tag_id 连接
tags
```

## 十四、Index（索引）

索引类似书的目录，可以加快经常使用的查询条件：

```sql
CREATE INDEX idx_tools_category ON tools(category);
```

适合建立索引的字段通常是：

- 经常出现在 WHERE 中；
- 经常用于排序；
- 经常用于表之间连接。

索引不是越多越好。它会占用空间，写入时也需要维护。当前只有几条数据，性能不重要；今天学习它的作用，不做过度优化。

UNIQUE 通常也会由数据库建立相应的唯一索引。

## 十五、Migration（迁移）

数据库结构会随项目发展而变化：

```text
版本 1：tools 只有 name 和 url
版本 2：增加 category
版本 3：增加 is_favorite
```

Migration（迁移）是一组有顺序、可追踪的数据库结构变更。

它的价值类似 Git 对代码的版本记录：

- 团队知道结构如何变化；
- 新环境能按顺序建立同样的数据库；
- 部署时不需要手工猜应该加哪些列；
- 出错时更容易追踪原因。

Day 10 会用 Prisma Migration（Prisma 数据库迁移）真正生成迁移文件。不要直接手工修改生产数据库结构。

## 十六、关系设计：本项目需要哪些表

推荐的概念模型：

```text
Project 1 ─── N ProjectHighlight
Project N ─── N Tag（通过 ProjectTag）
Tool    N ─── N Tag（通过 ToolTag）
```

核心表：

### projects

| 列 | 约束或用途 |
| --- | --- |
| id | 主键 |
| slug | 唯一、详情路由 |
| name | 必填 |
| description | 必填、卡片简介 |
| long_description | 必填、详情说明 |
| status | 必填、有限集合 |
| cover_image | 可空 |
| project_url | 可空 |
| github_url | 可空 |
| is_featured | 必填，默认 false |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### project_highlights

| 列 | 约束或用途 |
| --- | --- |
| id | 主键 |
| project_id | 外键 |
| content | 必填 |
| sort_order | 保持显示顺序 |

### tools

| 列 | 约束或用途 |
| --- | --- |
| id | 主键 |
| name | 必填 |
| description | 必填 |
| url | 必填 |
| category | 必填、有限集合 |
| is_favorite | 必填，默认 false |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### tags、project_tags、tool_tags

tags 保存不重复的标签名称；另外两张关联表分别记录项目和工具拥有哪些标签。

## 十七、命名风格

TypeScript 常使用 camelCase（小驼峰）：

```text
isFavorite
createdAt
```

SQL 常使用 snake_case（蛇形命名）：

```text
is_favorite
created_at
```

两者都可以，最重要的是一致。Day 10 的 Prisma 可以让代码字段使用 camelCase，同时映射数据库列名。

今天 SQL 统一采用：

- 表名：复数 snake_case；
- 列名：snake_case；
- TypeScript：继续 camelCase。

## 十八、Day 9 完整任务

今天不修改页面 UI，也不安装新 Dependency（依赖）。完成两个学习文件即可。

### 任务 1：创建数据库设计文档

新建：

```text
docs/database-design.md
```

必须包含：

1. 为什么项目要从 TypeScript 静态数据迁移到数据库；
2. Project、Tool、Tag 三个实体的职责；
3. 主键和唯一字段；
4. Project 与 ProjectHighlight 的一对多关系；
5. Project/Tool 与 Tag 的多对多关系；
6. 哪些字段允许为空；
7. 删除 Project 或 Tool 时如何处理关联数据；
8. 命名约定。

### 任务 2：画文字版 ER Diagram（实体关系图）

在 `docs/database-design.md` 中加入：

```text
Project 1 ─── N ProjectHighlight
Project 1 ─── N ProjectTag N ─── 1 Tag
Tool    1 ─── N ToolTag    N ─── 1 Tag
```

并用自己的话解释 `1` 和 `N`。

### 任务 3：编写数据字典

在设计文档中为以下表建立字段表格：

- projects；
- project_highlights；
- tools；
- tags；
- project_tags；
- tool_tags。

每个字段记录：名称、类型、是否必填、是否唯一、用途。

### 任务 4：创建 SQL 练习文件

新建目录和文件：

```text
database/day-09-practice.sql
```

文件顶部写清楚：

```sql
-- Day 9 SQL 基础练习。
-- 当前文件用于学习关系型数据库语法，Day 10 再由 Prisma 管理真实结构。
```

### 任务 5：编写 tools 建表语句

```sql
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('AI', '开发', '学习', '效率')),
  is_favorite INTEGER NOT NULL DEFAULT 0
    CHECK (is_favorite IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

要求你逐列写中文注释，解释为什么需要该约束。

### 任务 6：编写 tags 和 tool_tags

```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tool_tags (
  tool_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (tool_id, tag_id),
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

理解 `ON DELETE CASCADE`：删除工具时，自动删除关联表中的连接记录，但不会因此删除 tags 表中仍可被其他数据复用的标签。

### 任务 7：插入练习数据

至少插入 3 个工具和 4 个标签：

```sql
INSERT INTO tools (
  id, name, description, url, category,
  is_favorite, created_at, updated_at
) VALUES (
  'github',
  'GitHub',
  '用于保存代码、管理版本和协作开发。',
  'https://github.com',
  '开发',
  1,
  '2026-09-02T00:00:00.000Z',
  '2026-09-02T00:00:00.000Z'
);
```

每个 id 和 URL 必须唯一、真实。练习文件重复执行可能触发主键冲突，这是正常的数据库约束表现。

### 任务 8：建立工具与标签关系

先插入标签，再通过子查询找到 tag id：

```sql
INSERT INTO tags (name) VALUES ('代码');

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'github', id
FROM tags
WHERE name = '代码';
```

至少为 GitHub 建立两个标签关联。

### 任务 9：完成 6 个查询练习

在 SQL 文件中写出：

1. 查询全部工具；
2. 只查询工具名称和 URL；
3. 查询开发分类；
4. 查询常用工具并按名称升序排列；
5. 查询名称中包含 `TypeScript` 的工具；
6. 使用 JOIN 查询每个工具对应的标签。

### 任务 10：完成安全更新和删除练习

写出把 MDN 设为常用工具的 UPDATE。

删除练习只针对你额外创建的 `temporary-tool`：

```sql
SELECT * FROM tools WHERE id = 'temporary-tool';

DELETE FROM tools WHERE id = 'temporary-tool';
```

不要删除当前项目真实使用的 GitHub、ChatGPT 等数据。理解先 SELECT 再 DELETE 的安全习惯。

### 任务 11：写迁移前检查清单

在 `docs/database-design.md` 最后回答：

- 所有主键是否唯一？
- slug 是否唯一？
- 必填字段是否明确？
- 可选 URL 是否允许 NULL？
- 分类和状态是否限制合法值？
- 一对多内容如何保持顺序？
- 多对多关系如何防止重复？
- 删除主体记录后关联行如何处理？
- 创建和更新时间由谁维护？

### 任务 12：运行项目检查

虽然今天不改页面，仍要确认文档和 SQL 没意外影响项目：

```powershell
git status
```

预期看到新增数据库设计文档和 SQL 练习文件。

```powershell
npm run lint
```

```powershell
npx tsc --noEmit
```

```powershell
npm run build
```

SQL 文件不会被 Next.js 构建执行。今天不要把 SQL 接入页面，也不要安装 Prisma。

## 十九、SQL 查询练习标准答案

### 1. 查询全部工具

```sql
SELECT * FROM tools;
```

### 2. 查询名称和 URL

```sql
SELECT name, url FROM tools;
```

### 3. 查询开发分类

```sql
SELECT *
FROM tools
WHERE category = '开发';
```

### 4. 查询常用工具并按名称升序

```sql
SELECT id, name, category
FROM tools
WHERE is_favorite = 1
ORDER BY name ASC;
```

### 5. 查询名称包含 TypeScript

```sql
SELECT *
FROM tools
WHERE name LIKE '%TypeScript%';
```

### 6. 查询工具与标签

```sql
SELECT
  tools.name AS tool_name,
  tags.name AS tag_name
FROM tools
JOIN tool_tags ON tool_tags.tool_id = tools.id
JOIN tags ON tags.id = tool_tags.tag_id
ORDER BY tools.name ASC, tags.name ASC;
```

### 7. 把 MDN 设为常用

```sql
UPDATE tools
SET
  is_favorite = 1,
  updated_at = '2026-09-02T00:00:00.000Z'
WHERE id = 'mdn';
```

标准答案中的固定日期只是练习值。真实应用由程序生成当前时间。

## 二十、常见错误

### 1. 认为 Prisma 就是数据库

Prisma 是操作数据库的 ORM，真正存储数据的是 SQLite、PostgreSQL 等数据库。

### 2. 表中没有主键

没有稳定唯一标识会导致修改、删除和建立关系都变得不可靠。

### 3. slug 没有 UNIQUE

详情路由依赖唯一 slug。重复 slug 会产生歧义。

### 4. 所有字段都允许 NULL

会让数据库保存缺少名称、URL 或简介的不完整记录。必填业务字段应使用 NOT NULL。

### 5. 用逗号字符串长期保存标签

它难以去重、查询和建立可靠关系。需要独立查询的标签更适合关系表。

### 6. 多对多关联表没有复合主键

同一个工具和标签可能被重复关联，造成重复显示。

### 7. UPDATE 或 DELETE 漏写 WHERE

会影响全表记录。执行前先用 SELECT 验证相同条件。

### 8. 外键指向不存在的数据

例如 tool_tags 引用一个不存在的 tool_id。外键约束应该阻止这种孤立关系。

### 9. 把展示顺序交给数据库默认返回顺序

没有 ORDER BY 时，数据库不保证记录顺序。需要顺序就建立 sort_order 并明确排序。

### 10. 看到数据少就完全不设计关系

今天数据少，但 Day 13 和 Day 14 会加入管理功能。提前明确关系能避免后面推倒重来。

## 二十一、自测题

先自己回答，再对照标准答案：

1. 数据库的“持久化”是什么意思？
2. Table、Row、Column 分别是什么？
3. Schema 的作用是什么？
4. Prisma 和数据库是什么关系？
5. PRIMARY KEY 有什么作用？
6. 为什么 slug 应该 UNIQUE？
7. NOT NULL 和 DEFAULT 有什么区别？
8. CHECK 约束适合解决什么问题？
9. 什么是 Foreign Key？
10. 一对多关系的项目例子是什么？
11. 为什么 Tool 与 Tag 是多对多？
12. tool_tags 的复合主键解决什么问题？
13. CRUD 分别对应哪些 SQL 命令？
14. UPDATE 和 DELETE 最大的常见风险是什么？
15. JOIN 的作用是什么？
16. 索引的优点和代价是什么？
17. Migration 为什么重要？
18. 为什么 Day 9 不直接安装 Prisma？

## 二十二、自测题标准答案

### 1. 什么是持久化？

标准答案：数据被写入稳定存储，程序停止或服务器重启后仍然存在，之后可以继续读取。

判断关键词：程序停止后仍存在、稳定存储。

### 2. Table、Row、Column 是什么？

标准答案：Table 保存同一类数据；Row 是一条完整记录；Column 是所有记录共有的一类属性。

判断关键词：数据集合、记录、属性。

### 3. Schema 有什么作用？

标准答案：Schema 定义表、列、数据类型、约束和关系，决定数据库允许保存什么结构的数据。

判断关键词：结构、类型、约束、关系。

### 4. Prisma 和数据库是什么关系？

标准答案：Prisma 是 ORM，帮助 TypeScript 程序生成并执行数据库操作；SQLite 或 PostgreSQL 等数据库才真正持久保存数据。

判断关键词：ORM、操作层、真实存储。

### 5. 主键有什么作用？

标准答案：主键稳定且唯一地标识每一行，让查询、更新、删除和建立关联能准确找到目标记录。

判断关键词：唯一标识、稳定、准确操作。

### 6. 为什么 slug 唯一？

标准答案：项目详情路由通过 slug 查找一条项目。如果重复，URL 无法明确对应哪条记录。

判断关键词：动态路由、唯一项目、避免歧义。

### 7. NOT NULL 和 DEFAULT 有什么区别？

标准答案：NOT NULL 禁止字段保存空值；DEFAULT 在插入时未提供字段值的情况下自动使用默认值。

判断关键词：禁止空值、缺省自动值。

### 8. CHECK 适合什么问题？

标准答案：限制字段只能使用合法范围，例如 category 只能是 AI、开发、学习或效率，is_favorite 只能是 0 或 1。

判断关键词：有限合法集合、数据库校验。

### 9. 什么是外键？

标准答案：外键是一张表中引用另一张表主键的字段，用于建立关系并阻止指向不存在记录的无效引用。

判断关键词：引用主键、建立关系、数据完整性。

### 10. 一对多例子是什么？

标准答案：一个 Project 可以拥有多个 ProjectHighlight，而每条 ProjectHighlight 只属于一个 Project。

判断关键词：一个项目、多个亮点、单一归属。

### 11. 为什么工具和标签是多对多？

标准答案：一个工具可以有多个标签，同一个标签也可以被多个工具使用，因此两边都可能对应多个记录。

判断关键词：双方都可多个。

### 12. 复合主键解决什么？

标准答案：`(tool_id, tag_id)` 保证同一个工具和同一个标签的组合只能出现一次，防止重复关联。

判断关键词：组合唯一、防重复。

### 13. CRUD 对应什么？

标准答案：Create 对应 INSERT，Read 对应 SELECT，Update 对应 UPDATE，Delete 对应 DELETE。

判断关键词：INSERT、SELECT、UPDATE、DELETE。

### 14. 更新和删除的最大风险是什么？

标准答案：漏写或写错 WHERE 会修改或删除不应影响的记录，甚至整张表。应先用相同条件 SELECT 验证目标。

判断关键词：WHERE、全表风险、先 SELECT。

### 15. JOIN 有什么作用？

标准答案：JOIN 根据关联字段把多张表的记录组合成一个查询结果，例如把工具、关联表和标签重新组合。

判断关键词：多表、关联字段、组合结果。

### 16. 索引的优点和代价是什么？

标准答案：索引能加快查询、排序和连接，但会占用额外空间，并增加插入和更新时的维护成本。

判断关键词：读更快、空间、写入成本。

### 17. Migration 为什么重要？

标准答案：迁移按顺序记录数据库结构变化，让开发、测试和生产环境可以建立一致结构，并能追踪每次修改。

判断关键词：结构版本、环境一致、可追踪。

### 18. 为什么不直接安装 Prisma？

标准答案：先理解表、主键、约束、关系和 SQL，才能知道 Prisma 替程序生成了什么，并能在约束或迁移出错时正确诊断。

判断关键词：理解底层、不是机械复制、能够诊断。

## 二十三、Day 9 验收清单

- [ ] 已创建 `docs/database-design.md`；
- [ ] 已解释静态数据迁移到数据库的原因；
- [ ] 已画文字版实体关系图；
- [ ] 能解释图中的 1 和 N；
- [ ] 已为 6 张表编写数据字典；
- [ ] 已标明主键、唯一、必填和可空字段；
- [ ] 已说明删除关联数据的策略；
- [ ] 已记录 camelCase 与 snake_case 命名约定；
- [ ] 已创建 `database/day-09-practice.sql`；
- [ ] tools 建表语句包含合理约束；
- [ ] 已创建 tags 和 tool_tags；
- [ ] tool_tags 使用复合主键；
- [ ] 外键包含明确删除策略；
- [ ] 已插入至少 3 个工具和 4 个标签；
- [ ] 已建立至少 2 个工具标签关联；
- [ ] 已完成 6 个 SELECT 查询；
- [ ] 已完成 JOIN 查询；
- [ ] UPDATE 包含准确 WHERE；
- [ ] DELETE 前先用 SELECT 验证目标；
- [ ] 能解释 CRUD；
- [ ] 能解释一对多和多对多；
- [ ] 能解释索引的用途和代价；
- [ ] 能解释 Migration；
- [ ] 今天没有安装 Prisma 或修改页面数据来源；
- [ ] `npm run lint` 通过；
- [ ] `npx tsc --noEmit` 通过；
- [ ] `npm run build` 通过；
- [ ] 已完成自测并对照标准答案。

## 二十四、完成后如何提交检查

全部完成后告诉我：

```text
Day 9 完成，请检查
```

我会检查：

1. 数据关系是否正确；
2. 主键、唯一、必填和外键约束是否合理；
3. SQL 是否存在危险的无条件 UPDATE/DELETE；
4. 查询和 JOIN 是否正确；
5. 设计能否平稳进入 Day 10 Prisma；
6. 项目原有页面是否仍能通过检查和构建。

## 二十五、Git 提交建议

```powershell
git status
```

确认新增文档和 SQL 文件。

```powershell
git add docs/database-design.md database/day-09-practice.sql
```

只暂存 Day 9 的两个学习成果。

```powershell
git commit -m "docs: design initial database schema"
```

- `docs`：本次主要是设计文档和学习 SQL；
- `initial database schema`：初始数据库结构设计；
- `-m`：指定提交说明。

## 一句话总结

Day 9 的核心是把页面中的对象和数组转换成有主键、约束与关系的数据表，并用 SQL 理解 CRUD、JOIN 和安全修改，为 Day 10 使用 Prisma 建立真实数据库打下基础。
