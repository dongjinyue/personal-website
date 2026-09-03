# Day 11：管理员登录、会话与访问权限

状态：主体完成，待补充验收

## 2026-09-03 检查记录

- 用户反馈：管理员登录成功。
- 本次实际运行：ESLint 通过、TypeScript `--noEmit` 通过、`git diff --check` 通过。
- 安全静态检查：后台页调用 `requireAdmin()`；身份来自 `getUser()`；用户 ID 白名单在服务器校验；普通账号登录后清理会话；退出使用 `scope: local`；未更改业务 RLS 写权限。
- 保密检查：`.env.local` 与 `supabase/.temp/project-ref` 被 Git 忽略。本次没有读取或导出密码及会话令牌。
- 浏览器实际检查：匿名访问 `/admin` 到达 `/login`；登录页 390px 宽度下页面宽度也是 390px；邮箱 → 密码焦点顺序正常；公开 `/tools` 显示 6 个工具。
- 前端技能严格静态审计返回 0 项问题，但这不等于完整交互审计通过。
- 本次生产构建长时间停在编译阶段后主动停止，没有取得成功或具体编译失败结果，记为未完成验证。
- 待补充：退出后的直接访问、普通 Auth 用户拒绝、真实令牌过期刷新、错误密码、完整生产构建结果。
- 表单体验待改进：密码显示/隐藏按钮；改用应用内校验提示并补充字段级错误与焦点恢复。保留邮箱、错误后不回填密码。当前浏览器原生校验符合此前课堂示例，但不满足完整产品体验约定。
- 结论：代码与基础行为可以支撑 Day 12 学习，不将尚未执行的测试标记为通过。本次只记录审查结果，没有自动修改认证业务代码。

版本基准：Next.js 16.3.4、React 19、@supabase/ssr 0.12.5。日期：2026-09-03。

这是一份完整的当天教材。先读概念，再按任务顺序操作；不要一次粘贴所有文件后才检查。文档中的代码是待你实现的参考答案，不表示网站已经具备这些功能。

## 一、今天的目标和范围

最终效果：

- `/login` 可以用邮箱和密码登录；
- 只有指定管理员能进入 `/admin`；
- 未登录访问 `/admin` 会跳转登录页；
- 普通已登录用户仍不能进入管理员页面；
- 管理员可以退出，退出后再次访问后台必须登录；
- 刷新页面和会话更新不会无故丢失登录状态；
- `/tools` 对访客继续公开，搜索和筛选不变。

今天不做注册页面、密码找回、第三方登录、完整后台布局、多管理员管理、工具增删改、数据库写入策略。后台今天只是一个验证权限的最小入口，Day 12 再扩展。

本日不需要新的依赖、不需要数据库迁移、不需要 Service Role Key（服务端高级密钥）。Supabase Auth 已经提供用户管理，不能自己建一张保存明文密码的表。

## 二、三类账号必须分清

| 账号或密码 | 用途 | 今天是否用它登录网站 |
| --- | --- | --- |
| Supabase 平台账号 | 进入 Supabase Dashboard（控制台） | 否 |
| PostgreSQL 数据库密码 | 管理数据库连接 | 否 |
| Supabase Auth 用户 | 登录你自己的个人网站 | 是 |

你之前用 GitHub 登录 Supabase，只是登录了开发平台，不代表你的网站自动有了管理员账号。

## 三、认证、会话、授权

Authentication（身份认证）：验证邮箱密码属于谁。

Session（会话）：让之后的请求继续识别这个用户，不必每次重复输入密码。

Authorization（授权）：决定这个用户可以访问哪些页面或操作。

```text
邮箱与密码
↓ 身份认证
Supabase Auth 确认用户 ID
↓ 会话
通过 Cookie 在后续请求中携带登录凭据
↓ 授权
用户 ID 是否等于服务端配置的管理员 ID？
├── 是 → 可以进入 /admin
└── 否 → 拒绝进入
```

