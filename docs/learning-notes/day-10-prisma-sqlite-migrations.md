# Day 10：Prisma ORM（数据库对象关系映射）、SQLite 与 Migration（迁移）

状态：进行中

## 一、今天最终要完成什么

Day 9 已经用 SQL 设计并验证了数据库结构。Day 10 要把这些概念变成项目中真正可运行的数据库层：

```text
Prisma Schema
↓ prisma migrate dev
SQLite 数据库文件
↓ prisma db seed
Project、Tool、Tag 等初始数据
↓ Prisma Client
TypeScript 类型安全查询
```

完成后项目会新增：

```text
personal-website/
├── generated/prisma/          # 自动生成的 Prisma Client，不手写
├── lib/prisma.ts              # 全项目共用的数据库客户端
├── prisma/
│   ├── migrations/            # 可追踪的数据库结构迁移
│   ├── schema.prisma          # 数据库模型
│   ├── seed.ts                # 初始数据脚本
│   └── dev.db                 # 本地 SQLite 数据库，不提交 Git
├── scripts/
│   └── check-database.ts      # 查询验证脚本
├── prisma.config.ts           # Prisma CLI 配置
└── .env                       # 本地数据库连接地址，不提交 Git
```

今天先完成数据库建立、迁移、种子和查询验证。公开页面仍可继续读取 `data/*.ts`；等数据库层被确认可靠后，Day 13 和 Day 14 的 CRUD（增删改查）会正式切换数据来源。

## 二、版本选择：为什么固定 Prisma 7.10

截至本课程编写时，Prisma 8 已成为最新版，但它采用新的 Contract（数据契约）和查询工作流，Next.js 官方路线要求 Node.js 24 或更高。

当前课程选择：

```text
Prisma ORM 7.10.0
SQLite
@prisma/adapter-better-sqlite3
```

理由：

- Prisma 7 仍受官方完整支持；
- 官方有成熟的 SQLite 和 Next.js 用法；
- 支持 Node.js 20.19+、22.12+ 和 24；
- Schema、Migration、Seed、Client 的学习路径稳定；
- 与 Day 9 学过的 SQL 关系模型直接对应。

必须固定版本，不要把安装命令中的 `@7.10.0` 删除。否则 npm 可能安装 Prisma 8，后续命令和代码会不匹配。

## 三、Prisma 的四个主要部分

### Prisma Schema

`prisma/schema.prisma` 用声明式语法定义模型、字段、关系和索引。

### Prisma Migrate

比较 Schema 和数据库，生成有版本记录的 SQL Migration（迁移），再应用到数据库。

### Prisma Client

根据 Schema 自动生成 TypeScript 查询 API（接口），提供类型提示和编译检查。

### Prisma Studio

用浏览器图形界面查看和编辑开发数据库。它适合开发检查，不是生产管理后台。

## 四、SQLite 为什么适合当前阶段

SQLite 是文件型关系数据库：

```text
prisma/dev.db
```

优点：

- 不需要安装独立数据库服务器；
- 本地开发配置少；
- 数据量较小时足够快；
- 支持事务、外键、索引和 JOIN；
- 方便学习 Schema 与 Migration。

局限：

- 多服务器共同访问不方便；
- 高并发写入能力不如 PostgreSQL；
- 某些数据类型和约束能力较弱；
- 部署到无持久磁盘的平台时不能直接依赖本地文件。

结论：SQLite 适合本地学习与个人应用早期阶段。部署前再根据平台决定是否迁移到 PostgreSQL。

## 五、Schema 与 Migration 的关系

不要混淆：

```text
schema.prisma → 你希望数据库长什么样
migrations/   → 数据库如何一步步变成这个样子
dev.db        → 当前真实数据库和数据
```

修改 Schema 并不会自动修改数据库。需要运行迁移：

```powershell
npx prisma migrate dev --name init
```

迁移会：

1. 读取 Schema；
2. 计算结构差异；
3. 生成迁移 SQL；
4. 应用到开发数据库；
5. 记录已执行迁移。

## 六、Prisma 字段语法

