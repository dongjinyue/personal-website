# Day 14：项目增删改查与公开/私有权限

状态：进行中

适用：personal-website，Next.js 16.3.4、React 19、Supabase。日期：2026-09-03。

今天的全部学习任务、核心参考代码、知识解释、验收和标准答案都在本文中。按任务顺序实现，不必等聊天逐步补充。本文是教学文档，不表示项目管理功能或数据库迁移已经执行。

教材验证记录：6 段 TypeScript/TSX 示例通过语法检查；4 个核心模块在内存中模拟新增 is_public 类型后通过类型检查；10 项输入校验通过。没有改写真实生成类型、没有应用 SQL，也没有运行尚未实现的页面。该检查不能替代真实迁移后重新生成类型和执行整套验收。

## 一、今天的目标与边界

Day 13 学会“安全地修改工具”，Day 14 学会“管理项目，并控制谁能读到项目”。

完成后：

1. 管理员分页查看全部项目，包括私有项目。
2. 新建、编辑、删除项目基本信息。
3. 新建默认私有；独立确认后公开，也可以重新设为私有。
4. 首页推荐、公开项目列表、详情正文和详情标题统一读取数据库。
5. 普通访客不能通过猜地址、数据库接口或关联表读到私有项目。

今天管理的字段：名称、slug（网址短名）、简介、详细说明、进度状态、项目网址、代码仓库网址、首页推荐标记。公开状态由单独操作管理。

今天不做：图片上传、富文本编辑器、标签选择器、亮点编辑器、多管理员、回收站。已有亮点和标签继续读取；编辑基础字段不得清空它们。新增项目暂时没有亮点和标签，公开详情只在有内容时显示对应区域。

删除沿用已有物理删除能力：删除项目及其亮点、标签关联；不删除共享标签，不删除工具。没有一键恢复，只用自己新建的测试项目测试删除。

## 二、先理解：公开状态不是项目进度

| 概念 | 字段 | 示例 | 决定什么 |
| --- | --- | --- | --- |
| 项目进度 | status | building / completed / paused | 正在开发、已完成、暂停 |
| 是否公开 | is_public | true / false | 访客能否访问 |
| 是否推荐 | is_featured | true / false | 是否优先在首页展示 |

一个 completed（已完成）项目可以是私有的；一个 building（开发中）项目也可以公开。首页推荐条件必须是“公开且推荐”，不能只检查推荐。

### 权限矩阵——今天的标准答案

| 身份 | 公开项目 | 私有项目 | 新增/编辑/删除/切换公开 |
| --- | --- | --- | --- |
| 未登录访客 | 可读 | 不可读 | 不允许 |
| 普通登录用户 | 可读 | 不可读 | 不允许 |
| 指定管理员的后台 | 可读 | 可读 | 允许 |
| 管理员浏览公开网站 | 仅展示公开项目 | 不展示 | 在后台操作 |

最后一行是有意设计：管理员从公开页看到的内容应与访客一致，防止“我看得到，所以别人也看得到”的误判。后台是管理视图，公开页是访客视图。

### 隐藏按钮不等于私有

浏览器拿到全部项目后再 `.filter()`（筛选），私有数据已经发出去了。必须先在数据库用 RLS（行级安全）过滤，再返回允许的数据。

数据库子表也不会自动继承父表的读取策略。只保护 projects、不保护 project_highlights，别人可能直接读到私有项目的亮点。

### 私有不等于追回过去已经公开的内容

切回私有只能限制之后的访问，无法删除别人已经保存的截图、搜索引擎缓存或已下载内容。网站也不具备机密资料管理能力，不要用真实秘密测试。

## 三、任务地图与实施顺序

| 文件/区域 | 本课工作 |
| --- | --- |
| 新 SQL 迁移 | is_public 字段，替换读取策略，项目写入权限 |
| `lib/supabase/database.types.ts` | 从数据库重新生成，不手写字段 |
| `lib/project-form.ts` | 基础字段校验 |
| `lib/admin-projects-repository.ts` | 管理员分页与单条读取 |
| `app/admin/projects/actions.ts` | 保存、删除、公开/私有操作 |
| `components/admin/ProjectForm.tsx` | 按 ToolForm 的既有模式实现项目表单 |
| 项目删除/公开按钮 | 复用 ConfirmDialog 和等待/错误模式 |
| `app/admin/projects/page.tsx` | 只读预览升级为管理列表 |
| `app/admin/projects/new/page.tsx` | 新建私有项目 |
| `app/admin/projects/[id]/edit/page.tsx` | 编辑、当前可见性与公开操作 |
| `app/admin/projects/not-found.tsx` | 项目不存在时的管理提示 |
| `lib/supabase/public.ts` | 不携带用户会话的公开查询客户端 |
| `lib/project-repository.ts` | 公开项目查询与数据转换 |
| 首页、公开列表、公开详情 | 全部去掉静态项目数组读取 |