关键结论：`authenticated`（已登录角色）不是 `admin`（管理员）。不能写成“只要登录就允许管理”。

## 四、为什么用用户 ID 判断管理员

今天使用服务器配置 `ADMIN_USER_ID` 保存唯一管理员的 UUID（通用唯一标识）。

优点：适合单人网站，逻辑容易理解，不依赖访客提交的角色字段，也不需要先设计角色管理系统。

代价：管理员变更需要修改环境变量并重启或重新部署；多管理员系统以后更适合数据库角色表或由可信后台维护的声明。

不要信任表单中的 `isAdmin=true`，也不要让用户可修改的 `user_metadata`（用户元数据）决定管理权限。

特别注意：服务器环境变量不是 PostgreSQL RLS 能直接读取的角色表。今天只保护网站后台入口；Day 10 的业务表仍只有公开 SELECT（读取）策略，连管理员也尚未被授予写入权限。Day 13/14 做写入时还要设计数据库授权，不能直接给所有 `authenticated` 开放写入。

## 五、Cookie、Token 与 Proxy 的关系

Cookie（浏览器随请求携带的数据）是会话存储与传输的一种方式。

Access Token（访问令牌）用于证明当前请求身份，有有效期；Refresh Token（刷新令牌）用于在允许的情况下更新会话。不要手写令牌生成、解析和刷新协议，交给 Supabase 库。

Next.js 的服务端组件能够读取 Cookie，但不能在页面渲染阶段任意写入响应 Cookie。因此需要 Proxy（请求前处理）协作刷新会话，并同时更新：

- 当前请求：让接下来的服务端组件看到新凭据；
- 返回响应：让浏览器保存新凭据。

本项目安装的 SSR（服务端渲染）库还会传入防缓存响应头，必须保留，避免共享缓存把一个用户的登录响应提供给别人。

依据：[Supabase 服务端客户端与会话说明](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)。具体 `setAll` 类型另已核对本地安装包。

## 六、今天使用哪些用户检查方法

- `getClaims()`：校验令牌声明，今天用于 Proxy 触发必要的会话更新；
- `getUser()`：向 Auth 服务获取确认后的用户记录，今天用于管理员判断；
- `getSession()`：取得原始会话内容，但不能只信任其中未经重新验证的用户信息作授权。

我们选择 `getUser()` 是为了让初学阶段的管理员验证更直接，代价是增加一次网络请求。任何服务异常都不能降级成“默认管理员”。

## 七、完整任务顺序

1. 在 Supabase 创建网站管理员用户，关闭公开注册。
2. 配置站点地址和管理员 ID。
3. 更新服务端客户端，区分只读页面和可写 Cookie 的操作。
4. 添加 Proxy 会话更新。
5. 添加管理员验证辅助函数。
6. 实现登录与退出操作。
7. 创建表单、登录页和最小后台页。
8. 增加错误边界。
9. 完成匿名、管理员、普通用户和失效会话验收。
10. 执行规范、类型和构建检查，记录结果。

## 任务 1：在 Supabase 创建网站用户

这是你在控制台亲自操作的部分，不要把密码交给助手。

1. 打开 `personal-website` 项目。
2. 进入 Authentication（身份认证）→ Users（用户）。
3. 找到 Add user（添加用户）或 Create user（创建用户）入口；界面文字可能随版本变化。
4. 使用你自己控制的邮箱，为网站账号设置独立的强密码。
5. 若界面提供 Auto Confirm User（自动确认用户），这是你作为平台管理员手动创建自己账号时可用的选项；不要因此全局关闭邮箱确认。
6. 保存密码到密码管理器，不放入 `.env.local`、源代码、Seed（种子数据）或聊天。
7. 创建完成后复制用户详情中的 User ID（用户标识），通常是带连字符的 UUID。

用户 ID 不是 Project Reference（项目标识），也不是 API Key（接口密钥）。

在 Authentication 的 Sign In / Providers（登录方式）或相应设置中：

