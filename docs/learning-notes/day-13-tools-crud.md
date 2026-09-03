# Day 13：Tools CRUD（工具增删改查）与管理员写入权限

状态：进行中

适用项目：personal-website；Next.js 16.3.4、React 19、Supabase。日期：2026-09-03。

这是一整天的教材：目标、知识、实现顺序、关键参考代码、界面要求、验收和标准答案全部列在这里。先通读，再按任务执行。本文不会自动修改你的业务代码或云端数据库。参考代码覆盖核心数据链路；界面组装部分是有明确要求与答案的动手练习，不是粘贴后已经完成的功能。

教材检查记录：9 段 TypeScript/TSX 示例通过语法检查；校验模块、工具读取模块、服务端操作模块通过基于当前项目依赖的虚拟文件类型检查；有效输入、空名称、危险网址协议、非法分类、网址内嵌凭据、勾选/未勾选收藏共 7 项纯校验检查通过。没有应用 SQL、执行真实增删改或验证尚未实现的完整界面；这些仍须按下文验收。

## 一、今天做什么

Day 11 解决“谁能进入后台”，Day 12 解决“进入后看什么”，Day 13 解决“怎样安全修改真实内容”。

完成后应能：

1. 分页查看工具，每页最多 10 条，而不是只能看到最新 10 条。
2. 新增工具，编辑名称、简介、网址、分类与收藏状态。
3. 明确确认后删除指定工具。
4. 保存后回到工具列表，公开 `/tools` 与后台概览更新。
5. 阻止未登录者、普通登录用户修改数据。
6. 对校验错误、重复网址、会话过期、旧版本冲突和网络失败给出明确反馈。

今天不做：项目写入、标签选择器、批量删除、搜索、图片上传、多管理员体系、自动保存。

**标签处理边界：**新增工具没有标签是正常的；编辑工具不修改原有 `tool_tags`；删除工具时由现有外键自动移除该工具的关联行，但不删除共享 `tags`。

**删除方式：**沿用现有数据库的物理删除能力，没有回收站。删除后本项目不能一键撤销。学习测试只删除今天自己新建的临时工具，不用 ChatGPT、GitHub 等现有记录试刀。若你希望回收站，先停在删除步骤，另设计软删除，不把“隐藏”和“永久删除”混用。

## 二、先理解六个概念

### 1. CRUD 不是四个按钮

| 缩写 | 中文 | 数据库操作 | 网站表现 |
| --- | --- | --- | --- |
| Create | 新增 | INSERT | 创建一条工具 |
| Read | 读取 | SELECT | 列表、编辑前回显 |
| Update | 修改 | UPDATE | 保存已有工具 |
| Delete | 删除 | DELETE | 移除指定工具 |

按钮只是入口；真正完成需要校验、鉴权、数据库执行、结果确认和页面反馈。把数组改了但刷新后消失，不是完成数据库 CRUD。

### 2. 身份验证不等于授权

Authentication（身份验证）：你是谁？Authorization（授权）：你能做什么？

`authenticated` 表示“已登录”，不表示“管理员”。本项目管理员仍是 Day 11 的 `ADMIN_USER_ID` 指定用户，不能改成“所有登录者都能写”。

服务端操作检查管理员，数据库 RLS（行级安全）也检查管理员；这样即使有人绕开页面直接请求数据库接口，也不能冒充管理员。

### 3. GRANT 与 RLS 是两道检查

GRANT（权限授予）决定某角色能否执行某种操作；RLS 决定该角色能操作哪些行。权限不足不能通过关闭 RLS 来解决。

`USING` 约束现有行；`WITH CHECK` 约束写入后的行。新增用后者，删除用前者，更新通常两者都需要。读取策略继续保持现有公开内容可读。

### 4. Server Action（服务端操作）

它是运行在服务器上的异步函数。表单可以调用它，不必为了表单再手写一套 HTTP 接口。

但 `'use server'` 不是权限检查。每个写入入口必须验证身份、验证输入。隐藏字段、URL 参数、`bind` 绑定参数都不能被当成可信权限证明。

### 5. 并发修改：为什么带 updated_at

假设你在两个标签页打开同一个工具。A 保存新名称，B 仍拿着旧内容。B 直接覆盖会丢掉 A 的修改。

本课更新条件是：ID 相同，并且数据库 `updated_at` 仍等于打开表单时的原值。匹配不到就提醒重新核对，不盲目覆盖。时间戳要原样传回，不能先转成北京时间显示字符串再提交。

这是适合当前个人项目的轻量冲突检测，不是严格的全局版本号系统；以后复杂协作可使用单调递增版本字段。

### 6. 缓存更新不等于实时广播

写库成功后调用 `revalidatePath`（让指定路径重新获取数据），再跳转回列表。它不会主动把其他设备已打开的页面全部推送更新；那些页面仍需要刷新或另做实时订阅。

## 三、今天的文件地图