顺序：权限 → 类型 → 校验/管理员查询 → 写入动作 → 管理界面 → 公开数据接入 → 全链路验收。

**重要过渡提醒：**权限迁移生效后，旧的静态首页/详情仍可能展示旧数组。完成公开页面改造前，不要把系统当成已经具备私有保护，更不要部署这个半成品状态。若已有线上网站，先安排维护或在独立开发项目验证完整变更；本课不自动发布线上内容。

## 四、任务 1：新增字段并替换读取策略

### 1.1 先检查现状

本次代码中，projects 尚无 `is_public`，三张项目相关表仍有 Day 10 的公开读取策略。

在 SQL Editor（SQL 编辑器）运行只读查询：

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('projects', 'project_highlights', 'project_tags');
```

预期每张表有 Day 10 对应的公开 SELECT（读取）策略。若有其他自定义策略，先核对，不盲目叠加。允许型策略通常按“或”组合：旧的 `using (true)` 保留，就可能让新的私有限制失效。

### 1.2 创建迁移文件

```powershell
npx supabase migration new project_visibility_and_admin_write
```

- `npx` 运行项目命令行工具。
- `migration new` 创建本地迁移文件，不修改云端。
- 后面的名称表示“项目可见性和管理员写入”。预期在 migrations 目录得到带时间戳的新 SQL 文件。

不要修改已经执行过的 Day 10/13 迁移。

### 1.3 新字段的默认值

选择 `is_public boolean not null default false`：所有新项目默认私有，已有记录也先变成私有，之后由你逐一确认公开。

这是安全优先的教学选择，可能暂时让公开项目列表为空；不是数据被删了。本课不会自动把全部历史记录公开。原有三个练习项目确认内容合适后，可在新后台逐个公开。

### 1.4 迁移参考 SQL

把所有 `REPLACE_WITH_ADMIN_UUID` 替换为与 Day 11 配置、Day 13 策略一致的管理员用户 UUID。不是邮箱，也不是项目 ID。SQL 无法读取 Next.js 的 `.env.local`。

```sql
alter table public.projects
  add column is_public boolean not null default false;

alter table public.projects enable row level security;
alter table public.project_highlights enable row level security;
alter table public.project_tags enable row level security;

-- 必须替换旧的无条件读取策略，而不是只新增一条限制策略。
drop policy "Public can read projects" on public.projects;
drop policy "Public can read project highlights" on public.project_highlights;
drop policy "Public can read project tags" on public.project_tags;

revoke all privileges on table public.projects from anon, authenticated;
revoke all privileges on table public.project_highlights from anon, authenticated;
revoke all privileges on table public.project_tags from anon, authenticated;
grant select on public.projects, public.project_highlights, public.project_tags
  to anon, authenticated;

-- 新增时不授予 is_public 写入权限，使用数据库默认 false。
grant insert (id, slug, name, description, long_description, status,
  project_url, github_url, is_featured)
  on public.projects to authenticated;

-- slug 在本课创建后固定；公开状态通过单独的确认操作修改。
grant update (name, description, long_description, status,
  project_url, github_url, is_featured, is_public)
  on public.projects to authenticated;
grant delete on public.projects to authenticated;

create policy "Visible projects or admin" on public.projects
for select to anon, authenticated
using (is_public or (select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);

create policy "Admin inserts projects" on public.projects
for insert to authenticated
with check ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);

create policy "Admin updates projects" on public.projects
for update to authenticated
using ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid)
with check ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);

create policy "Admin deletes projects" on public.projects
for delete to authenticated
using ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);

-- 只允许读取调用者能够读取的父项目所关联的内容。
-- 子查询也受 projects 的 RLS 约束，不需要高权限函数绕过。
create policy "Readable project highlights" on public.project_highlights
for select to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_highlights.project_id
));