- 保持 Email（邮箱）登录启用；
- 关闭 Allow new users to sign up（允许新用户注册）；
- 不启用匿名账号登录，也不新增第三方登录提供方。

关闭公开注册不影响已有用户登录，也不是管理员授权的替代品。后续测试用普通用户也通过控制台手动创建，不必重新开放注册。[官方认证配置说明](https://supabase.com/docs/guides/auth/general-configuration)

注意：Day 10 的 `anon` 数据库角色与“创建一个匿名 Auth 用户”不是同一件事。访客读取公开工具不需要开启匿名登录。

## 任务 2：配置 URL 和环境变量

在 Authentication → URL Configuration（地址配置）中，把本地 Site URL（站点地址）设为：

```text
http://localhost:3000
```

今天只做密码登录，应用代码固定跳转 `/admin`，不需要新增邮件回调路由或任意通配符重定向。以后做邮件确认、找回密码或 OAuth（第三方授权登录）时再配置对应的精确回调地址。

本地统一使用 `localhost`，不要在 `127.0.0.1` 与 `localhost` 之间混用，否则 Cookie 不属于同一主机。端口不是 3000 时按真实地址调整。

在现有 `.env.local` 末尾增加一行，保留已有两行 Supabase 配置：

```env
ADMIN_USER_ID=这里填写任务1创建的用户UUID
```

在 `.env.example` 只增加空模板：

```env
ADMIN_USER_ID=
```

不要加 `NEXT_PUBLIC_`，也不要存管理员密码。用户 ID 本身不是密码，但允许谁当管理员的配置必须由服务器控制。

保存后停止开发服务器并重新执行 `npm run dev`。这些配置会影响本地登录行为，不修改数据库结构。

## 任务 3：调整服务端客户端

文件：`lib/supabase/server.ts`。替换为下列完整内容。原来的 `getTools()` 仍然可以无参数调用，因此不需要修改工具查询层。

```ts
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/** 每个请求单独创建；true 只供能写 Cookie 的 Server Action 使用。 */
export async function createSupabaseServerClient(writableCookies = false) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("缺少 Supabase 环境变量，请检查本地配置。");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // 页面渲染只读，会话刷新由 Proxy 在响应提交前处理。
        if (!writableCookies) return;

        // 登录和退出必须真正写入 Cookie；失败时不能吞掉错误。
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
```

`false`：用于读取页面，Proxy 必须先完成必要刷新。

`true`：用于 Server Action（服务端操作）的登录和退出；不能在普通页面中传 `true` 试图绕过 Next.js 的 Cookie 写入限制。

这里没有手动设置响应头接口；Next.js 管理 Server Action 的响应。后续不要通过反向代理缓存登录 POST（提交）响应。Proxy 中则显式处理库提供的响应头。

## 任务 4：实现会话更新

新建 `lib/supabase/proxy.ts`：

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/** 同步请求与响应 Cookie，不在这里承担全部管理员授权。 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("缺少 Supabase 环境变量。");

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        // 用更新后的请求创建响应，并保留可能已经写入的 Cookie。
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // 尽早触发令牌检查或更新。匿名无会话并不意味着公开页应被拦截。
  await supabase.auth.getClaims();

  // 学习阶段不共享缓存这些请求，避免不同用户的响应混用。
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
```

再新建项目根目录 `proxy.ts`，与 `app` 目录同级：

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/tools"],
};
```

`matcher`（匹配规则）覆盖今天涉及 Cookie 的页面和后台路径，不处理图片等静态资源。以后新增读取会话的路由时同步扩展。

不要另写一个 `middleware.ts` 与它并存。Next.js 16 使用 Proxy 命名。

重要：必须返回带刷新 Cookie 的原响应，不能在最后随手返回一个新的 `NextResponse.next()`，否则浏览器拿不到更新后的会话。

## 任务 5：集中判断管理员

新建 `lib/auth/admin.ts`：

```ts
import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 配置错误时停止，不把缺少配置解释成“所有人都能进入”。 */
export function getAdminUserId() {
  const id = process.env.ADMIN_USER_ID?.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuid.test(id)) {
    throw new Error("ADMIN_USER_ID 未配置为正确的用户 UUID。");
  }
  return id.toLowerCase();
}