| 文件 | 操作与职责 |
| --- | --- |
| `supabase/migrations/<时间戳>_admin_tools_write.sql` | 新建，工具表写入权限 |
| `lib/tool-form.ts` | 新建，输入类型、纯校验函数 |
| `lib/admin-tools-repository.ts` | 新建，工具分页与单条读取 |
| `app/admin/tools/actions.ts` | 新建，新增/编辑/删除入口 |
| `components/admin/ToolForm.tsx` | 新建，新建与编辑共享表单 |
| `components/admin/DeleteToolButton.tsx` | 新建，删除确认和结果处理 |
| `components/admin/ConfirmDialog.tsx` | 新建，共享确认弹窗；删除和离开表单复用 |
| `components/admin/UnsavedChangesProvider.tsx` | 新建，未保存状态与站内离开确认 |
| `components/admin/GuardedLink.tsx` | 新建，受保护的站内链接 |
| `app/admin/tools/page.tsx` | 修改，预览升级为分页管理列表 |
| `app/admin/tools/new/page.tsx` | 新建，新建工具页面 |
| `app/admin/tools/[id]/edit/page.tsx` | 新建，编辑工具页面 |
| `app/admin/tools/not-found.tsx` | 新建，工具不存在的提示 |
| `components/admin/AdminNav.tsx` | 修改，“工具预览”改为“工具管理” |
| `app/admin/page.tsx` | 修改，工具入口与说明文案 |
| `app/admin/admin.module.css` | 扩展表单、消息、分页、弹窗样式 |
| `app/globals.css` | 补齐已有设计规范中的 `--danger` |

全局布局、Header、后台布局中的离开链接需要接入未保存保护；不要顺带重写公开页面布局。原有 `proxy.ts` 的 `/admin/:path*` 已覆盖新路由。

教学路径：先权限 → 查询 → 保存动作 → 表单 → 删除 → 列表整合 → 验收。不要先做一排按钮，再想安全问题。

## 四、任务 1：建立数据库写入规则

### 1.1 创建新迁移

在项目目录执行：

```powershell
npx supabase migration new admin_tools_write
```

- `npx`：运行项目已安装的命令行工具。
- `supabase migration new`：创建新的数据库迁移文件。
- `admin_tools_write`：迁移名称，表示“管理员工具写入”。
- 效果：只新增本地 SQL 文件，不修改云端数据库；预期输出新文件路径。

不要修改已经推送的 Day 10 迁移，也不要运行 `db reset` 或重新导入种子数据。

### 1.2 先核对原有策略

在 Supabase 的 SQL Editor（SQL 编辑器）运行只读查询：

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'tools';
```

按本次本地迁移记录，原先应只有公开读取策略。若云端已有其他写入策略，先检查其条件，不能直接叠加下面规则并以为旧规则被替换。默认允许型策略会按“或”组合，一条过宽旧策略就可能破坏限制。

### 1.3 填写迁移

把下面所有 `REPLACE_WITH_ADMIN_UUID` 替换成与 `.env.local` 的 `ADMIN_USER_ID` 完全一致的真实用户 UUID（用户唯一标识）。不是邮箱、项目编号，也不是密钥。不需要把密码或令牌发给别人。

数据库不能读取 Next.js 的 `.env.local`；所以当前单管理员教学方案需要维护两处一致。以后换管理员必须同步更新配置与策略，不可只改其中之一。

```sql
-- 保留行级安全，只缩小客户端角色的工具表权限。
alter table public.tools enable row level security;
revoke all privileges on table public.tools from anon, authenticated;
grant select on table public.tools to anon, authenticated;

-- 只允许写业务字段：ID 只在新增时提供，时间由数据库管理。
grant insert (id, name, description, url, category, is_favorite)
  on public.tools to authenticated;
grant update (name, description, url, category, is_favorite)
  on public.tools to authenticated;
grant delete on public.tools to authenticated;

create policy "Admin inserts tools" on public.tools
for insert to authenticated
with check ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);

create policy "Admin updates tools" on public.tools
for update to authenticated
using ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid)
with check ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);

create policy "Admin deletes tools" on public.tools
for delete to authenticated
using ((select auth.uid()) = 'REPLACE_WITH_ADMIN_UUID'::uuid);
```

这里没有新增管理员表，没有使用 `service_role`（高权限服务端角色）绕过 RLS，没有开放 `tool_tags` 和 `projects` 写入。现有公开 SELECT 策略不删除。

这段 SQL 基于目前只有 Day 10 迁移的前提；`REVOKE` 表级授权不会自动清除后来单独授予的列级权限。如果你额外配过权限，应先审查差异，不能把教材当成任意旧数据库的通用清理脚本。

### 1.4 预览并推送

```powershell
npx supabase db push --dry-run
npx supabase db push
```

第一条仅显示准备推送的迁移，`--dry-run` 表示预演，不应用变更。确认只有本课新迁移后再运行第二条。第二条会真实修改已关联云端项目的权限，但不删除业务记录。预期看到新迁移应用成功；若出现其他待推送文件或报错，停下核对。

本次只改权限和策略，表字段没有变化，不需要为了这个步骤重新生成类型文件。

## 五、任务 2：输入校验——不要相信表单提交的类型

新建 `lib/tool-form.ts`。这是纯逻辑文件，可以在服务端和客户端复用，不读取环境变量。

```ts
export const toolCategories = ['AI', '开发', '学习', '效率'] as const;
export type ToolCategory = (typeof toolCategories)[number];
export type ToolFields = {
  name: string;
  description: string;
  url: string;
  category: string;
  is_favorite: boolean;
};
export type FieldErrors = Partial<Record<keyof ToolFields, string>>;
export type ToolActionState = {
  message: string;
  errors: FieldErrors;
  attempt: number;
};