create policy "Readable project tags" on public.project_tags
for select to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_tags.project_id
));
```

解释：

- 父表不引用子表策略，子表只检查父表，避免形成互相递归的权限查询。
- 本课不授予子表写入权限，避免表单保存一半成功、一半失败。
- tags 保持现有公开字典。标签名本身不是私密信息；不要往公共标签字典放秘密。私有项目“关联了哪些标签”由 project_tags 策略保护。
- 这里只变动项目相关表，不触碰工具权限。
- SQL 基于当前本地迁移结构；若你另行设置过列级授权或自定义角色，应先审查，不把它当成任意旧数据库的通用清理脚本。

### 1.5 预演、推送、确认

```powershell
npx supabase db push --dry-run
npx supabase db push
```

`--dry-run` 仅列出待应用迁移。确认只有预期新文件再执行第二条；第二条会真实增加列并改变云端权限，使现有项目默认私有，不删除项目记录。预期显示新迁移应用成功。

之后重新执行 1.1 的只读查询，确认旧无条件项目读取策略已消失。不要因为查不到私有项目就关闭 RLS。

## 五、任务 2：重新生成数据库类型

本次新增了列，必须重新生成类型。与 Day 13 仅改权限不同。

先把输出写入一个临时文件，避免命令失败时清空现有类型文件：

```powershell
npx supabase gen types typescript --linked > lib/supabase/database.types.generated.ts
```

- `gen types typescript`：按远端表结构生成 TypeScript（类型化 JavaScript）声明。
- `--linked`：使用当前已关联的 Supabase 项目。
- `>`：写入或覆盖右侧临时文件；先确认它不是你已有的工作文件。

检查命令成功、临时文件内容完整，并且 projects 的 Row 中有 `is_public: boolean`，Insert/Update 中有相应可选字段。确认后用编辑器将完整生成内容替换 `database.types.ts`，再删除本次临时文件。

不要手工补一个字段来掩盖迁移未生效，也不要把错误信息当成生成类型保存进去。类型只是辅助开发，不能代替运行时输入验证。

## 六、任务 3：项目字段校验

新建 `lib/project-form.ts`。本课 slug 创建后不可改：降低旧链接失效和缓存处理复杂度。需要更名网址时另做带重定向的迁移设计，不悄悄修改。

```ts
export const projectStatuses = ['building', 'completed', 'paused'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];
export type ProjectFields = {
  slug: string;
  name: string;
  description: string;
  long_description: string;
  status: string;
  project_url: string;
  github_url: string;
  is_featured: boolean;
};
export type ProjectErrors = Partial<Record<keyof ProjectFields, string>>;
export type ProjectActionState = {
  message: string;
  errors: ProjectErrors;
  attempt: number;
};

export function validProjectId(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}
export function validProjectSlug(value: string) {
  return value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** 空网址合法；非空网址只接受不带账号密码的 HTTP/HTTPS 地址。 */
export function normalizeProjectUrl(value: string): string | null {
  if (!value.trim()) return null;
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || url.href.length > 2048) throw new Error('网址不合法');
  return url.href;
}

export function parseProjectForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };
  const values: ProjectFields = {
    slug: text('slug'), name: text('name'), description: text('description'),
    long_description: text('long_description'), status: text('status'),
    project_url: text('project_url'), github_url: text('github_url'),
    is_featured: formData.get('is_featured') === 'on',
  };
  const errors: ProjectErrors = {};
  if (!validProjectSlug(values.slug)) errors.slug = '请输入不超过 80 字符的小写英文、数字或中间连字符。';
  if (!values.name || values.name.length > 100) errors.name = '名称需为 1～100 个字符。';
  if (!values.description || values.description.length > 500) errors.description = '简介需为 1～500 个字符。';
  if (!values.long_description || values.long_description.length > 5000) {
    errors.long_description = '详细说明需为 1～5000 个字符。';
  }
  if (!projectStatuses.some((status) => status === values.status)) {
    errors.status = '请选择开发中、已完成或暂停。';
  }
  for (const key of ['project_url', 'github_url'] as const) {
    try { values[key] = normalizeProjectUrl(values[key]) ?? ''; }
    catch { errors[key] = '请输入有效 HTTP/HTTPS 网址，或留空。'; }
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}
```

重要：数据库字段用下划线，已有页面模型用驼峰；在数据转换层处理，不要同时让所有组件跟着改名。`is_public` 不放进这份普通表单白名单，避免保存简介时顺带公开。

## 七、任务 4：管理员查询与保存动作

### 4.1 查询模块的标准实现要求

新建 `lib/admin-projects-repository.ts`，参照已经完成的 `admin-tools-repository.ts`：

- 每个导出读取函数先 `await requireAdmin()`。
- `getAdminProjectsPage`：projects 计数，每页 10 条，更新时间倒序、ID 升序，夹住非法/越界页码。
- `getAdminProject(id)`：校验 ID，按 ID `.maybeSingle()`，区分数据库错误与不存在。
- 列表要读取 `id, slug, name, status, is_public, is_featured, updated_at`；编辑回显另外读取简介、详细说明和两个网址。
- 不加 `.eq('is_public', true)`，后台需要看到私有项目。

动手练习：用 Day 13 的完整分页函数改出项目版本。标准答案的关键差异是表名、返回字段与 ID 校验，不是复制出不必要的通用“任意表名管理器”。

### 4.2 保存动作参考

新建 `app/admin/projects/actions.ts`。下面代码只处理基础字段、可见性和删除，不处理关联表编辑。

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseProjectForm, validProjectId, type ProjectActionState } from '@/lib/project-form';

async function checkProjectWriter() {
  try {
    const user = await getCurrentUser();
    if (!user) return '登录已失效，请在新标签页重新登录后回来继续。';
    return isAdmin(user.id) ? null : '当前账号没有管理员权限。';
  } catch { return '暂时无法确认身份，请稍后重试。'; }
}
function invalidateProjects(id: string) {
  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath('/projects/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${id}/edit`);
}
function validVersion(version: string) {
  return Boolean(version) && Number.isFinite(Date.parse(version));
}

