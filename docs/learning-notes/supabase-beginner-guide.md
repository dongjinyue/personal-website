# Supabase 从零入门：给个人网站项目的基础教材

适用对象：第一次接触 Supabase，希望理解它而不只是照着命令操作的学习者。

配套项目：`personal-website`

## 一、Supabase 到底是什么

Supabase 是一套以后端数据库为核心的开发平台。创建一个 Supabase Project（项目）后，主要会得到：

- PostgreSQL（关系型数据库）；
- Data API（数据接口）；
- Auth（身份认证）；
- Storage（文件存储）；
- Realtime（实时数据）；
- Edge Functions（边缘函数）；
- Dashboard（网页管理面板）；
- CLI（命令行工具）。

最重要的一点是：**Supabase 不是一种新的数据库。它的数据库就是 PostgreSQL。**

可以把它理解成：

```text
Supabase
├── PostgreSQL：保存项目、工具、用户等数据
├── Data API：让应用通过网络查询数据库
├── Auth：注册、登录、退出和管理用户身份
├── RLS：根据用户身份控制每一行数据
├── Storage：保存图片、附件等文件
└── Dashboard / CLI：管理上述能力
```

Supabase 帮我们托管和连接这些服务，但表怎么设计、权限怎么定义、数据怎么使用，仍然需要开发者决定。

## 二、为什么个人网站需要它

早期页面的数据保存在：

```text
data/tools.ts
data/projects.ts
```

这种静态数据适合练习，但每次修改内容都需要改代码、重新构建和部署。使用 Supabase 后，数据放在云端 PostgreSQL 中：

```text
浏览器请求 /tools
↓
Next.js Server Component（服务端组件）
↓
Supabase Data API
↓
RLS 检查权限
↓
PostgreSQL 查询数据
↓
页面显示工具卡片
```

后续可以增加管理员登录和管理后台，在网页中新增、修改或删除内容，而不必手动编辑数据文件。

## 三、Organization、Project 和 Database

这三个概念容易混淆：

```text
Organization（组织）
└── Project（项目）
    └── PostgreSQL Database（数据库）
```

本项目的实际关系是：

```text
dongjinyue-personal
└── personal-website
    └── projects、tools、tags 等数据表
```

- Organization 用于分组项目、成员和账单；
- Project 是一套独立的 Supabase 后端；
- Database 是 Project 内真正保存结构化数据的 PostgreSQL。

一个 Organization 可以有多个 Project，而每个 Project 都有自己独立的地址、密钥、数据库和用户。

## 四、Dashboard 左侧常用功能

初学阶段主要使用下面几项：

### 1. Table Editor（表格编辑器）

用表格界面查看表、字段和数据。它方便观察结果，但正式修改数据库结构时应优先使用 Migration（迁移）。

### 2. SQL Editor（SQL 编辑器）

直接执行 SQL。适合查询和排查问题。执行 `delete`、`drop`、`truncate` 等删除命令前必须确认目标，因为它们可能造成数据丢失。

### 3. Authentication（身份认证）

查看用户、配置邮箱登录和第三方登录。Day 11 的管理员登录会使用这里。

### 4. Storage（文件存储）

保存图片和附件。数据库通常只保存文件地址，不直接保存大型图片文件。

### 5. Project Settings（项目设置）

查看 Project URL（项目地址）、API Keys（接口密钥）、数据库连接信息等。

## 五、Table、Row 和 Column

关系型数据库可以想成多个有关联的表格：

```text
tools 表
┌────────┬─────────┬──────────┬──────────┐
│ id     │ name    │ category │ favorite │
├────────┼─────────┼──────────┼──────────┤
│ github │ GitHub  │ 开发     │ true     │
│ notion │ Notion  │ 效率     │ false    │
└────────┴─────────┴──────────┴──────────┘
```

- Table（表）：一类数据的集合；
- Row（行）：一条具体记录；
- Column（列）：记录的某个属性；
- Primary Key（主键）：唯一识别一行；
- Foreign Key（外键）：指向另一张表的记录；
- Constraint（约束）：阻止不合法数据进入数据库；
- Index（索引）：提高常用查询速度。

Supabase 只是管理界面和服务层，底层仍遵循 PostgreSQL 的这些规则。

## 六、Data API 是什么

Supabase 会根据 PostgreSQL 的表生成 Data API。前端不必自己编写一个传统的 REST API（网络接口）才能查询数据，可以使用 `supabase-js`：