export function isAdmin(userId: string) {
  return userId.toLowerCase() === getAdminUserId();
}

/** 向 Auth 服务确认用户，不直接信任客户端传入的身份。 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isAuthSessionMissingError(error) || error.status === 401 || error.status === 403) {
      return null;
    }
    // 服务故障保留为错误，不伪装成已登录，也不暴露底层响应内容。
    throw new Error("暂时无法确认登录状态，请稍后重试。");
  }
  return data.user;
}

/** 页面使用跳转；以后每个敏感操作也必须重新调用授权检查。 */
export async function requireAdmin() {
  getAdminUserId();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/login?error=forbidden");
  return user;
}
```

解释：

- 未登录不是系统故障，返回 `null`；
- 网络或 Auth 服务异常不能默认放行；
- 管理员身份来自确认后的 `user.id`，不是邮箱输入框；
- `redirect()` 通过框架控制流程跳转，不要放在会吞掉异常的宽泛 `try/catch` 里。

## 任务 6：实现登录和退出操作

新建 `lib/auth/types.ts`，只保存可共享的类型：

```ts
export type AuthActionState = {
  message: string;
};
```

新建 `app/auth/actions.ts`：

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUserId } from "@/lib/auth/admin";
import type { AuthActionState } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 返回可展示的错误，不返回密码、令牌或完整 Auth 响应。 */
export async function loginAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return { message: "请填写邮箱和密码。" };
  }

  const email = emailValue.trim();
  const password = passwordValue; // 密码不能 trim，空格可能是密码的一部分。
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { message: "请输入有效的邮箱地址。" };
  }
  if (!password || password.length > 1024) {
    return { message: "请检查密码长度。" };
  }

  const adminId = getAdminUserId();
  const supabase = await createSupabaseServerClient(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { message: "登录失败，请检查凭据或稍后重试。" };
  }

  if (data.user.id.toLowerCase() !== adminId) {
    // 普通账号认证虽成功，但没有管理权限；清理本次登录会话。
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) throw new Error("清理会话失败，请稍后重试。");
    return { message: "此账号没有管理员权限。" };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

/** 只退出当前会话，不把所有设备一起退出。 */
export async function logoutAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  void formData;
  const supabase = await createSupabaseServerClient(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { message: "退出失败，请稍后重试。" };

  revalidatePath("/", "layout");
  redirect("/login");
}
```

`FormData`（表单数据）来自浏览器，必须在服务端再次验证；HTML 的 `required` 不能替代这一步。

`revalidatePath`（使路径内容重新验证）帮助后续页面更新登录相关结果。登录固定跳转 `/admin`，退出固定跳转 `/login`，今天不接受用户传入任意外部跳转网址。