export async function saveProject(
  mode: 'create' | 'edit', id: string, version: string,
  previous: ProjectActionState, formData: FormData,
): Promise<ProjectActionState> {
  const fail = (message: string, errors: ProjectActionState['errors'] = {}) => ({
    message, errors, attempt: (Number(previous?.attempt) || 0) + 1,
  });
  const denied = await checkProjectWriter();
  if (denied) return fail(denied);
  if (!validProjectId(id) || !['create', 'edit'].includes(mode)) return fail('操作参数无效。');
  if (mode === 'edit' && !validVersion(version)) return fail('版本无效，请重新打开编辑页。');
  const parsed = parseProjectForm(formData);
  if (!parsed.valid) return fail('请修正标出的字段。', parsed.errors);
  const { slug, ...fields } = parsed.values;
  const payload = { ...fields,
    project_url: fields.project_url || null, github_url: fields.github_url || null,
  };
  try {
    const supabase = await createSupabaseServerClient(true);
    if (mode === 'edit') {
      const current = await supabase.from('projects').select('slug')
        .eq('id', id).maybeSingle();
      if (current.error) return fail('暂时无法核对当前项目。');
      if (!current.data) return fail('项目不存在或没有权限。');
      if (current.data.slug !== slug) return fail('创建后不能修改网址短名。', { slug: '请保留原网址短名。' });
    }
    // 新建不传 is_public，使用数据库默认私有；编辑也不改变公开状态。
    const query = mode === 'create'
      ? supabase.from('projects').insert({ id, slug, ...payload })
      : supabase.from('projects').update(payload).eq('id', id).eq('updated_at', version);
    const { data, error } = await query.select('id').maybeSingle();
    if (error?.code === '23505') return fail('网址短名或记录标识已存在，请先核对列表。');
    if (error) return fail('保存未获确认，请检查权限，重试前先核对记录。');
    if (!data) return fail('记录已修改、删除或权限不匹配，请保留输入并重新核对。');
  } catch { return fail('没有收到保存确认，操作可能已完成，请先核对列表。'); }
  invalidateProjects(id);
  redirect(`/admin/projects?page=1&notice=${mode === 'create' ? 'created' : 'updated'}`);
}

export async function setProjectVisibility(id: string, version: string, visible: boolean) {
  const denied = await checkProjectWriter();
  if (denied) return { ok: false, message: denied };
  if (!validProjectId(id) || !validVersion(version) || typeof visible !== 'boolean') {
    return { ok: false, message: '公开状态参数无效。' };
  }
  try {
    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase.from('projects').update({ is_public: visible })
      .eq('id', id).eq('updated_at', version).select('id').maybeSingle();
    if (error || !data) return { ok: false, message: '修改未获确认，请核对权限、版本和当前状态。' };
  } catch { return { ok: false, message: '未收到确认，请先刷新列表核对实际公开状态。' }; }
  invalidateProjects(id);
  return { ok: true, message: visible ? '项目已公开。' : '项目已设为私有。' };
}