示例：

```prisma
model Tool {
  id         String   @id
  name       String
  url        String   @unique
  isFavorite Boolean  @default(false) @map("is_favorite")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("tools")
}
```

含义：

| 语法 | 作用 |
| --- | --- |
| `model Tool` | 定义 Prisma 中的 Tool 模型 |
| `String` | 必填字符串 |
| `String?` | 可空字符串 |
| `@id` | 主键 |
| `@unique` | 唯一约束 |
| `@default(false)` | 默认值 |
| `@default(now())` | 创建时使用当前时间 |
| `@updatedAt` | 修改记录时自动更新时间 |
| `@map(...)` | 将代码字段映射到数据库列名 |
| `@@map(...)` | 将模型映射到数据库表名 |

代码可以继续使用 `isFavorite`，数据库使用 `is_favorite`，从而保持两边各自一致的命名风格。

## 七、关系如何写进 Prisma Schema

一对多：

```prisma
model Project {
  id         String             @id
  highlights ProjectHighlight[]
}

model ProjectHighlight {
  id        Int     @id @default(autoincrement())
  projectId String  @map("project_id")
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

多对多显式关联表：

```prisma
model ToolTag {
  toolId String @map("tool_id")
  tagId  Int    @map("tag_id")
  tool   Tool   @relation(fields: [toolId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([toolId, tagId])
  @@map("tool_tags")
}
```

`fields` 是当前模型保存的外键，`references` 是目标模型被引用的字段。

## 八、为什么状态和分类暂时使用 String

可以在 Prisma 中定义 Enum（枚举），但 SQLite 对枚举的数据库级约束有限，而且 Prisma 7 映射后的枚举值与当前中文分类类型会增加额外转换。

Day 10 暂时使用：

```prisma
status   String
category String
```

并保留应用层的 TypeScript 联合类型。取舍是：

- 优点：迁移简单，能原样保存现有中英文值；
- 缺点：数据库本身不能完整阻止其他字符串。

Day 13/14 的写入表单必须在服务端校验合法状态和分类。这个选择不是忘记约束，而是当前 SQLite 与学习阶段下的明确权衡。

## 九、Prisma Client 为什么需要单例

Next.js 开发模式会热更新模块。如果每次导入都创建一个 PrismaClient，可能不断增加数据库连接或客户端实例。

因此 `lib/prisma.ts` 把开发环境实例暂存在 `globalThis`：

```text
第一次加载 → 创建 PrismaClient
热更新     → 复用已有实例
生产环境   → 正常创建单实例
```

这是 Next.js 中常用的开发环境保护模式。

## 十、Seed（种子数据）是什么

Seed 是给空数据库加入初始或开发数据的脚本。

本项目已有可信来源：

```text
data/projects.ts
data/tools.ts
```

种子脚本会读取它们，把数据写入 SQLite。这样不用再次手写两套项目文案。

Prisma 7 不会在每次 migrate 时自动执行种子。需要显式运行：

```powershell
npx prisma db seed
```

种子应尽量 Idempotent（幂等）：重复执行不会无控制地生成重复主体记录。本项目使用 `upsert()` 根据 id 更新或创建。

## 十一、Day 10 完整任务

开始前先停止正在运行的开发服务器。安装依赖和生成 Client 后再重新启动。

### 任务 1：检查 Node.js 版本

```powershell
node --version
```

- `node`：运行 Node.js；
- `--version`：显示版本，不修改文件。

要求至少是 Node.js 20.19。推荐 Node.js 22.12 或更高。如果低于要求，先升级 Node.js，不要继续安装。

### 任务 2：安装固定版本依赖

运行：

```powershell
npm install @prisma/client@7.10.0 @prisma/adapter-better-sqlite3@7.10.0 dotenv
```

解释：

- `npm install`：安装运行时 Dependency（依赖）；
- `@prisma/client`：类型安全数据库查询客户端；
- `@prisma/adapter-better-sqlite3`：连接 SQLite 的 Driver Adapter（驱动适配器）；
- `dotenv`：从 `.env` 读取环境变量；
- `@7.10.0`：固定兼容版本。

再运行：

```powershell
npm install --save-dev prisma@7.10.0 tsx @types/better-sqlite3
```

- `--save-dev`：只在开发和构建阶段需要；
- `prisma`：Prisma CLI（命令行工具）；
- `tsx`：直接运行 TypeScript 脚本；
- `@types/better-sqlite3`：驱动的 TypeScript 类型。

预期：`package.json` 和 `package-lock.json` 被更新。

### 任务 3：配置 ESM 与 TypeScript 目标

Prisma 7 Client 是 ESM-first（优先使用 ECMAScript Module）。在 `package.json` 顶层加入：

```json
"type": "module"
```

在 scripts 中加入：

```json
"postinstall": "prisma generate",
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "prisma db seed",
"db:studio": "prisma studio",
"db:check": "tsx scripts/check-database.ts"
```

在 `tsconfig.json` 将：

```json
"target": "ES2017"
```

改为：

```json
"target": "ES2023"
```

现有 `module: "esnext"` 和 `moduleResolution: "bundler"` 保持不变。

### 任务 4：初始化 Prisma

```powershell
npx prisma init --datasource-provider sqlite --output ../generated/prisma
```

解释：

- `npx`：运行项目内安装的命令；
- `prisma init`：创建 Prisma 初始配置；
- `--datasource-provider sqlite`：数据库类型选 SQLite；
- `--output ../generated/prisma`：把生成的 Client 放到项目根目录的 `generated/prisma`。

预期生成：

```text
prisma/schema.prisma
prisma.config.ts
.env
```

如果文件已存在，不要重复 init。

### 任务 5：配置环境变量和 Git 忽略

`.env` 写：

```dotenv
DATABASE_URL="file:./prisma/dev.db"
```

含义：SQLite 数据库文件位于项目的 `prisma/dev.db`。

`.env` 已被当前 `.gitignore` 的 `.env*` 规则忽略。再加入：

```gitignore
# Prisma generated files and local SQLite databases
/generated/prisma/
/prisma/*.db
/prisma/*.db-journal
```

原因：

- `.env` 可能包含敏感连接信息；
- 本地数据库可能包含私人或测试数据；
- Prisma Client 可以通过 Schema 重新生成。

迁移文件必须提交 Git，不要忽略 `prisma/migrations/`。

### 任务 6：配置 prisma.config.ts

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

这里的 `env("DATABASE_URL")` 会在变量缺失时明确报错，避免悄悄连接错误数据库。

### 任务 7：编写完整 Prisma Schema

用下面结构替换 `prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Project {
  id              String             @id
  slug            String             @unique
  name            String
  description     String
  longDescription String             @map("long_description")
  status          String
  coverImage      String?            @map("cover_image")
  projectUrl      String?            @map("project_url")
  githubUrl       String?            @map("github_url")
  isFeatured      Boolean            @default(false) @map("is_featured")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")
  highlights      ProjectHighlight[]
  projectTags     ProjectTag[]

  @@index([status])
  @@map("projects")
}

model ProjectHighlight {
  id        Int     @id @default(autoincrement())
  projectId String  @map("project_id")
  content   String
  sortOrder Int     @default(0) @map("sort_order")
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, sortOrder])
  @@map("project_highlights")
}

model Tool {
  id          String    @id
  name        String
  description String
  url         String    @unique
  category    String
  isFavorite  Boolean   @default(false) @map("is_favorite")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  toolTags    ToolTag[]

  @@index([category])
  @@index([isFavorite])
  @@map("tools")
}

model Tag {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  projectTags ProjectTag[]
  toolTags    ToolTag[]

  @@map("tags")
}

model ProjectTag {
  projectId String  @map("project_id")
  tagId     Int     @map("tag_id")
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([projectId, tagId])
  @@index([tagId])
  @@map("project_tags")
}

model ToolTag {
  toolId String @map("tool_id")
  tagId  Int    @map("tag_id")
  tool   Tool   @relation(fields: [toolId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([toolId, tagId])
  @@index([tagId])
  @@map("tool_tags")
}
```

这与 Day 9 的 6 张表完全对应。

### 任务 8：格式化并验证 Schema

```powershell
npx prisma format
```

作用：统一 Schema 格式。它会修改 `schema.prisma` 的排版。

```powershell
npx prisma validate
```

作用：检查模型、关系和配置是否合法。预期看到 Schema 有效的成功信息。

如果 validate 不通过，不要继续迁移，先修复具体错误。

### 任务 9：创建第一条迁移

```powershell
npx prisma migrate dev --name init
```

解释：

- `migrate dev`：在开发数据库创建并应用迁移；
- `--name init`：迁移名称为 init，表示初始结构。

预期：

```text
prisma/dev.db
prisma/migrations/<时间>_init/migration.sql
```

打开生成的 `migration.sql`，尝试找到：

- `CREATE TABLE`；
- `PRIMARY KEY`；
- `FOREIGN KEY`；
- `ON DELETE CASCADE`；
- `CREATE UNIQUE INDEX`；
- 普通 `CREATE INDEX`。

不要手动修改已应用的迁移。以后改变结构时创建新迁移。

### 任务 10：生成 Prisma Client

```powershell
npx prisma generate
```

它根据 Schema 在 `generated/prisma` 生成类型和查询代码。

这些代码不是手写源码。Schema 变化后重新生成，不要直接编辑生成目录。

### 任务 11：创建共享 Prisma Client

新建 `lib/prisma.ts`：

```ts
import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("缺少 DATABASE_URL 环境变量");
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 开发环境复用同一个 Prisma Client，避免热更新重复创建实例。
 */
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

`server-only` 由 Next.js 提供构建期保护：如果客户端组件错误导入数据库模块，构建会报错，防止数据库代码进入浏览器。

### 任务 12：创建 Seed 脚本

新建 `prisma/seed.ts`。建议直接复用 `data/projects.ts` 和 `data/tools.ts`，避免复制文案。

核心结构：

```ts
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { projects } from "../data/projects";
import { tools } from "../data/tools";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("缺少 DATABASE_URL 环境变量");
}

// Seed 在 Next.js 进程之外运行，因此创建自己的短生命周期 Client。
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function upsertTag(name: string) {
  return prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function seedProjects() {
  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        slug: project.slug,
        name: project.name,
        description: project.description,
        longDescription: project.longDescription,
        status: project.status,
        coverImage: project.coverImage,
        projectUrl: project.projectUrl,
        githubUrl: project.githubUrl,
        isFeatured: project.isFeatured,
      },
      create: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        longDescription: project.longDescription,
        status: project.status,
        coverImage: project.coverImage,
        projectUrl: project.projectUrl,
        githubUrl: project.githubUrl,
        isFeatured: project.isFeatured,
      },
    });

    // 只重建当前项目的子记录，使重复运行结果保持一致。
    await prisma.projectHighlight.deleteMany({
      where: { projectId: project.id },
    });
    await prisma.projectHighlight.createMany({
      data: project.highlights.map((content, index) => ({
        projectId: project.id,
        content,
        sortOrder: index,
      })),
    });

    await prisma.projectTag.deleteMany({
      where: { projectId: project.id },
    });
    for (const tagName of project.tags) {
      const tag = await upsertTag(tagName);
      await prisma.projectTag.create({
        data: { projectId: project.id, tagId: tag.id },
      });
    }
  }
}

async function seedTools() {
  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: {
        name: tool.name,
        description: tool.description,
        url: tool.url,
        category: tool.category,
        isFavorite: tool.isFavorite,
      },
      create: {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        url: tool.url,
        category: tool.category,
        isFavorite: tool.isFavorite,
      },
    });

    await prisma.toolTag.deleteMany({ where: { toolId: tool.id } });
    for (const tagName of tool.tags) {
      const tag = await upsertTag(tagName);
      await prisma.toolTag.create({
        data: { toolId: tool.id, tagId: tag.id },
      });
    }
  }
}

async function main() {
  await seedProjects();
  await seedTools();
}

main()
  .then(async () => {
    console.log("数据库种子写入完成");
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("数据库种子写入失败", error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

注意：脚本中的 `deleteMany` 只清理已知项目或工具的子关系，然后按当前静态数据重建；它不会删除 Project、Tool 或 Tag 主体。

Seed 不直接导入 `lib/prisma.ts`，因为该文件有 `server-only` 保护，只用于 Next.js 服务端模块。Seed 是独立命令行进程，自己创建 Client，并在结束时 `$disconnect()`。

### 任务 13：显式运行种子

```powershell
npx prisma db seed
```

预期输出包含：

```text
数据库种子写入完成
```

连续运行两次。第二次也应该成功，Project 和 Tool 总数不能翻倍。

### 任务 14：创建查询验证脚本

新建 `scripts/check-database.ts`：

```ts
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("缺少 DATABASE_URL 环境变量");
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [projectCount, toolCount, tagCount] = await Promise.all([
    prisma.project.count(),
    prisma.tool.count(),
    prisma.tag.count(),
  ]);

  const personalWebsite = await prisma.project.findUnique({
    where: { slug: "personal-website" },
    include: {
      highlights: { orderBy: { sortOrder: "asc" } },
      projectTags: { include: { tag: true } },
    },
  });

  const favoriteTools = await prisma.tool.findMany({
    where: { isFavorite: true },
    orderBy: { name: "asc" },
    include: {
      toolTags: { include: { tag: true } },
    },
  });

  console.log({ projectCount, toolCount, tagCount });
  console.log("项目：", personalWebsite?.name);
  console.log(
    "亮点：",
    personalWebsite?.highlights.map((item) => item.content),
  );
  console.log(
    "常用工具：",
    favoriteTools.map((tool) => tool.name),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

运行：

```powershell
npm run db:check
```

预期至少得到：

```text
projectCount: 3
toolCount: 6
项目：Personal Website
亮点：3 条
常用工具：GitHub、ChatGPT、Visual Studio Code
```

具体常用工具顺序由 `orderBy name asc` 决定。

### 任务 15：使用 Prisma Studio

```powershell
npm run db:studio
```

它会启动一个本地数据浏览界面。检查：

- Project 有 3 条；
- Tool 有 6 条；
- Tag 没有重复名称；
- ProjectHighlight 有项目外键和 sortOrder；
- ProjectTag、ToolTag 没有重复组合。

完成后在终端按 `Ctrl + C` 停止 Studio。不要在不理解影响时用 Studio 删除记录。

### 任务 16：运行完整检查

```powershell
npx prisma validate
```

验证 Schema。

```powershell
npx prisma generate
```

验证 Client 能生成。

```powershell
npm run db:check
```

验证真实数据库查询。

```powershell
npm run lint
```

验证代码规范。

```powershell
npx tsc --noEmit
```

验证 TypeScript 类型。

```powershell
npm run build
```

验证 Next.js Production Build（生产构建）。

## 十二、命令执行总顺序

不要一次粘贴全部命令。每一步成功后再继续：

```text
1. node --version
2. 安装 Prisma 运行依赖
3. 安装 Prisma 开发依赖
4. 修改 package.json 和 tsconfig.json
5. prisma init
6. 配置 .env、.gitignore、prisma.config.ts
7. 编写 schema.prisma
8. prisma format
9. prisma validate
10. prisma migrate dev --name init
11. prisma generate
12. 创建 lib/prisma.ts
13. 创建并运行 seed.ts
14. 再运行一次 seed 验证幂等
15. 创建并运行 check-database.ts
16. Prisma Studio 目视检查
17. lint、tsc、build
```

## 十三、常见错误与解决方向

### 1. 不固定 Prisma 版本

可能安装 Prisma 8，导致 init、Schema、Client 和查询 API 与本课不同。检查 `package.json` 必须是 7.10.0。

### 2. Node.js 版本过低

Prisma 7 对 Node.js 有最低要求。先运行 `node --version`，不要把 Engine（运行时版本）错误误认为 Schema 错误。

### 3. Prisma CLI 和 Client 版本不同

`prisma`、`@prisma/client` 和 adapter 应固定相同版本，避免生成器和运行时代码不兼容。

### 4. 忘记 package.json 的 type: module

可能造成 ESM import 运行失败。它是 package.json 顶层字段，不要放进 scripts。

### 5. datasource 中继续写 url

Prisma 7 新配置把 URL 放在 `prisma.config.ts`，Schema 的 datasource 只保留 provider。

### 6. DATABASE_URL 路径写错

本课统一使用：

```dotenv
DATABASE_URL="file:./prisma/dev.db"
```

不要同时产生根目录 `dev.db` 和 `prisma/dev.db` 两个数据库，否则会查询到不同数据。

### 7. 忽略 migrations 目录

迁移是团队和部署建立数据库结构的依据，必须提交。只忽略本地 db 和生成 Client。

### 8. 手动编辑 generated/prisma

生成文件下次会被覆盖。修改 Schema 后重新运行 `prisma generate`。

### 9. 改完 Schema 只 generate 不 migrate

generate 更新 TypeScript Client；migrate 更新真实数据库。两者职责不同。

### 10. 改完 Schema 只 migrate 不 generate

数据库已更新，但代码类型可能还是旧的。Schema 变更后两者都要验证。

### 11. 每次热更新都 new PrismaClient

开发环境可能重复创建实例。使用 `globalThis` 单例保护。

### 12. 在 Client Component 导入 Prisma

Prisma 只能运行在服务端。`lib/prisma.ts` 加入 `server-only`，客户端组件只接收可序列化数据 Props。

### 13. seed 使用 create 导致重复冲突

主体记录应使用 upsert 或 createMany + skipDuplicates。今天使用 upsert 保持重复执行安全。

### 14. 以为 migrate dev 会自动 seed

Prisma 7 需要显式运行 `prisma db seed`。

### 15. 在不了解目标时运行 migrate reset

`prisma migrate reset` 会重建并清空开发数据库。Day 10 不需要执行它。如果将来需要，必须先确认数据库路径和数据是否可恢复。

### 16. 把 Prisma Studio 当成正式管理后台

Studio 是开发工具，没有本项目未来需要的登录、权限、业务校验和操作反馈。Day 12 以后仍要建立自己的 Dashboard（管理后台）。

## 十四、迁移文件应该检查什么

打开 `migration.sql`，不要只看到“命令成功”就结束。对照 Day 9：

- 6 张表是否都创建；
- projects.slug 是否有唯一索引；
- tools.url 和 tags.name 是否唯一；
- project_highlights 是否有 project_id 外键；
- 两张关联表是否使用复合主键；
- 外键删除规则是否为 CASCADE；
- category、status 和 favorite 查询索引是否存在；
- 表名和列名是否使用 snake_case。

注意：因为 Day 10 的 status/category 使用 String，生成迁移可能没有 Day 9 手写的 CHECK。这是已记录的技术取舍，不是遗漏检查。

## 十五、自测题

先独立回答，再看标准答案：

1. Prisma 是数据库吗？
2. Prisma Schema、Migration 和 dev.db 分别是什么？
3. 为什么本课固定 Prisma 7.10.0？
4. SQLite 适合当前项目的原因是什么？
5. `String` 和 `String?` 有什么区别？
6. `@map` 和 `@@map` 有什么区别？
7. `@default(now())` 和 `@updatedAt` 分别何时更新？
8. Prisma 关系中的 fields 和 references 表示什么？
9. `@@id([toolId, tagId])` 有什么作用？
10. migrate 和 generate 有什么区别？
11. 为什么 migrations 要提交，而 dev.db 不提交？
12. 为什么 Prisma Client 使用开发环境单例？
13. 为什么 Prisma 模块要加 server-only？
14. Seed 是什么？
15. 什么是幂等种子脚本？
16. upsert 和 create 的关键区别是什么？
17. 为什么 Day 10 暂时不把公开页面改成数据库查询？
18. Prisma Studio 为什么不能替代管理后台？

## 十六、自测题标准答案

### 1. Prisma 是数据库吗？

标准答案：不是。Prisma 是 ORM 和数据库工具集，负责生成类型安全查询、迁移和开发工具；SQLite 才真正持久保存数据。

判断关键词：ORM、操作工具、SQLite 存储。

### 2. 三者分别是什么？

标准答案：Schema 描述期望的数据模型；Migration 记录结构如何按版本变化；dev.db 是当前真实的 SQLite 数据库及记录。

判断关键词：期望结构、变化历史、真实数据。

### 3. 为什么固定版本？

标准答案：Prisma 8 的环境要求和工作流与本课不同；Prisma 7.10 仍受支持且有成熟的 Next.js、SQLite 路线。固定版本能让命令、文件和代码保持一致。

判断关键词：避免主版本差异、完整支持、可复现。

### 4. SQLite 为什么适合？

标准答案：它无需单独服务器、配置少、用单文件保存数据，并具备关系、事务和索引能力，适合本地学习与个人项目早期阶段。

判断关键词：无需服务器、单文件、关系能力。

### 5. String 与 String? 的区别？

标准答案：String 是必填字段，数据库不能为 null；String? 是可选字段，可以保存 null。

判断关键词：必填、可空。

### 6. 两种 map 有什么区别？

标准答案：`@map` 映射一个字段到数据库列名，`@@map` 映射整个模型到数据库表名。

判断关键词：字段列名、模型表名。

### 7. 两种时间属性有什么区别？

标准答案：`@default(now())` 在创建记录且没有显式提供值时写入当前时间；`@updatedAt` 在 Prisma 更新记录时自动写入最新时间。

判断关键词：创建时间、更新时间。

### 8. fields 和 references 是什么？

标准答案：fields 指当前模型中保存外键值的字段，references 指目标模型中被引用的字段，通常是主键。

判断关键词：当前外键、目标主键。

### 9. 复合 id 做什么？

标准答案：把 toolId 和 tagId 的组合设为主键，保证同一个工具和标签只能关联一次。

判断关键词：组合唯一、防止重复关系。

### 10. migrate 和 generate 有什么区别？

标准答案：migrate 生成并应用 SQL，改变真实数据库结构；generate 根据 Schema 生成 TypeScript Client 和类型，改变代码使用的查询接口。

判断关键词：数据库结构、客户端代码。

### 11. 为什么提交迁移但不提交数据库？

标准答案：迁移是可审查、可重放的结构历史，其他环境需要它；dev.db 是本地状态，可能包含私人数据且容易产生二进制冲突。

判断关键词：结构历史、环境复现、本地数据。

### 12. 为什么使用单例？

标准答案：Next.js 开发热更新会重复执行模块，单例可复用已有 PrismaClient，避免反复创建客户端或连接资源。

判断关键词：热更新、复用、避免重复实例。

### 13. 为什么使用 server-only？

标准答案：数据库连接和 Prisma 只能在服务端运行；server-only 会在客户端错误导入时让构建失败，防止服务器代码进入浏览器模块树。

判断关键词：服务端边界、构建保护、防止泄露。

### 14. Seed 是什么？

标准答案：Seed 是向空数据库写入初始或开发数据的脚本，使新环境可以快速获得可验证的数据。

判断关键词：初始数据、新环境、可验证。

### 15. 什么是幂等种子？

标准答案：重复执行会得到相同目标状态，不会不断增加重复主体或关联数据。

判断关键词：重复执行、相同结果、无重复。

### 16. upsert 和 create 有什么区别？

标准答案：create 只新增，唯一记录已存在时会失败；upsert 在记录存在时更新，不存在时创建。

判断关键词：存在则更新、不存在则创建。

### 17. 为什么暂不切换页面？

标准答案：先独立验证 Schema、迁移、种子和查询，可以缩小问题范围。数据库层稳定后，再在 CRUD 阶段逐步替换公开页面数据来源，风险更低且更易学习。

判断关键词：分层验证、缩小问题、逐步迁移。

### 18. Studio 为什么不能替代后台？

标准答案：Studio 是开发数据库查看工具，不包含网站用户登录、权限、业务校验、审计和面向用户的交互体验。

判断关键词：开发工具、无业务权限、非产品界面。

## 十七、Day 10 验收清单

- [ ] Node.js 版本满足 Prisma 7 要求；
- [ ] 所有 Prisma 包固定为 7.10.0；
- [ ] 已安装 tsx、dotenv 和 SQLite adapter；
- [ ] package.json 使用 type: module；
- [ ] tsconfig target 已调整为 ES2023；
- [ ] 已配置 postinstall 和 db 脚本；
- [ ] 已创建 prisma.config.ts；
- [ ] DATABASE_URL 指向唯一的 prisma/dev.db；
- [ ] .env、本地 db 和 generated Client 被 Git 忽略；
- [ ] migrations 没有被 Git 忽略；
- [ ] schema.prisma 定义 6 个模型；
- [ ] 字段名通过 map 对应 snake_case；
- [ ] ProjectHighlight 正确关联 Project；
- [ ] ProjectTag 和 ToolTag 使用复合主键；
- [ ] 外键删除规则明确；
- [ ] 索引与常用查询字段匹配；
- [ ] prisma format 通过；
- [ ] prisma validate 通过；
- [ ] 已生成并查看 init migration.sql；
- [ ] prisma generate 通过；
- [ ] lib/prisma.ts 使用 adapter 和开发单例；
- [ ] lib/prisma.ts 包含 server-only；
- [ ] seed 复用现有项目和工具数据；
- [ ] seed 主体使用 upsert；
- [ ] seed 重复执行两次，记录数量不翻倍；
- [ ] 数据库包含 3 个项目和 6 个工具；
- [ ] 亮点顺序正确；
- [ ] 标签名称没有重复；
- [ ] db:check 查询通过；
- [ ] Prisma Studio 中关系正确；
- [ ] 没有运行 migrate reset；
- [ ] lint 通过；
- [ ] TypeScript 类型检查通过；
- [ ] Next.js 生产构建通过；
- [ ] 已完成自测并核对标准答案。

## 十八、完成后如何提交检查

全部完成后告诉我：

```text
Day 10 完成，请检查
```

我会检查：

1. 实际安装版本和 Node.js 兼容性；
2. Schema 的字段、关系、映射和删除策略；
3. 迁移 SQL 是否符合 Day 9 设计；
4. 环境变量与 Git 忽略是否安全；
5. 种子是否可重复执行；
6. 数据库中的真实数量与关系；
7. Prisma Client 是否保持服务端边界和单例；
8. lint、类型检查与生产构建。

## 十九、Git 提交建议

先检查：

```powershell
git status
```

确认看不到 `.env`、`dev.db` 和 `generated/prisma`。

暂存时不要盲目使用 `git add .`，先明确文件：

```powershell
git add package.json package-lock.json tsconfig.json .gitignore prisma.config.ts prisma/schema.prisma prisma/migrations prisma/seed.ts lib/prisma.ts scripts/check-database.ts
```

提交：

```powershell
git commit -m "feat: add prisma database foundation"
```

- `feat`：新增数据库能力；
- `prisma database foundation`：Prisma 数据库基础层；
- `-m`：指定提交说明。

## 二十、官方参考

- [Prisma 7 SQLite Quickstart](https://docs.prisma.io/docs/prisma-orm/quickstart/sqlite)
- [Prisma SQLite Connector](https://docs.prisma.io/docs/orm/core-concepts/supported-databases/sqlite)
- [Prisma 7 Seed 命令](https://docs.prisma.io/docs/cli/v7/db/seed)
- [Prisma 7 Next.js 指南](https://www.prisma.io/docs/guides/v7/frameworks/nextjs)

## 一句话总结

Day 10 的核心是把 Day 9 的关系模型变成可迁移的 Prisma Schema，用固定版本、SQLite Adapter、幂等 Seed 和类型安全 Client 建立可靠数据库基础，同时守住环境变量、生成文件和服务端代码边界。