退出当前会话并不代表已经发出的访问令牌瞬间全部失效。不要在文档或产品中承诺“退出立刻撤销所有令牌”。[官方退出说明](https://supabase.com/docs/reference/javascript/auth-signout)

## 任务 7：表单与最小页面

今天样式仅用于让操作清楚、可读、可用，复用已有全局颜色变量；不重做公开页面设计。

### 7.1 共用样式

新建 `app/auth.module.css`：

```css
.panel {
  width: min(100% - 2rem, 36rem);
  margin: 3rem auto;
  padding: clamp(1rem, 4vw, 2rem);
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--surface);
  overflow-wrap: anywhere;
}
.form { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.5rem; }
.input {
  width: 100%;
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--foreground);
  font: inherit;
}
.button {
  min-height: 2.75rem;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--accent);
  color: white;
  font: inherit;
  cursor: pointer;
}
.button:disabled { opacity: 0.65; cursor: wait; }
.input:focus-visible, .button:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.message { min-height: 1.5em; margin: 0; color: #a31e31; }
.hint { color: var(--muted); line-height: 1.7; }
```

### 7.2 登录表单

新建 `components/LoginForm.tsx`：

```tsx
"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/auth/actions";
import styles from "@/app/auth.module.css";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { message: "" });

  return (
    <form action={formAction} className={styles.form} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="login-email">邮箱</label>
        <input className={styles.input} id="login-email" name="email"
          type="email" autoComplete="username" required maxLength={254}
          aria-describedby="login-message" />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-password">密码</label>
        <input className={styles.input} id="login-password" name="password"
          type="password" autoComplete="current-password" required maxLength={1024}
          aria-describedby="login-message" />
      </div>
      <p className={styles.message} id="login-message" role="status" aria-live="polite">
        {state.message}
      </p>
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
```

`useActionState`（操作状态钩子）提供错误状态、提交函数与等待状态。等待时禁用按钮以避免误点，但它不是服务端限流；不能阻止攻击者直接发请求。

不要通过状态把密码回填、打印或保存在浏览器本地存储中。React 提交后可能重置非受控表单，错误后需要重新填写是可以接受的。

### 7.3 退出按钮

新建 `components/LogoutButton.tsx`：

```tsx
"use client";

import { useActionState } from "react";
import { logoutAction } from "@/app/auth/actions";
import styles from "@/app/auth.module.css";

export default function LogoutButton() {
  const [state, formAction, pending] = useActionState(logoutAction, { message: "" });
  return (
    <form action={formAction} className={styles.form} aria-busy={pending}>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "正在退出…" : "退出当前账号"}
      </button>
      <p className={styles.message} role="status">{state.message}</p>
    </form>
  );
}
```

### 7.4 登录页

新建 `app/login/page.tsx`：

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import LogoutButton from "@/components/LogoutButton";
import { getAdminUserId, getCurrentUser, isAdmin } from "@/lib/auth/admin";
import styles from "@/app/auth.module.css";

export const metadata: Metadata = {
  title: "管理员登录",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  getAdminUserId();
  const user = await getCurrentUser();
  if (user && isAdmin(user.id)) redirect("/admin");

  return (
    <main className={styles.panel}>
      <h1>管理员登录</h1>
      <p className={styles.hint}>只有指定管理员可以进入后台，公开工具页无需登录。</p>
      {user && (
        <section aria-label="当前账号状态">
          <p>当前账号没有管理员权限，请退出后使用管理员账号。</p>
          <LogoutButton />
        </section>
      )}
      <LoginForm />
    </main>
  );
}
```

这里以确认后的 `user` 判断，不靠 `?error=forbidden` 字符串授予或拒绝权限。查询字符串只表示跳转缘由，不是可信身份来源。

### 7.5 最小后台页

新建 `app/admin/page.tsx`：

```tsx
import type { Metadata } from "next";
import LogoutButton from "@/components/LogoutButton";
import { requireAdmin } from "@/lib/auth/admin";
import styles from "@/app/auth.module.css";

export const metadata: Metadata = {
  title: "管理入口",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // 在读取或显示后台内容之前完成授权。
  const user = await requireAdmin();
  return (
    <main className={styles.panel}>
      <h1>管理入口</h1>
      <p>你已通过管理员验证。</p>
      <p className={styles.hint}>当前账号：{user.email}</p>
      <p>今天只验证身份；工具和项目管理会在后续课程实现。</p>
      <LogoutButton />
    </main>
  );
}
```

搜索引擎 `noindex`（不索引）只是元信息，不是访问控制。以后新增 `/admin/tools` 等页面时，仍需验证身份，不能只依靠一个布局或顶部按钮。

## 任务 8：给认证页面增加错误边界

新建 `components/AuthError.tsx`：

```tsx
"use client";

import styles from "@/app/auth.module.css";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.panel}>
      <h1>暂时无法完成身份验证</h1>
      <p>请稍后重试。开发时请同时检查终端和认证配置。</p>
      <button className={styles.button} onClick={() => reset()}>重试</button>
    </main>
  );
}
```

分别创建 `app/login/error.tsx` 和 `app/admin/error.tsx`，两份内容相同：

```tsx
"use client";