export async function deleteProject(id: string, version: string) {
  const denied = await checkProjectWriter();
  if (denied) return { ok: false, message: denied };
  if (!validProjectId(id) || !validVersion(version)) return { ok: false, message: '删除参数无效。' };
  try {
    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase.from('projects').delete()
      .eq('id', id).eq('updated_at', version).select('id').maybeSingle();
    if (error || !data) return { ok: false, message: '删除未获确认，请核对权限、版本和当前记录。' };
  } catch { return { ok: false, message: '未收到删除确认，请先核对列表，不要自动重复删除。' }; }
  invalidateProjects(id);
  return { ok: true, message: '项目已删除。' };
}
```

逐项理解：

- 保存、公开状态和删除是不同的动作；每个都独立鉴权，不依赖按钮隐藏。
- `updated_at` 沿用数据库触发器更新；发布后版本也变动，界面必须刷新，不能拿发布前的版本继续编辑。
- 普通保存不会改变公开状态，但“已经公开的项目”保存后会更新公开内容；表单要明确提示，不是草稿系统。
- 公开操作的确认弹窗是防误触，不是数据库鉴权凭证。管理员本身具备公开权限，普通用户即使伪造参数仍应被拒绝。
- `invalidateProjects` 覆盖首页、列表、详情和后台。模式路径 `[slug]` 需要传入 `'page'`。
- 成功才反馈成功；网络异常可能是响应丢失，先核对，不盲目重复提交。
- 不使用高权限 service_role（服务角色）绕过 RLS。

## 八、任务 5：组装项目管理页面

这里主要练习复用 Day 13 的模式，不重新设计后台。

### 5.1 管理列表

复用工具列表的布局、分页、状态消息、日期格式化与 GuardedLink。列表显示名称、进度、公开/私有、是否推荐、更新时间，以及编辑/删除入口。

每页 10 条。非法页码规范化；删除末页最后一项后回有效页。不要显示“暂无公开项目”来描述后台空列表：后台看的是全部项目。

把导航“项目预览”改成“项目管理”，同时更新概览中的过时只读说明。工具页行为不改变。

### 5.2 新建和编辑表单

`ProjectForm` 参考现有 `ToolForm`：

| 字段 | 控件与规则 |
| --- | --- |
| name | 必填文本，最多 100 字符 |
| slug | 新建时填写；编辑时 readOnly（只读），仍提交原值 |
| description | 必填多行简介，最多 500 字符 |
| long_description | 必填详细说明，最多 5000 字符，允许换行 |
| status | 单选组：开发中、已完成、暂停；提交数据库英文值 |
| project_url / github_url | 可选网址，空值存 null |
| is_featured | “在首页推荐”复选框；旁注“仅公开项目会展示” |

使用受控字段、`noValidate`、字段错误关联、首个错误焦点、提交等待、失败保留输入。接入已存在的未保存离开保护，不新建第二套确认系统。

新建页：先 requireAdmin，生成一次 UUID，初始状态 building、推荐 false，明确“保存后为私有项目”。

编辑页：先通过管理员单条查询读取项目，`params: Promise<{ id: string }>` 先 await；把原始 `updated_at` 绑定给动作，不传格式化时间。

取消回来源页；新建/保存成功回第 1 页。复制逻辑时检查参数名，不要留下工具页面地址。

### 5.3 发布/设为私有的确认

推荐先只放在编辑页的独立“可见性”区域；基础表单有未保存修改时禁用状态切换，并解释“请先保存或放弃当前修改”，避免刷新丢稿。

复用 ConfirmDialog，默认焦点“取消”。动作等待时防止重复点击，失败保留弹窗、显示错误；成功关闭、刷新数据、宣布结果，获取新版本。

公开确认标准文案：

> 公开“测试项目”吗？名称、说明、链接、已有亮点和标签关联将对所有访客可见。请确认其中没有私人信息。

设私有确认标准文案：

> 将“测试项目”设为私有吗？公开列表和详情将不再提供该项目；无法收回别人已经保存的内容。

删除确认必须说明项目、亮点和关联都会删除，共享标签保留，项目没有回收站。只对本次测试项目执行。

### 5.4 关联编辑为什么延后

“先保存项目、再删旧亮点、再插新亮点”是多个请求，中间失败会留下半成品。数据库 Transaction（事务）可以保证多步一起成功或回滚，但不能把三个独立 HTTP 请求叫成一个事务。

本课只改父表的一行，保留既有关联。后续要编辑亮点/标签时，再用经过权限检查的数据库函数在单一事务中完成，不为了今天一口气完成而放宽权限。

## 九、任务 6：公开查询必须使用访客身份

### 6.1 新建 `lib/supabase/public.ts`

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** 公开网站专用：不读取 Cookie，不携带管理员会话。 */
export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('缺少公开数据连接配置。');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}
```

说明：

- 公开页也在服务端读库，但不采用当前管理员 Cookie（会话信息）。管理员不能把私有查询结果带进公开渲染。
- publishable key（可公开密钥）不是管理员凭证；RLS 仍执行。
- `persistSession: false` 不保存登录状态；该客户端根本不用于登录。
- `no-store` 明确不持久缓存这些数据库请求，先追求可理解的隐私行为，再学习性能优化。
- 不要给私有查询套跨用户共享缓存，也不使用静态导出部署这一套动态后台。

### 6.2 新建 `lib/project-repository.ts`

下面代码将数据库下划线字段转成已有 Project 模型，保留现有组件接口。

```ts
import 'server-only';
import type { Project } from '@/data/projects';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { projectStatuses, validProjectSlug, normalizeProjectUrl } from '@/lib/project-form';

const projectSelect = `
  id, slug, name, description, long_description, status,
  project_url, github_url, is_featured,
  project_highlights(id, content, sort_order),
  project_tags(tags(name))