```ts
const { data, error } = await supabase
  .from("tools")
  .select("id, name, category");
```

这段代码大致对应：

```sql
select id, name, category from tools;
```

但是“接口自动生成”不代表“所有数据自动安全”。Data API 只负责接收请求，真正的访问控制依赖数据库权限和 RLS。

## 七、四种重要信息不要混淆

### 1. Project URL（项目地址）

格式类似：

```text
https://xxxxxxxxxxxxxxxxxxxx.supabase.co
```

用于确定访问哪个项目，可以出现在浏览器代码中。

### 2. Project Reference（项目标识）

就是地址中的 `xxxxxxxxxxxxxxxxxxxx`。CLI 用它关联项目：

```powershell
npx supabase link --project-ref 你的项目标识
```

它不是密码。

### 3. Publishable Key（公开密钥）

用于普通应用请求，可以放进带 `NEXT_PUBLIC_` 前缀的环境变量。它的权限仍然受 RLS 限制。

### 4. Secret Key / Service Role Key（服务端高级密钥）

它拥有高权限，可以绕过 RLS。不能放入浏览器、公开仓库、截图或聊天记录。当前个人网站的公开读取完全不需要它。

记忆方法：

```text
URL + Publishable Key：告诉 Supabase“访问哪个项目”
用户登录会话：告诉 Supabase“你是谁”
RLS Policy：决定“你能做什么”
```

## 八、环境变量为什么分成两个文件

`.env.example` 是可以提交到 Git 的模板：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` 保存当前电脑使用的真实值：

```env
NEXT_PUBLIC_SUPABASE_URL=真实项目地址
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=真实公开密钥
```

规则：

- `.env.example` 只写变量名，不写真实值；
- `.env.local` 必须被 `.gitignore` 忽略；
- 修改 `.env.local` 后要重启 Next.js 开发服务器；
- 私密密钥绝不能使用 `NEXT_PUBLIC_` 前缀；
- 部署到 Vercel 等平台时，要在平台的环境变量设置中重新配置。

`NEXT_PUBLIC_` 表示变量会进入浏览器构建产物，不表示它经过加密。

## 九、RLS 是 Supabase 安全的核心

RLS 是 Row Level Security（行级安全）。它让 PostgreSQL 根据当前用户和策略决定哪些行能够被读取或修改。

本项目 Day 10 的公开读取策略：

```sql
create policy "Public can read tools"
on public.tools
for select
to anon, authenticated
using (true);
```

含义：

- `for select`：只允许查询；
- `to anon, authenticated`：匿名和已登录用户适用；
- `using (true)`：允许读取所有行；
- 没有 `insert/update/delete` Policy，所以普通访客不能写入。

RLS 的思考顺序：

```text
1. 当前请求是什么角色或用户？
2. 请求执行 SELECT、INSERT、UPDATE 还是 DELETE？
3. 对应操作有没有 Policy？
4. 当前行是否满足 Policy 条件？
```

重要原则：公开密钥不是安全边界，RLS 才是。即使别人看到了 Publishable Key，只要 RLS 正确，他们仍然只能执行被允许的操作。

## 十、anon、authenticated 和 postgres

- `anon`：未登录访客；
- `authenticated`：已通过 Supabase Auth 登录的用户；
- `postgres`：数据库管理员，通常可以绕过 RLS；
- `service_role`：服务端高权限角色，也能绕过 RLS。

因此在 Table Editor 中使用 `Role postgres` 看到数据，不能证明匿名访问策略正确。Day 10 切换到 `Role anon` 后仍能看到 6 个工具，才证明公开读取策略有效。

## 十一、Migration 为什么比手动点表格更重要

Migration 是按顺序保存数据库结构变化的 SQL 文件，例如：

```text
supabase/migrations/
└── 20260902083352_create_content_tables.sql
```

它解决三个问题：

1. 可追踪：可以知道数据库发生过哪些变化；
2. 可复制：其他环境可以建立相同结构；
3. 可审查：SQL 可以进入 Git，由开发者检查。

推荐流程：

```text
修改 Migration
↓
检查 SQL
↓
db push --dry-run
↓
确认目标项目
↓
db push
↓
检查远程结果
```

常用命令：

```powershell
npx supabase migration new 迁移名称
npx supabase db push --dry-run
npx supabase db push
```

不要为了图快只在 Dashboard 手动改正式数据库，否则本地 Migration 与云端结构可能不一致。

## 十二、Seed 和 Migration 的区别

Migration 管结构：

```text
表、字段、主键、外键、索引、触发器、RLS Policy
```

Seed 管初始内容：

```text
初始项目、工具、标签和关联关系
```

本项目使用：

```text
supabase/seed.sql
```

执行远程 Seed：

```powershell
npx supabase db push --include-seed
```

好的 Seed 应尽量具备 Idempotent（幂等）特性，也就是执行多次仍得到同样结果，而不是不断产生重复记录。

生产数据库可能包含真实用户内容，不能把开发 Seed 当成普通更新脚本反复执行。

## 十三、CLI、Dashboard 和应用代码的分工

```text
Dashboard：观察数据、用户、日志和配置
CLI：登录、关联项目、运行迁移、生成类型
Migration：记录数据库结构
Seed：准备初始数据
supabase-js：让应用读取或修改数据
RLS：在数据库层保护每次访问
```

CLI 登录：

```powershell
npx supabase login
```

关联项目：

```powershell
npx supabase link --project-ref 你的项目标识
```

生成 TypeScript 类型：

```powershell
npx supabase gen types typescript --linked | Out-File -Encoding utf8 lib/supabase/database.types.ts
```

数据库结构改变后要重新生成类型，但不要手动编辑生成文件。

## 十四、本项目代码如何连接 Supabase

重要文件：

```text
.env.local
├── 项目 URL
└── Publishable Key