// 允许已有的 chatgpt、typescript-playground，以及新生成的 UUID。
export function validToolId(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}

/** 类型断言不会验证用户输入，必须做实际检查。 */
export function parseToolForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const values: ToolFields = {
    name: text('name'),
    description: text('description'),
    url: text('url'),
    category: text('category'),
    is_favorite: formData.get('is_favorite') === 'on',
  };
  const errors: FieldErrors = {};
  if (!values.name || values.name.length > 80) errors.name = '请输入 1～80 个字符的名称。';
  if (!values.description || values.description.length > 500) {
    errors.description = '请输入 1～500 个字符的简介。';
  }
  if (!toolCategories.some((item) => item === values.category)) {
    errors.category = '请选择 AI、开发、学习或效率。';
  }
  try {
    const url = new URL(values.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || values.url.length > 2048) throw new Error('invalid');
    values.url = url.href;
  } catch {
    errors.url = '请输入有效的 http/https 网址，不包含账号密码，最多 2048 个字符。';
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}
```

为什么这么写：

- `FormData.get` 可能得到字符串、文件或 null，不直接 `as string` 就算验证完成。
- 未勾选的复选框通常不提交字段；`Boolean('false')` 是 true，不能用来解析“否”。
- 网址是给用户点击的链接，所以禁止 `javascript:` 等协议；此处不抓取网址内容。
- 标准化 `url.href` 后再写入，数据库唯一约束仍是重复判断的最后防线。标准化不代表识别所有语义相同的网址。
- 这里的长度校验属于本应用入口规则。若未来允许其他写入客户端，重要业务约束还应落到数据库，不要误以为 TypeScript 会约束外部接口。

## 六、任务 3：读取完整分页与单条工具

新建 `lib/admin-tools-repository.ts`，不要把 Day 12 的预览函数偷偷改成返回所有数据。

```ts
import 'server-only';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validToolId } from '@/lib/tool-form';

export const TOOL_PAGE_SIZE = 10;

export async function getAdminToolsPage(rawPage?: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const requested = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  const counted = await supabase.from('tools').select('id', { count: 'exact', head: true });
  if (counted.error || counted.count === null) throw new Error('暂时无法读取工具数量。');
  const total = counted.count;
  const pages = Math.max(1, Math.ceil(total / TOOL_PAGE_SIZE));
  const page = Math.min(requested, pages);
  const from = (page - 1) * TOOL_PAGE_SIZE;
  const { data, error } = await supabase.from('tools')
    .select('id, name, description, url, category, is_favorite, created_at, updated_at')
    .order('updated_at', { ascending: false }).order('id', { ascending: true })
    .range(from, from + TOOL_PAGE_SIZE - 1);
  if (error) throw new Error('暂时无法读取工具列表。');
  return { rows: data, total, pages, page };
}