`;

function publicQuery() {
  return createPublicSupabaseClient().from('projects')
    .select(projectSelect, { count: 'exact' }).eq('is_public', true);
}

type PublicRow = NonNullable<Awaited<ReturnType<typeof publicQuery>>['data']>[number];

function safeUrl(value: string | null) {
  try { return normalizeProjectUrl(value ?? '') ?? undefined; }
  catch { return undefined; }
}

/** 保持卡片和详情使用的页面模型，不把数据库结构直接散布到组件。 */
function toProject(row: PublicRow): Project {
  const status = projectStatuses.find((value) => value === row.status);
  if (!status) throw new Error('项目进度数据无效。');
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description,
    longDescription: row.long_description, status, isFeatured: row.is_featured,
    projectUrl: safeUrl(row.project_url), githubUrl: safeUrl(row.github_url),
    highlights: [...row.project_highlights]
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((item) => item.content),
    tags: row.project_tags.flatMap((item) => item.tags ? [item.tags.name] : []),
  };
}

export async function getPublicProjectsPage(rawPage?: string) {
  const supabase = createPublicSupabaseClient();
  const counted = await supabase.from('projects')
    .select('id', { count: 'exact', head: true }).eq('is_public', true);
  if (counted.error || counted.count === null) throw new Error('暂时无法读取公开项目数量。');
  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / 10));
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Math.min(requested, pages);
  const from = (page - 1) * 10;
  const { data, error } = await publicQuery()
    .order('updated_at', { ascending: false }).order('id').range(from, from + 9);
  if (error) throw new Error('暂时无法读取公开项目。');
  return { projects: data.map(toProject), total, page, pages };
}

export async function getFeaturedPublicProjects() {
  const { data, error } = await publicQuery().eq('is_featured', true)
    .order('updated_at', { ascending: false }).order('id').limit(2);
  if (error) throw new Error('暂时无法读取推荐项目。');
  return data.map(toProject);
}

export async function getPublicProjectBySlug(slug: string) {
  if (!validProjectSlug(slug)) return null;
  const { data, error } = await publicQuery().eq('slug', slug).maybeSingle();
  if (error) throw new Error('暂时无法读取项目。');
  return data ? toProject(data) : null;
}
```

说明：

- 显式 `is_public=true` 加上匿名 RLS，两层保证公开读取意图一致。
- 首页最多 2 个推荐，符合当前首页设计；公开列表按 10 条分页，不把接口默认返回上限误当成“全部”。
- `.order('id')` 作为第二排序条件，时间相同也有稳定顺序。
- 亮点按 sort_order 排序；空关联转为空数组，不报“新增项目失败”。
- 本项目目前没有实际封面数据；本课保留数据库 cover_image 列，但不启用新封面输入和展示，避免顺带引入远端图片来源配置。
- 不使用 `dangerouslySetInnerHTML` 渲染详细说明；普通文本通过 React 输出。换行可用 `white-space: pre-wrap`。
- 查询失败抛通用错误，不回退到静态数组。否则私有项目可能因“网络失败回退”重新出现。

## 十、任务 7：接入首页、列表、详情和页面标题

### 7.1 首页 `app/page.tsx`

删除对静态 `projects` 值的导入和模块顶层 `featuredProjects` 计算。把页面函数改为 async，在函数内调用 `getFeaturedPublicProjects()`；继续把结果传给现有 ProjectCard。

不要随意改首页布局。空推荐时显示“暂无公开推荐项目”或隐藏推荐区域；请求失败显示可恢复提示，不捏造数据。

当前首页的 favoriteTools 仍是静态数据，这是 Day 13 的跨页一致性后续项，不属于“项目私有泄露”问题。本课可以保留并明确记录；不要宣称首页工具也已同步数据库。

### 7.2 公开列表 `app/projects/page.tsx`

改为 async，接收 `searchParams: Promise<{ page?: string | string[] }>`；调用 `getPublicProjectsPage`，按返回 projects 渲染现有卡片。

参考管理列表处理页码、范围、上一页和下一页；只显示公开项目总数，不展示“后台共有多少私有项目”。超界规范到有效页；计数与读取之间发生并发删除导致末页空时回前页重新读。

空列表文案“暂时没有公开项目”，与“无法加载”区分。

### 7.3 详情页 `app/projects/[slug]/page.tsx`

删除静态 projects 导入和原有 `generateStaticParams()`。本课从数据库按访问请求读取，不再从静态数组枚举详情路径。

正文的核心替换：

```tsx
const { slug } = await params;
const project = await getPublicProjectBySlug(slug);
if (!project) notFound();
```

复用已有详情布局，有亮点/标签才显示对应 section（内容区域）。私有和不存在都得到同样的“项目不存在”结果，避免从不同报错泄露私有项目是否存在。

### 7.4 metadata（页面标题与描述）也必须改

```tsx
export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project) return { title: '项目不存在', robots: { index: false, follow: false } };
  return { title: `${project.name} | 我的项目`, description: project.description };
}
```