lib/supabase/database.types.ts
└── 从真实数据库自动生成的 TypeScript 类型

lib/supabase/server.ts
└── 为每次服务端请求创建 Supabase Client

lib/tool-repository.ts
└── 查询 tools、tool_tags、tags 并转换数据

app/tools/page.tsx
└── 调用 getTools()，把结果传给 ToolExplorer
```

为什么使用 Repository（数据访问层）：

- 页面不需要知道复杂的数据库关联；
- 集中处理 `is_favorite` 到 `isFavorite` 的命名转换；
- 集中验证工具分类；
- 将来容易添加新增、修改、删除功能。

为什么 `server.ts` 使用 `server-only`：它能防止服务端模块被错误导入 Client Component（客户端组件），明确代码运行边界。

## 十五、Auth 与 RLS 将如何配合

Day 11 登录后的流程会是：

```text
管理员提交邮箱和密码
↓
Supabase Auth 验证身份
↓
浏览器获得 Session（登录会话）
↓
Cookie 保存会话凭据
↓
服务端请求携带 Cookie
↓
RLS 根据用户身份决定是否允许写入
```

Auth 只回答“你是谁”，RLS 才回答“你能做什么”。登录成功不代表自动拥有管理员权限，后续仍需设计管理员识别和写入 Policy。

## 十六、常见错误与排查顺序

### 页面提示缺少环境变量

检查 `.env.local` 的变量名、等号和真实值，修改后重启 `npm run dev`。

### 数据库有数据，但页面读取为空

依次检查：

1. 应用是否连接了正确 Project；
2. Publishable Key 是否属于该 Project；
3. Data API 是否启用；
4. 表是否启用 RLS；
5. `anon` 是否存在 SELECT Policy；
6. 查询的表名和关系名是否正确。

### Table Editor 能看到，页面却看不到

Table Editor 可能正在使用 `postgres` 管理员角色。切换成 `anon` 再检查，不能用管理员视角证明公开权限正确。

### CLI 推送到错误项目

执行前确认 Dashboard 项目和本地 Project Reference。先使用 `--dry-run` 查看准备执行的迁移。

### 修改表后 TypeScript 报错

重新生成 `database.types.ts`，然后运行：

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

### Publishable Key 被别人看到怎么办

它本来就是公开客户端密钥。重点应检查 RLS 是否正确。如果暴露的是 Secret Key 或 Service Role Key，应立即在 Dashboard 轮换密钥，并检查访问日志。

## 十七、安全底线

必须遵守：

1. 永远不要在浏览器中使用 Service Role Key；
2. 永远不要提交 `.env.local`；
3. 每张通过 Data API 访问的业务表都要检查 RLS；
4. 不要给匿名角色开放无条件写入；
5. 修改远程数据库前先确认 Project；
6. 重要变更使用 Migration，而不是只在 Dashboard 点击；
7. 生产数据库执行删除和 Seed 前先备份并确认范围；
8. 不要在截图、聊天或终端历史中暴露密码和私密密钥。

## 十八、日常开发标准流程

```text
设计数据变化
↓
创建或修改 Migration
↓
检查约束、外键、索引和 RLS
↓
执行 dry-run
↓
推送到开发项目
↓
必要时执行 Seed
↓
生成 TypeScript 类型
↓
编写 Repository 查询
↓
运行 lint、类型检查和 build
↓
在 anon / authenticated 角色下验证权限
```

## 十九、自测题

先独立回答，再看下一节：

1. Supabase 的数据库是什么？
2. Organization 和 Project 有什么区别？
3. Publishable Key 为什么可以出现在浏览器中？
4. 什么才是数据库访问的主要安全边界？
5. Auth 和 RLS 分别解决什么问题？
6. 为什么用 `postgres` 看到数据不能证明 RLS 正确？
7. Migration 和 Seed 有什么区别？
8. 为什么数据库结构改变后要重新生成 TypeScript 类型？
9. `.env.example` 和 `.env.local` 有什么区别？
10. 为什么 Repository 不只是“多写一个文件”？

## 二十、自测题标准答案

### 1. Supabase 的数据库是什么？

标准答案：是 PostgreSQL。Supabase 在 PostgreSQL 周围增加了 Data API、Auth、Storage、Realtime、Dashboard 和 CLI 等能力。

### 2. Organization 和 Project 有什么区别？

标准答案：Organization 用于组织多个项目、成员和账单；Project 是一套具体且相互隔离的 Supabase 后端。

### 3. Publishable Key 为什么可以出现在浏览器中？

标准答案：它是用于普通客户端请求的公开项目密钥，本身不是管理员权限。实际允许的数据库操作由角色、授权和 RLS Policy 决定。

### 4. 什么才是数据库访问的主要安全边界？

标准答案：数据库权限和 RLS，而不是隐藏 Publishable Key。私密的 Service Role Key 则必须严格保密。

### 5. Auth 和 RLS 分别解决什么问题？

标准答案：Auth 验证用户身份，回答“你是谁”；RLS 根据身份限制数据库操作，回答“你能做什么”。

### 6. 为什么用 `postgres` 看到数据不能证明 RLS 正确？

标准答案：`postgres` 是管理员角色，可以绕过普通 RLS 限制。应使用 `anon` 或 `authenticated` 角色验证真实应用权限。

### 7. Migration 和 Seed 有什么区别？

标准答案：Migration 管理表、字段、约束、索引和 Policy 等结构；Seed 写入开发或演示所需的初始数据。

### 8. 为什么数据库结构改变后要重新生成 TypeScript 类型？

标准答案：应用代码的类型必须与真实数据库保持同步，否则代码可能继续引用已删除字段，或无法识别新增字段。

### 9. `.env.example` 和 `.env.local` 有什么区别？

标准答案：`.env.example` 是不含真实值的公开配置模板；`.env.local` 保存当前电脑的真实配置，并应被 Git 忽略。

### 10. 为什么 Repository 不只是“多写一个文件”？

标准答案：Repository 隔离数据库查询与页面显示逻辑，集中处理关联查询、错误、类型校验和字段转换，使后续维护与测试更清楚。

## 二十一、术语速查表

| 术语 | 简单解释 |
| --- | --- |
| PostgreSQL | Supabase 底层使用的关系型数据库 |
| Schema | 数据库中的命名空间，本项目主要使用 `public` |
| Data API | 根据数据库结构提供的网络访问接口 |
| Auth | 注册、登录、会话和用户身份管理 |
| RLS | 根据角色或用户控制每一行数据的数据库安全机制 |
| Policy | RLS 中针对某项操作定义的允许条件 |
| `anon` | 未登录访客角色 |
| `authenticated` | 已登录用户角色 |
| Migration | 可追踪、可重复应用的数据库结构变更 |
| Seed | 用来准备初始或开发数据的脚本 |
| CLI | 在终端中操作 Supabase 的命令行工具 |
| Repository | 封装数据库访问和数据转换的代码层 |
| Session | 用户登录后持续一段时间的身份会话 |
| Cookie | 浏览器保存并随请求发送的小段会话数据 |

## 二十二、官方参考

- [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture)
- [Supabase Database](https://supabase.com/docs/guides/database/overview)
- [API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)

## 一句话总结

Supabase 是以 PostgreSQL 为核心的后端平台；应用用 URL 和 Publishable Key 连接项目，用 Auth 表明身份，用 RLS 控制权限，用 Migration 管理结构，并通过生成类型和 Repository 安全地把数据库数据交给 Next.js 页面。