export async function getAdminTool(id: string) {
  await requireAdmin();
  if (!validToolId(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('tools')
    .select('id, name, description, url, category, is_favorite, created_at, updated_at')
    .eq('id', id).maybeSingle();
  if (error) throw new Error('暂时无法读取该工具。');
  if (!data) notFound();
  return data;
}
```

知识点与标准计算：

- 第 1 页范围 `0～9`，第 2 页 `10～19`。`range` 两端都包含，因此末尾要减 1。
- `.maybeSingle()` 允许 0 或 1 条：不存在与数据库故障分别处理，不能都显示“没有数据”。
- 先计数再读取是两个请求，不是同一数据库快照。个人后台足够起步，别把它宣传成并发场景下绝对一致。
- 超出页码夹到末页；列表页面应把地址规范到返回的 `page`，避免地址写第 99 页、界面却显示第 1 页。
- 若计数之后另一标签页又删掉末页记录，发现 `rows.length === 0 && page > 1` 时回前一页重新读取，处理这个小窗口。

## 七、任务 4：实现保存与删除操作

新建 `app/admin/tools/actions.ts`。下面是完整的数据写入参考，不包含界面代码。

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseToolForm, validToolId, type ToolActionState } from '@/lib/tool-form';

// 表单过期时返回提示，保留屏幕上的输入，而不是立即跳走丢稿。
async function checkWriter() {
  try {
    const user = await getCurrentUser();
    if (!user) return '登录已失效，请在新标签页重新登录，再回到这里提交。';
    if (!isAdmin(user.id)) return '当前账号没有管理员写入权限。';
    return null;
  } catch {
    return '暂时无法验证权限，请稍后重试。';
  }
}

function invalidateTools() {
  revalidatePath('/admin');
  revalidatePath('/admin/tools');
  revalidatePath('/tools');
}

export async function saveTool(
  mode: 'create' | 'edit',
  id: string,
  version: string,
  previous: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const fail = (message: string, errors: ToolActionState['errors'] = {}) => ({
    message, errors, attempt: (Number(previous?.attempt) || 0) + 1,
  });
  const denied = await checkWriter();
  if (denied) return fail(denied);
  if (!validToolId(id) || !['create', 'edit'].includes(mode)) return fail('操作参数无效。');
  if (mode === 'edit' && (!version || !Number.isFinite(Date.parse(version)))) {
    return fail('缺少有效版本，请重新打开编辑页。');
  }
  const parsed = parseToolForm(formData);
  if (!parsed.valid) return fail('请修正标出的字段。', parsed.errors);

  try {
    const supabase = await createSupabaseServerClient(true);
    const query = mode === 'create'
      ? supabase.from('tools').insert({ id, ...parsed.values })
      : supabase.from('tools').update(parsed.values).eq('id', id).eq('updated_at', version);
    const { data, error } = await query.select('id').maybeSingle();
    if (error?.code === '23505') {
      return fail('网址或记录标识已存在。若上次提交中断，请先回列表核对，不要反复新建。');
    }
    if (error) return fail('保存未获确认，请检查权限和网络；重试前先核对列表。');
    if (!data) return fail('记录已变更、已删除或权限不匹配。请保留输入并重新核对。');
  } catch {
    return fail('没有收到保存确认。操作可能已完成，请先在新标签页核对列表。');
  }

  // redirect 会中断控制流，不能放进上面的通用 catch。
  invalidateTools();
  revalidatePath(`/admin/tools/${id}/edit`);
  redirect(`/admin/tools?page=1&notice=${mode === 'create' ? 'created' : 'updated'}`);
}

export async function deleteTool(
  id: string,
  version: string,
): Promise<{ ok: boolean; message: string }> {
  const denied = await checkWriter();
  if (denied) return { ok: false, message: denied };
  if (!validToolId(id) || !version || !Number.isFinite(Date.parse(version))) {
    return { ok: false, message: '删除参数无效，请刷新后重新确认。' };
  }
  try {
    const supabase = await createSupabaseServerClient(true);
    // 只操作指定 ID 和版本，绝不发无条件 delete。
    const { data, error } = await supabase.from('tools').delete()
      .eq('id', id).eq('updated_at', version).select('id').maybeSingle();
    if (error) return { ok: false, message: '删除未获确认，请核对权限和当前列表。' };
    if (!data) return { ok: false, message: '记录已变更、已删除或权限不匹配，请重新核对。' };
  } catch {
    return { ok: false, message: '未收到删除确认，请先核对列表，不要自动重试。' };
  }
  invalidateTools();
  revalidatePath(`/admin/tools/${id}/edit`);
  return { ok: true, message: '工具已删除。' };
}
```

重点解释：

- `previous` 是表单上一轮状态，不可用于授权；`attempt` 只帮助界面每次收到错误后重新定位焦点。
- 新建和编辑共用字段白名单，不能把 `Object.fromEntries(formData)` 整包传给数据库。
- 编辑不允许改变 ID、创建时间、更新时间。更新时间已有数据库触发器维护。
- `.select('id').maybeSingle()` 用来确认实际命中的记录；`error === null` 不代表一定改到一行。
- 不使用 `upsert`（存在则更新）处理新建。重复网址应提示用户，不应意外改掉原来的工具。
- 新建页面生成一次 UUID，再绑定到表单；本次页面内重试保持相同 ID。它能阻止同一个 ID 重复插入，但不是完整的请求结果查询机制。
- 成功保存回第 1 页是本课明确约定：按更新时间倒序，新增/更新工具会出现在前面。取消返回来源页；删除留在原页，必要时退到有效末页。
- 网络中断不等于数据库没执行。失败文案不能无证据地承诺“没保存，放心重试”。

## 八、任务 5：实现共享表单与两个页面

### 5.1 表单字段清单

`ToolForm.tsx` 使用 `'use client'`，新建与编辑共用，别复制两份校验界面。

| 字段名 | 控件 | 规则 |
| --- | --- | --- |
| name | 文本输入框 | 必填，最多 80 字符 |
| description | textarea（多行文本框） | 必填，最多 500 字符；默认 6 行，可扩展 |
| url | `type="url"` | 必填，最多 2048 字符 |
| category | 原生 radio（单选按钮）组 | AI、开发、学习、效率；fieldset + legend |
| is_favorite | checkbox（复选框） | 有明确“收藏此工具”标签 |

这里只四个分类，选择单选按钮组，不额外引入下拉组件库。输入框使用受控 `value`/`checked` 和 `onChange`；保存失败时不清空用户输入。

### 5.2 表单接线参考

以下片段演示真实的参数顺序与一个字段；你按字段表补齐其余四个字段，不需要猜动作怎么绑定。

```tsx
'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { saveTool } from '@/app/admin/tools/actions';
import type { ToolActionState, ToolFields } from '@/lib/tool-form';

type Props = {
  mode: 'create' | 'edit';
  id: string;
  version: string;
  initial: ToolFields;
};

export default function ToolForm({ mode, id, version, initial }: Props) {
  const [values, setValues] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: ToolActionState = { message: '', errors: {}, attempt: 0 };
  const [state, formAction, pending] = useActionState(
    saveTool.bind(null, mode, id, version), initialState,
  );

  useEffect(() => {
    if (!state.message) return;
    const target = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-form-status]',
    );
    target?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate aria-busy={pending}>
      <label htmlFor="tool-name">名称（必填）</label>
      <input id="tool-name" name="name" required maxLength={80}
        value={values.name}
        onChange={(event) => setValues({ ...values, name: event.target.value })}
        aria-invalid={Boolean(state.errors.name)} aria-describedby="tool-name-error" />
      <p id="tool-name-error">{state.errors.name}</p>
      {/* 动手练习：在这里补齐简介、网址、分类和收藏，保持字段 name 一致。 */}
      <p data-form-status tabIndex={-1} role="status">{state.message}</p>
      <button type="submit" disabled={pending}>
        {pending ? '正在保存…' : mode === 'create' ? '创建工具' : '保存修改'}
      </button>
    </form>
  );
}
```

这份片段缺少字段时校验会拒绝提交，这是正常的，不能为了通过而去掉服务端校验。

补齐标准：简介的 `name="description"`，网址的 `name="url"`；四个单选按钮都使用 `name="category"`，各自 value 为对应分类；复选框 `name="is_favorite" value="on"`，`checked` 绑定布尔值。每个可出错字段都提供对应错误元素与 `aria-describedby`，分类错误关联到组内控件。

`noValidate` 关闭浏览器自带错误气泡，并不关闭我们的校验。每次提交先显示字段文字错误，把焦点移动到第一个错误字段；没有字段错误时才聚焦总提示。错误字段被修改后可清除旧错误或重新本地校验，不要一直展示已失效的提示。

### 5.3 新建页

`app/admin/tools/new/page.tsx`：

```tsx
import { randomUUID } from 'node:crypto';
import ToolForm from '@/components/admin/ToolForm';
import { requireAdmin } from '@/lib/auth/admin';

export const metadata = { title: '新增工具' };

export default async function NewToolPage() {
  await requireAdmin();
  const id = randomUUID();
  return (
    <section>
      <h1>新增工具</h1>
      <p>保存后将出现在公开工具集；不要填写私密内容。</p>
      <ToolForm mode="create" id={id} version=""
        initial={{ name: '', description: '', url: '', category: '学习', is_favorite: false }} />
    </section>
  );
}
```

### 5.4 编辑页

`app/admin/tools/[id]/edit/page.tsx`：

```tsx
import ToolForm from '@/components/admin/ToolForm';
import { getAdminTool } from '@/lib/admin-tools-repository';

export const metadata = { title: '编辑工具' };

export default async function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await getAdminTool(id);
  return (
    <section>
      <h1>编辑工具：{tool.name}</h1>
      <ToolForm mode="edit" id={tool.id} version={tool.updated_at}
        initial={{ name: tool.name, description: tool.description, url: tool.url,
          category: tool.category, is_favorite: tool.is_favorite }} />
    </section>
  );
}
```

Next.js 当前版本 `params` 是 Promise（异步结果），先 `await` 再读 ID。页面只传必要字段给客户端，不传整个用户或会话对象。

两个页面都补上返回工具列表的入口、现有 panel/heading 样式及来源页码。`not-found.tsx` 用 section、标题“工具不存在或已删除”和返回工具列表链接，不再套一层 main。

### 5.5 未保存离开保护——本课必须补的交互

标准实现方案：

1. `UnsavedChangesProvider`（未保存状态提供者）用 React Context（跨组件共享状态）保存 `dirty`、`pending`、待执行的离开动作；放在能覆盖 Header 和后台的客户端包装层中。
2. 表单比较当前字段与初始字段，计算是否修改；组件卸载清理状态。不能只要碰过字段就永远 dirty，改回原值应取消提醒。
3. `GuardedLink` 复用 Next.js Link，用 `onNavigate` 拦截站内导航：dirty 时 `event.preventDefault()`，弹出共享确认框。
4. 确认框文案“有未保存的修改，离开会丢失这些内容”；默认焦点“继续编辑”，另一按钮“放弃修改并离开”。确认后清除 dirty，再执行指定站内地址跳转。
5. 顶部公开链接、后台导航、取消按钮都接入同一保护；退出和“刷新数据”按钮也先经过保护，因为它们可能丢稿。pending 期间阻止重复保存以及主动刷新、退出。
6. 页面真正关闭/刷新时，仅在 dirty 时注册 `beforeunload`：调用 `preventDefault()` 并设置 `returnValue`。这是浏览器生命周期特例，不是用 `window.confirm()` 替代产品弹窗。
7. 成功保存的服务端跳转属于已完成提交，应允许通过；失败保留 dirty 和当前值。

**限制必须诚实：**`onNavigate` 保护接入它的链接，不会自动覆盖浏览器后退/前进或任意 `router.push`。App Router 没有旧 Pages Router 的 `router.events`。本课至少覆盖全部显式离开入口与刷新/关闭；浏览器历史导航仍是已知边界，不能宣称“任何情况下都不丢稿”。如要完整恢复需进一步设计草稿存储，不能私自把表单内容持久化到本地存储。

## 九、任务 6：删除确认弹窗

`DeleteToolButton` 接收 `id`、`name`、`updated_at` 和当前页码。共享 `ConfirmDialog` 可以使用浏览器支持的 HTML `<dialog>`，通过 `showModal()` 打开；标题、正文、按钮、样式均由应用控制，不使用 `window.confirm()`。

标准状态流程：

```text
点击“删除工具” → 打开确认框 → 默认聚焦“取消”
取消/Escape → 关闭，焦点回到触发按钮
确认删除 → 保持弹窗，按钮等待，调用 deleteTool(id, updated_at)
失败 → 弹窗不关闭，显示 message，允许核对/取消
成功 → 关闭，更新列表并校正页码，状态区宣布结果，聚焦列表标题
```

文案标准答案：

> 永久删除“测试工具”吗？该工具会从公开工具集移除，其标签关联也会删除；共享标签不会删除。本项目没有回收站，此操作不能一键撤销。

按钮使用“取消”和“永久删除工具”，不使用“确定”。不提供虚假的撤销按钮。

客户端调用参考：

```tsx
// 放在 DeleteToolButton 的组件内部；此处展示调用逻辑，不是完整组件。
const [pending, startTransition] = useTransition();
const [message, setMessage] = useState('');

function submitDeletion() {
  if (pending) return;
  startTransition(async () => {
    try {
      const result = await deleteTool(id, updated_at);
      if (!result.ok) { setMessage(result.message); return; }
      dialogRef.current?.close();
      router.replace(`/admin/tools?page=${page}&notice=deleted`);
      router.refresh();
    } catch {
      setMessage('没有收到确认，请先核对列表，不要反复点击删除。');
    }
  });
}
```

组件中导入 React 的 `useTransition/useState/useRef`、Next.js 的 `useRouter`、本课 `deleteTool`；定义对应 props 与 `dialogRef`。pending 时确认和取消禁用，阻止 Escape 误关并说明正在处理；请求结束后恢复取消。网络结果不确定时不自动重发。

弹窗验收：Tab/Shift+Tab 不跑到背景，背景不能交互，Escape 能取消闲置弹窗，关闭后焦点恢复；长文案在窄屏可滚动，底部按钮可达。`showModal()` 提供模态基础，但仍必须实测焦点与布局，不仅检查源码。

## 十、任务 7：把工具预览改成分页管理列表

修改 `app/admin/tools/page.tsx`，使用 `getAdminToolsPage`。页面接收：

```ts
type Search = { page?: string | string[]; notice?: string | string[] };
type Props = { searchParams: Promise<Search> };
```

先 `const query = await searchParams`；只接受单个字符串页码，数组按无效处理。

页面必须展示：

- 标题“工具管理”，真实的“新增工具”链接，公开工具页链接。
- 语义表格：名称、分类、收藏、更新时间、操作。操作使用编辑链接、删除按钮；完整简介和网址在编辑页可查看。
- “当前显示第 X～Y 条，共 N 条，第 P/Q 页”。总数 0 时显示 0～0。
- 上一页/下一页：边界用真正禁用的按钮或不可交互文字，不留可点击的假禁用链接。
- 固定每页 10 条、固定更新时间倒序，不画没有功能的排序箭头。
- 空数据提示“还没有工具”，提供新增；失败沿用后台错误边界，不能显示“共 0 条”。

页码处理参考：

```ts
const rawPage = typeof query.page === 'string' ? query.page : undefined;
const result = await getAdminToolsPage(rawPage);
// notice 仅允许固定值；不能把用户输入的任意提示 HTML 输出到页面。
const notices: Record<string, string> = {
  created: '工具已创建。', updated: '工具已更新。', deleted: '工具已删除。',
};
const notice = typeof query.notice === 'string' && Object.hasOwn(notices, query.notice)
  ? query.notice : undefined;
const canonical = `/admin/tools?page=${result.page}${notice ? `&notice=${notice}` : ''}`;
if (rawPage !== String(result.page)) redirect(canonical);
if (result.rows.length === 0 && result.page > 1) {
  redirect(`/admin/tools?page=${result.page - 1}${notice ? `&notice=${notice}` : ''}`);
}
```

`notice` 只控制普通反馈文字，可被手动改写，因此不能用来证明数据库实际保存成功，更不能控制权限。数据库确认只认服务端返回及实际记录。把提示放入共享、预留空间的 `role="status"` 区域；重访可显示同样文字，若不希望重复，可在首次展示后移除该参数。

新建/编辑链接携带受限来源页码，例如 `?page=2`，取消恢复来源页。服务端只由数字构造站内地址，不接受任意 `returnTo` URL，避免开放重定向。

删除成功后列表重新计数，最后一页被删空时退到有效页；不要先从客户端数组删掉就宣布成功。

## 十一、任务 8：样式与跨页一致性

继续使用现有浅灰蓝背景、白色面板、紫色主操作。无需重新设计后台。

- 在 `app/globals.css` 的 `:root` 增加 `--danger: #a31e31`，来自已存在的 DESIGN.md；所有新增危险色使用该变量。
- 扩展现有 `admin.module.css`，不要复制另一套 panel/button 样式。
- 错误提示保留约一行高度，提交按钮固定合理最小宽度；pending 时文案改变不推动其他按钮。
- 文本输入、radio、checkbox 都有可见 focus（焦点）；错误不能只用红框表达。
- textarea 设置 `resize: none`，至少 6 行，并提供展开按钮或按内容增长，不能截断长输入。
- 表格横向滚动只属于表格容器；长表单由页面自然滚动，不把共用后台容器改成固定屏高。
- 共享弹窗限制最大宽高、正文可滚动；默认聚焦安全按钮。删除列表入口低强调，最后确认使用危险色。
- 更新“工具预览”“今天仅开放只读”等过时文案；项目预览仍只读。
- 在维护的设计/交互记录中写清：工具表单共享、保存回第一页、取消回来源页、删除夹页、失败保留值、永久删除无撤销。

## 十二、权限验收：不能只用 postgres 角色测试

Supabase 控制台的 postgres（数据库管理角色）拥有高权限；它能写不代表普通用户能写，也不代表 RLS 正确。

| 身份 | 公开读 tools | 新增 | 修改 | 删除 |
| --- | --- | --- | --- | --- |
| 未登录 anon | 允许 | 拒绝 | 拒绝 | 拒绝 |
| 普通 authenticated 用户 | 允许 | 拒绝 | 拒绝 | 拒绝 |
| 指定管理员 | 允许 | 允许 | 允许 | 允许 |

必须同时验证页面入口和数据库角色。不要为了构造请求把 service_role 放进浏览器，不要分享密码、Cookie 或访问令牌。

可在 SQL 编辑器中对测试记录使用事务模拟角色，验证后回滚。下面仅是普通用户更新拒绝测试：把 UUID 换成确实不是管理员的用户 ID，把工具 ID 换成你专门新建的测试记录；先以管理角色确认该记录存在。

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'REPLACE_WITH_NON_ADMIN_UUID', true);
update public.tools set name = '不应被普通用户写入'
where id = 'REPLACE_WITH_TEST_TOOL_ID'
returning id;
rollback;
```

预期返回 0 行（或权限拒绝），回滚后原名称不变。零行前提是测试记录确实存在，否则测试无效。`set local` 和 `set_config(..., true)` 仅作用于当前事务，不是创建登录会话，也不是浏览器身份伪造方案。

新增拒绝通常报错；更新/删除被 RLS 过滤可能返回 0 行。发生 SQL 错误后执行 `ROLLBACK` 清理失败事务，不把中间语句单独无事务重跑。管理员允许测试也只针对测试记录，事务最后回滚。事务模拟不能替代真实登录网页测试。

## 十三、整天验收顺序与预期答案

1. **新增**：创建“Day13 测试工具”，网址 `https://example.com/day13-test`，分类学习、不收藏。保存后回第 1 页，可看到该工具；公开工具集也出现。
2. **编辑**：改名称为“Day13 测试工具已编辑”，改分类和收藏。刷新仍保留；更新时间变动；原有其他工具与标签没有被覆盖。
3. **校验**：空名称、空简介、`javascript:alert(1)`、非法分类被拒绝；页面保留输入并聚焦错误字段。
4. **重复网址**：新建第二条同网址，收到明确提示，不覆盖第一条。
5. **旧版本**：A/B 两个编辑页打开同一测试工具；A 保存，B 保存被拒绝或提示重新核对，不能静默覆盖 A。
6. **取消删除**：点删除后取消/Escape，数据库不变，焦点回到删除按钮。
7. **确认删除**：只删除今天新建的测试工具。云端、列表和公开页都不再显示，原有工具不受影响。
8. **分页**：单页最多 10 条，`page=abc`、`page=-1`、`page=99999` 被规范处理；测试数据超过 10 条时验证前后页及末页删除。不要把“当前只有 6 条”当作分页验证完成。
9. **权限**：按上表验证三种身份，记录实测结果；登录页看不到后台只是其中一项，不是数据库权限测试的替代品。
10. **会话过期/网络失败**：保留输入、不假报成功；提示重新登录或先核对结果；没有无限重试。
11. **离开保护**：修改后点击取消/顶部导航/退出/刷新，出现正确确认；未修改不弹；浏览器历史边界如实记录。
12. **窄屏/键盘**：390px 下表单不横向溢出，删除弹窗按钮可达；Tab 顺序正确，焦点可见，分类单选键盘可用。

今天新增的每条记录都是公开内容，不写私人信息。测试结束只通过已确认的界面删除自己创建的记录，不清空表、不重新 Seed（种子导入）。

最后运行：

```powershell
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

- `npm run lint`：执行项目代码规范检查，预期没有错误。
- `npx tsc --noEmit`：检查类型、不输出 JavaScript 文件，可能更新类型检查缓存。
- `npm run build`：生成 `.next` 生产构建文件，预期正常退出并显示路由结果；开始编译不等于成功。
- `git diff --check`：检查已跟踪差异的空白错误，不会提交代码；不等于检查所有未跟踪文件。

命令不修改 Supabase 数据。构建若卡住，记录完整现象和耗时，不随意删锁文件、升级依赖或重装整个项目来碰运气。

## 十四、常见问题与排查顺序

### 能登录，但保存报权限错误

依次检查：两处管理员 UUID 一致 → 新迁移已推送 → authenticated 获得所需列权限 → 写入使用当前用户 Cookie → 对应操作策略存在。不要关闭 RLS 或换成 service_role 绕过去。

### 更新没有报错，但内容没变

查看实际返回行数；ID/版本可能不匹配，或 RLS 过滤掉目标。教材使用返回 ID 确认命中，不能只看 error 是否为空。

### 删除一条工具后标签也没了？

分清 `tool_tags` 与 `tags`：关联行应该消失，共享标签本身不应该被删。如果 tags 表被清空，是实现越界，不是正常级联行为。

### 保存后公开页面看着还是旧的

先确认云端记录真正变化，再检查是否刷新 `/tools`；后台改 React 本地状态不代表写库。其他已打开标签页不一定立即自动更新。

### 提交错误后输入突然清空

检查是否重置表单、重新挂载组件、使用变化的 key，或依赖非受控表单的默认重置。共享表单使用受控值，错误状态不覆盖输入。

### 运行成功但出现 NEXT_REDIRECT 错误提示

可能把 `redirect()` 放进通用 try/catch 吞掉了控制流。写入异常处理完成后，再失效缓存和跳转。

## 十五、自测题与标准答案

先遮住答案独立思考；讲得通比记住函数名更重要。

1. 为什么已登录不代表能改工具？
2. 隐藏删除按钮是否足够安全？
3. USING 和 WITH CHECK 分别检查什么？
4. 为什么新建用 insert 而不是 upsert？
5. 为什么编辑不让用户改 ID？
6. 为什么更新条件带旧 updated_at？
7. 为什么更新返回零行不能显示成功？
8. 第 3 页、每页 10 条，range 是多少？
9. 删除工具会删除哪些数据？
10. 为什么不能把所有 FormData 字段直接写入？
11. 为什么复选框不能使用 Boolean('false')？
12. revalidatePath 会让其他设备立即更新吗？
13. 为什么 SQL 编辑器管理员写入成功不能证明 RLS 正确？
14. 为什么两处管理员 ID 必须一致？
15. 为什么网络报错后不自动重复新增？
16. 为什么有 onNavigate 仍不能说绝对不会丢稿？

### 标准答案

1. 登录只证明身份；本项目还要求 ID 等于指定管理员，并满足数据库策略。
2. 不够，请求可以绕开按钮；服务端和数据库必须分别授权。
3. USING 限制可触及的现有行，WITH CHECK 检查新增/更新后的行。
4. 新建应遇重复就提示，不应偷偷更新已有记录。
5. ID 是记录身份和关联依据；业务编辑不应更换身份。
6. 检查数据是否在打开页面后被别人修改，避免静默覆盖旧版本。
7. 可能不存在、被删除、版本过期或被权限过滤；必须确认实际命中。
8. 20～29，起止都包含。
9. tools 的目标行和该工具的 tool_tags 关联；不删 tags 或其他工具。
10. 用户可伪造 ID、时间等字段；必须只写允许的业务字段。
11. 非空字符串都是真值；应检查是否提交了约定的 'on'。
12. 不会，它处理指定路径的数据刷新，不是跨设备实时广播。
13. 管理角色可能绕过 RLS；必须验证 anon、普通用户、管理员的允许和拒绝行为。
14. 应用配置与数据库策略是独立检查；不一致会导致错误拒绝，或留下旧管理员数据库写权限。
15. 服务器可能已提交但响应丢失，应先核对结果；固定 ID/唯一约束减少重复，不等于永远可安全重试。
16. 它只拦截接入该逻辑的客户端链接，历史前进后退等需要额外方案和验证。

## 十六、提交检查时这样说

```text
Day 13 完成，请检查。
新迁移文件名：……
新增/编辑/删除：实际结果……
anon、普通用户、管理员写入验证：实际结果……
超过 10 条的分页与末页删除：实际结果……
重复网址、非法字段、双标签页冲突：实际结果……
失败保留输入、离开保护、删除取消：实际结果……
lint / 类型检查 / build：实际结果……
未完成或尚未测试：……
```

不必发送密码、密钥或完整 `.env.local`。没有测试的项目直接写“未测试”，不要根据代码猜通过。

## 十七、官方参考与复习路线

本课接口用法已结合项目安装的 Next.js 文档核对；不要照搬旧教程中的同步 params 或 App Router 的 router.events。

- [Next.js 表单与服务端操作](https://nextjs.org/docs/app/guides/forms)
- [Next.js 路径缓存失效](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [Next.js Link 与 onNavigate](https://nextjs.org/docs/app/api-reference/components/link)
- [Supabase 行级安全](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase 更新记录](https://supabase.com/docs/reference/javascript/update)
- [Supabase 删除记录](https://supabase.com/docs/reference/javascript/delete)

一句话总结：**安全的增删改查 = 正确授权 + 可信输入 + 精确写入 + 结果确认 + 可恢复的界面。**