从 `next` 导入 Metadata 类型，并导入本课查询函数。不要正文已经隐藏，浏览器标签标题或页面源代码里却保留私有项目名字。

`robots: noindex` 只是搜索引擎提示，不是权限控制。真正的限制来自查询和 RLS。

### 7.5 缓存与发布注意

本课公开请求显式 `no-store`，修改动作调用相关路径失效。不要在外层加共享 `'use cache'` 或长时间缓存来覆盖这一意图。

部署前验证响应和 CDN（内容分发缓存）配置，不给项目动态页配置无条件公共长缓存。已经预取或展示在浏览器中的旧内容不会被远程擦除，验收以匿名新请求/重新加载为准。

## 十一、任务 8：隐私验收——不只看列表

新建一个不含真实秘密的测试项目：

- 名称：Day14 私有测试。
- slug：day14-private-test。
- 简介：这是用于验证公开权限的测试内容。
- 详细说明：填入明显的测试标记，不使用密码或私人文件。

按以下顺序验收：

| 操作 | 标准预期 |
| --- | --- |
| 新建不发布 | 后台可见，公开列表/首页不可见 |
| 匿名直接访问该 slug | 显示不存在，不泄露标题/简介 |
| 普通登录用户访问 | 与访客一样看不到 |
| 管理员打开公开详情 | 仍看不到私有；去后台查看 |
| 勾选推荐但不发布 | 首页仍不可见 |
| 确认公开 | 公开列表和详情可读，推荐项目可进入首页前两项 |
| 公开项目编辑说明 | 公开页面重新加载后更新 |
| 设回私有 | 匿名新请求列表/详情不再返回该项目 |
| 取消删除 | 数据完全不变 |
| 确认删除测试项目 | 父记录和其关联删除，共享标签保留 |

首页最多两条；若测试项目排不到前两项，不代表权限有问题，核对推荐状态和更新时间排序。

### 数据库接口的只读验证

在 SQL 编辑器可以模拟角色验证当前权限。先确定测试记录存在，替换下面 ID；每次完整事务执行，最后回滚。

```sql
begin;
set local role anon;
select id, slug, name from public.projects
where id = 'REPLACE_WITH_PRIVATE_TEST_ID';
select content from public.project_highlights
where project_id = 'REPLACE_WITH_PRIVATE_TEST_ID';
select project_id, tag_id from public.project_tags
where project_id = 'REPLACE_WITH_PRIVATE_TEST_ID';
rollback;
```

预期私有父记录 0 行，私有子记录也 0 行。但**子表原本为空时返回 0 行不能证明策略有效**。可把一个本来带亮点/标签的非敏感练习项目暂设私有，再在管理员后台确认关联仍存在，随后做匿名读取测试，结束后恢复它原来的公开状态。

普通用户测试改用 authenticated 角色，并在事务内设置该测试用户的 `request.jwt.claim.sub`，方法参照 Day 13。设置必须用非管理员的真实用户 ID。管理员角色也要测试可读私有。

控制台 postgres 角色可能绕过 RLS，不能拿它的可读结果代表普通用户。事务模拟是补充，还要验证真实匿名接口/页面。

### CRUD 和交互验收

- 非管理员新增、编辑、删除、公开均被拒绝。
- 重复 slug 被拒绝，不覆盖已有项目。
- 修改 readonly（只读）字段请求里的 slug 也被服务端拒绝。
- 非法网址、空必填项、非法状态被拒绝，输入保留。
- 两个编辑页先后保存，后一个旧版本不得静默覆盖。
- 基础表单 dirty（有未保存修改）时不能发布导致输入丢失。
- 公开/私有切换后刷新版本；随后编辑保存不误用旧时间。
- 删除和发布等待时防重复；失败不关闭弹窗、不假报成功。
- 390px 下表单、分页和弹窗可操作；Tab 焦点可见、取消可恢复焦点。
- 10 条以上测试分页及末页删除；不通过删原有数据凑测试条件。

## 十二、工程检查和完成标准