export { default } from "@/components/AuthError";
```

它负责页面渲染期间的错误界面；发生在 Proxy 更早阶段的错误不一定被该页面边界捕获，需要查看终端日志。不得把完整令牌或密码放入日志。

## 九、完成后的文件结构

```text
proxy.ts
lib/
├── auth/
│   ├── admin.ts
│   └── types.ts
└── supabase/
    ├── server.ts        修改现有文件
    ├── proxy.ts
    └── database.types.ts 保持不变
components/
├── LoginForm.tsx
├── LogoutButton.tsx
└── AuthError.tsx
app/
├── auth.module.css
├── auth/actions.ts
├── login/
│   ├── page.tsx
│   └── error.tsx
└── admin/
    ├── page.tsx
    └── error.tsx
```

今天客户端表单通过 Server Action 登录，没有直接从浏览器查询 Supabase，因此无需创建暂时不用的 `lib/supabase/client.ts`。Day 10 对它的预告不是强制要求；未来确实需要浏览器订阅登录事件或实时数据时再添加。

## 十、规范、类型与构建检查

在项目根目录运行：

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

- `npm run lint`：执行已有 ESLint（规范检查），预期没有错误；
- `npx tsc --noEmit`：检查 TypeScript 类型，不输出编译后的 JavaScript，可能更新增量检查缓存；
- `npm run build`：生成 `.next` 生产构建并检查编译，不能替代登录实际验收。

构建前可先停止开发服务，避免同时调试造成混淆。构建完成后执行 `npm run dev` 开始下面的浏览器验证。

第一次类型检查若提示缺少生成的 Next.js 路由类型，可以先运行一次 `npm run dev` 或构建生成类型，再重新检查；不要用 `any` 绕过真实错误。

## 十一、必须实际完成的验收

不要只验证“正确账号能登录”。反向测试更能证明权限边界。

| 场景 | 操作 | 标准结果 |
| --- | --- | --- |
| 匿名访问后台 | 无痕窗口打开 `/admin` | 跳转 `/login`，不显示后台内容 |
| 错误密码 | 输入管理员邮箱与错误密码 | 留在登录页，显示通用错误 |
| 空表单 | 不填必填项提交 | 浏览器阻止；服务端仍有独立校验 |
| 正确管理员 | 输入任务 1 的账号 | 跳转 `/admin`，显示当前邮箱 |
| 刷新后台 | 登录后按刷新 | 仍能通过验证 |
| 访问登录页 | 管理员登录后打开 `/login` | 跳转 `/admin` |
| 退出 | 点击退出按钮 | 回到 `/login` |
| 退出后重访 | 手动输入 `/admin`，不要只看浏览器返回缓存 | 再次要求登录 |
| 普通 Auth 用户 | 控制台手动创建另一个测试用户并尝试登录 | 不进入后台，提示没有管理员权限 |
| 缺少管理员配置 | 临时去掉本地 `ADMIN_USER_ID` 并重启，测试后恢复 | 报配置错误，不默认放行 |
| 公开页面 | 退出后访问 `/tools` | 仍然能看 6 个工具并搜索筛选 |
| 手机与键盘 | 390px 宽度、Tab、Enter 操作 | 不横向溢出，焦点可见，表单可用 |

普通用户测试不要在控制台删除自己的管理员账号。测试邮箱、密码不提交代码，也不写入 Seed。

### 会话刷新补充验收

普通页面刷新不等于验证令牌刷新。不要为了缩短测试时间擅自更改云端令牌有效期。可以记录一次自然到期后重新访问的结果，或在独立开发环境中专门测试。

浏览器开发者工具中可以观察会话 Cookie 是否随响应更新，但不要复制、截图分享它们的值。只记录“更新成功/失败”和是否仍能进入后台。

若当天未等到自然刷新，请写明“刷新机制代码已核对，真实过期刷新待验证”，不能将其冒充为已通过。

### 更强的普通用户边界验证

错误账号在登录操作中会被退出，因此上面的测试主要证明登录入口授权。还要验证“已有有效会话，但现在不是管理员”的直接访问：

1. 在本地先用管理员 A 登录，保持浏览器会话。
2. 记录原来的管理员 UUID；把本机 `.env.local` 的 `ADMIN_USER_ID` 临时改成控制台中测试用户 B 的 UUID。
3. 重启本地开发服务器，不在浏览器退出 A 的会话。
4. 手动输入 `/admin` 并重新加载。A 虽然仍是已认证用户，但现在不在白名单中，必须被拒绝并转到登录页。
5. 把配置恢复为 A 的 UUID，再重启，确认 A 可访问后台。

仅在本地学习环境测试，不对生产部署操作，也不需要改动任何人的数据库账号。这样能证明后台本身独立检查权限，而不是只依靠登录按钮或登录操作拦截。

## 十二、常见错误

### 登录平台的密码为什么不对？

平台账号、数据库密码和网站 Auth 用户不是同一套凭据。使用任务 1 创建的网站账号。

### Email not confirmed（邮箱未确认）

检查创建用户时的确认状态；只对自己手动建立的账号执行合适的确认流程，不要为了省事关闭全项目安全设置。

### 用户能登录，却提示无管理员权限

检查 `ADMIN_USER_ID` 是否为同项目该用户的 UUID，是否误写了项目标识，修改后是否重启。

### 刷新后掉登录

检查 Proxy 的匹配路径、是否同时写入请求与响应 Cookie、是否错误丢弃响应。确认统一使用同一个主机名。

### Cookies can only be modified…（Cookie 不能在此修改）

确认没有在服务端页面中传入 `writableCookies = true`。写入只用于 Server Action，页面渲染为只读。

### NEXT_REDIRECT 被当成错误

通常是把 `redirect()` 放在宽泛 `try/catch` 中吞掉了框架跳转。应把预期登录错误作为返回值处理，跳转留在成功分支外层。

### 为什么不使用 getSession().user 判断管理员？

服务端不能把客户端可提供的会话内容当成验证完成的身份。先校验声明或从 Auth 获取确认后的用户，再授权。

### 为什么管理员还不能在 tools 表写入？

今天只做网站后台入口授权。数据库策略仍只读，这是刻意保留的安全边界，不是需要关闭 RLS 的错误。

### 登录次数过多或出现限流

暂停重试，查看 Supabase Auth 错误和限流设置。不要通过频繁循环提交测试账号。上线前还需要按威胁模型补充验证码、滥用防护、必要的多因素认证及监控；今天的课堂版本不是完整生产安全审计。

## 十三、自测题

1. Supabase 平台账号为什么不能直接作为网站账号？
2. 认证成功是否代表有管理员权限？
3. 为什么用用户 ID，而不是表单中的角色字段判断管理员？
4. 为什么不能给 `ADMIN_USER_ID` 加公开环境变量前缀？
5. Proxy 为什么要同时更新请求与响应 Cookie？
6. getSession、getClaims 和 getUser 有什么区别？
7. 页面只读客户端与操作可写客户端有什么区别？
8. 为什么只在布局中保护后台不够？
9. 为什么密码不能 trim？
10. 按钮的 pending 状态是否能防止恶意暴力尝试？
11. 为什么退出使用 scope: local？
12. 为什么今天不需要业务数据库迁移？
13. 为什么管理员登录后仍不能修改工具表？
14. 关闭注册是否可以替代后台授权？
15. 为什么会话响应不能进入共享缓存？
16. 构建通过是否证明过期令牌刷新已经通过？

## 十四、自测题标准答案

1. 平台账号管理 Supabase 服务；网站用户属于具体项目的 Auth 用户系统，二者独立。
2. 不代表。认证确认身份，授权再判断这个身份能做什么。
3. 用户 ID 来自确认后的 Auth 用户，角色表单字段可被任意访客伪造。
4. 管理员白名单应由服务器控制，不应成为客户端配置；但保密 ID 本身不是唯一安全措施。
5. 请求 Cookie 让后续服务端组件使用新凭据，响应 Cookie 让浏览器保存新凭据。
6. getSession 读取会话；getClaims 校验令牌声明；getUser 从 Auth 服务获取确认后的用户记录。
7. 页面只能读取，刷新由 Proxy 协作；登录退出操作需要真正写 Cookie，写失败不能悄悄忽略。
8. 页面、接口和操作可通过不同入口调用，共享布局也不保证每次导航都重新执行所有检查。
9. 空格可能是密码的一部分，trim 会改变用户真正输入的凭据。
10. 不能。它只改善交互，服务端仍需认证限流和滥用防护。
11. 明确只退出当前会话，避免默认全局退出影响其他设备；不是只退出当前标签页。
12. Supabase Auth 已有用户存储，今天不改变项目和工具等业务表结构。
13. 服务端白名单控制页面访问，不能自动赋予 PostgreSQL 写权限，RLS 还未开放管理员写入。
14. 不能。项目里可能存在其他已创建用户，也可能以后恢复注册，每次后台访问仍需授权。
15. 共享缓存可能把一个用户的凭据或私有内容发给其他用户。
16. 不能。构建检查代码，真实令牌过期与会话刷新要单独进行行为验证。

## 十五、当天验收清单

- [ ] 在控制台手动创建管理员 Auth 用户，安全保存密码。
- [ ] 关闭公开注册，不开启匿名账号登录。
- [ ] Site URL 与实际本地地址一致。
- [ ] 真实管理员 UUID 只配置在服务器环境变量中。
- [ ] `.env.example` 只新增空模板，`.env.local` 仍被 Git 忽略。
- [ ] 服务端客户端区分只读与可写 Cookie。
- [ ] Proxy 保留请求 Cookie、响应 Cookie 与防缓存头。
- [ ] 登录与后台页使用可信身份和管理员 ID 验证。
- [ ] 登录错误不泄露密码、令牌或完整认证响应。
- [ ] 密码不被 trim、不回传、不打印日志。
- [ ] 登录、退出、刷新、匿名拒绝和普通账号拒绝符合标准结果。
- [ ] 公开 Tools 页面行为未被破坏。
- [ ] 390px 及键盘操作通过。
- [ ] lint、类型检查与 build 通过。
- [ ] 未更改业务表 RLS 为公开写入。
- [ ] 自测已核对答案。
- [ ] 如实记录真实过期刷新测试的完成情况。

## 十六、如何提交检查与保留复习记录

完成后回复：

```text
Day 11 完成，请检查。
已验证：匿名访问、正确登录、错误密码、普通用户拒绝、退出、公开工具页。
构建结果：……
过期刷新验证：已完成 / 尚未验证。
```

只提供现象和错误，不发送密码、完整 Cookie 或访问令牌。检查完成后再把状态改为已完成，不提前打勾。

如果有问题，记录“操作 → 实际结果 → 预期结果 → 已检查项”，这样比只说“登录不行”更容易定位。

## 十七、参考与后续

- [Next.js：身份认证、会话与授权](https://nextjs.org/docs/app/guides/authentication)
- [Next.js：服务端操作](https://nextjs.org/docs/app/getting-started/mutating-data)
- [Next.js：Proxy](https://nextjs.org/docs/app/getting-started/proxy)
- [Supabase：密码登录](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Supabase：服务端客户端](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase：认证配置](https://supabase.com/docs/guides/auth/general-configuration)
- [Supabase：退出范围](https://supabase.com/docs/reference/javascript/auth-signout)

Day 12 扩展受保护的后台布局与导航；Day 13/14 再设计管理员写入策略和增删改操作。不要提前跳过权限设计直接开放写入。

## 一句话总结

登录只是确认“你是谁”，会话让请求记住身份，管理员检查决定能否进入后台，而数据库 RLS 决定最终能操作哪些数据。