```powershell
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

- lint 检查代码规范。
- `tsc --noEmit` 检查类型，不输出编译后的 JavaScript，可能更新类型缓存。
- build（生产构建）写入 `.next`，必须正常结束才算通过；不会修改数据库。
- `git diff --check` 检查已跟踪修改的空白问题，不会提交代码，也不能代替未跟踪文件检查。

检查静态项目引用：

```powershell
rg -n 'data/projects|generateStaticParams' app components lib
```

`rg` 是文本搜索；这里查残留导入和旧静态路径生成。`import type { Project }`、ProjectStatus 等类型引用可以保留；运行时导入静态 projects 数组用于公开页面则必须移除。不要见到类型导入就全部删除。

还应搜索 sitemap（站点地图）、Open Graph（分享摘要）、其他详情接口等公开出口；当前没有的不用为了检查新增，有的话同样必须只读公开数据。

## 十三、常见错误与原因

### 新迁移后公开列表空了

默认私有是预期。先确认后台记录仍在，再逐条确认公开。不要自动给全表设置 true，也不要回退到静态数组。

### 加了 is_public 条件却还是能读私有

检查旧 `using (true)` 策略是否还在、是否用了高权限密钥、测试是否使用了 postgres。策略看起来“有新规则”不等于旧规则已经失效。

### 父项目隐藏了，亮点还能通过接口读到

子表策略未替换。外键只保证引用关系，不自动传播读取权限。

### 首页还显示私有项目

首页仍在导入静态 projects，或只过滤 is_featured 没过滤 is_public。数据查询失败时回退静态数组也会造成这个问题。

### 发布后下一次保存提示冲突

发布会更新 updated_at。前端必须刷新并使用新版本；若还有未保存表单，先处理草稿，不能直接刷新覆盖。

### slug 字段 disabled 后提交校验失败

disabled 字段不随表单提交。用 readOnly 保留值，服务端再核对不可变性；不能只信任浏览器只读设置。

### 标题里出现私有项目名字

generateMetadata 仍在读静态数组或管理员数据。正文和标题必须共用公开查询边界。

### 设私有后浏览器后退还能看到旧画面

浏览器可能保留已经下载的页面。用匿名新请求核对权限；不能把历史画面消失当作可保证的“撤回”。

## 十四、自测题

1. completed 是否表示项目已经公开？
2. is_featured=true、is_public=false 时首页应该出现吗？
3. 为什么不能只在客户端过滤私有项目？
4. 为什么必须删除旧的无条件 SELECT 策略？
5. 子表外键能自动保护私有亮点吗？
6. 为什么公开网站不用管理员 Cookie 查询？
7. 为什么新建默认私有？
8. tags 公开会不会暴露私有项目关联？
9. 为什么基础保存不一起切换公开状态？
10. 为什么本课 slug 创建后固定？
11. 为什么 metadata 也必须过滤？
12. noindex 能代替 RLS 吗？
13. 为什么不先删全部亮点再逐条插入？
14. 为什么本次要重新生成数据库类型？
15. 设回私有能删除访客已经保存的截图吗？
16. 子表测试返回 0 行就能证明权限通过吗？

### 标准答案

1. 否，进度和可见性是两件事。
2. 不应该，必须同时满足公开和推荐。
3. 客户端过滤前数据已经传给用户，不能当作访问控制。
4. 默认允许型策略通常按或组合，旧全开放策略会让限制失效。
5. 不能，外键约束引用关系，读取权限要独立设定。
6. 保证公开页面与访客视角一致，避免管理员私有读取进入公开渲染。
7. 防止填写未完成或包含私人内容的记录时意外公开。
8. 标签字典公开；项目关联由 project_tags 单独保护。不能在公开字典里存秘密。
9. 公开是独立的披露决定，需要明确确认，避免编辑简介时误发布。
10. 降低已有 URL 失效、历史重定向与缓存处理复杂度，后续再专门设计更名。
11. 标题和描述同样会发送给用户/搜索引擎，正文隐藏不代表没有泄露。
12. 不能，它只是爬虫提示，不阻止实际访问。
13. 多个请求不是一个事务，中途失败可能丢关联；本课先保留关联不改。
14. 表结构新增了 is_public，旧类型不反映真实结构。
15. 不能，只限制后续读取，不能追回已经分发的内容。
16. 不能，必须先确认子表确实有该项目的数据，避免用空表验证出假成功。

## 十五、完成后按这个格式交付

```text
Day 14 完成，请检查。
迁移与类型生成：实际结果……
项目新增/编辑/删除：实际结果……
公开→私有→再次公开：实际结果……
匿名、普通用户、管理员权限：实际结果……
私有亮点和标签关联读取：实际结果……
首页/列表/详情/metadata：实际结果……
分页/错误输入/重复 slug/版本冲突：实际结果……
lint/类型检查/build：实际结果……
未完成或未测试：……
```

不要发密码、完整环境文件、Cookie 或访问令牌。没测的直接注明未测。

## 十六、参考资料与下一步

- [Supabase 行级安全](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase 会话持久化配置](https://supabase.com/docs/reference/javascript/auth)
- [Next.js fetch 缓存配置](https://nextjs.org/docs/app/api-reference/functions/fetch)
- [Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)

已结合本项目安装的 Next.js 文档核对异步路由参数与 no-store 行为，不照搬旧教程的配置。Day 15 再做构建与部署；Day 14 权限矩阵未通过前，不把后台当作可上线成品。

一句话总结：**私有不是“不显示”，而是从数据库、关联查询到公开页面的每一个出口都不提供。**
