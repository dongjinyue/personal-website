# Task 4 实施报告：权限、查询与安全附件

## 状态

DONE_WITH_CONCERNS

实现范围已完成并提交前自审；但该工作树的 `node_modules`（依赖目录）损坏，无法完成全量测试、ESLint（代码规范检查）和 TypeScript（静态类型检查）的最终 GREEN 验证。

## TDD 记录

### RED

1. 新增 `tests/knowledge/access.test.ts`、`repository.test.ts`、`assets.test.ts` 后执行：

   ```powershell
   npm run test:knowledge
   ```

   结果：失败，`access.test.ts` 报 `Cannot find module '../../lib/knowledge/access'`，`assets.test.ts` 报 `Cannot find module '../../lib/knowledge/assets'`。失败原因是尚未创建目标模块。

2. 增加详情关系测试后执行：

   ```powershell
   node --import tsx --conditions=react-server --test tests/knowledge/repository.test.ts
   ```

   结果：失败，报 `Cannot find module '../../lib/knowledge/repository'`。失败原因是尚未创建 Repository（数据访问层）。

### GREEN（可用依赖尚未损坏时）

1. 访问控制最小实现后执行：

   ```powershell
   node --import tsx --conditions=react-server --test tests/knowledge/access.test.ts
   ```

   结果：2 passed，0 failed。

2. 查询、筛选、排序、分页、摘要和高亮实现后执行：

   ```powershell
   node --import tsx --conditions=react-server --test tests/knowledge/repository.test.ts
   ```

   结果：当时的 2 个查询测试 passed，0 failed。

## 最终验证记录

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run test:knowledge` | 未通过 | 当前所有测试在加载前报 `tsx/index.js` 缺失；既有测试同样受影响。 |
| `npx tsc --noEmit` | 未通过 | 当前工作树找不到 `node_modules/typescript/bin/tsc`。 |
| `npm run lint` | 未通过 | 当前工作树找不到 `node_modules/eslint/lib/config-api.js`。 |
| `git diff --check` | 通过 | 无输出，退出码为 0。 |

尝试执行 `npm ci --include=dev` 后没有产生可用依赖文件；`node_modules/tsx/index.js`、`node_modules/typescript/bin/tsc` 仍不存在。`server-only`（仅服务端边界）已写入 `package.json` 和锁文件，但当前 `node_modules/server-only/index.js` 仍不存在，故未把依赖目录的异常误报为实现错误。

## 修改文件

- `lib/knowledge/access.ts`：唯一的笔记可读性判定与可见集合过滤。
- `lib/knowledge/query.ts`：纯查询辅助模块，提供 URL 规范化、全文搜索、筛选、排序、分页、摘要和高亮。
- `lib/knowledge/repository.ts`：带 `server-only` 边界的真实 Auth（身份服务）鉴权、列表、详情与管理员状态读取。
- `lib/knowledge/assets.ts`：带 `server-only` 边界的附件路径白名单、按笔记授权后的固定提交二进制读取。
- `app/knowledge-assets/[slug]/[...path]/route.ts`：Next.js 16 Promise params（Promise 参数）附件路由与私有禁止缓存响应头。
- `tests/knowledge/access.test.ts`：游客/管理员权限与搜索泄露回归测试。
- `tests/knowledge/repository.test.ts`：查询分页及游客关系泄露回归测试。
- `tests/knowledge/assets.test.ts`：目录穿越、格式白名单和私密附件授权回归测试。

## 自审

- 所有敏感读取均通过 `getCurrentUser()` 与 `isAdmin()` 构造查看者；认证异常降级为游客，未使用 claims（声明）快速路径。
- 管理员状态读取在 Repository 内再次执行 `requireAdmin()`。
- 列表先按查看者过滤，游客的搜索、分类/标签计数和摘要不会取得私密或草稿内容。
- 详情先用全量索引区分真正不存在链接，再按可见笔记裁剪出链、反链、上一篇和下一篇；因此私密/草稿 slug 不会被伪装成“失效链接”泄漏。
- 附件严格先验证笔记权限，后逐段验证 `readonly string[]` 路径并限制到 `attachments/` 与允许图片扩展名，最后读取 `snapshot.version` 的 Git 对象。
- 路由使用 Node.js 默认运行时、`RouteContext` Promise params、`dynamic = "force-dynamic"`、`private, no-store` 和 `nosniff`。

## Concerns

1. 必须在恢复该工作树依赖（至少 `tsx`、`typescript`、`eslint` 与 `server-only`）后重新执行完整测试、类型检查和 ESLint；目前不能声称最终验证通过。
2. 附件路径的异步契约已改为匹配实施简报中的 `assert.rejects` 用法，但这一次修改后无法在损坏的依赖环境中重新观察 GREEN。

## 修复轮次 1（FIX_BASE: `8b1ad511`）

### RED / GREEN

- 先补充纯策略测试：公开笔记请求仅私密笔记引用的 `secret.png` 时 `readBinary` 调用次数必须为 0；残余 `%xx`、双重编码、编码分隔符、非法 `%`、控制字符与协议段必须拒绝；缺失 Git blob 返回 `null`，其他来源错误继续抛出；高亮返回普通文本片段。
- 使用 pnpm 直接 tsx loader 运行三组纯策略测试，GREEN：9 passed，0 failed。
- 使用同一 loader 运行完整 `tests/knowledge/*.test.ts`，通过输出包含新增安全用例及全部既有前置用例，进程退出码为 0。

### 修复内容

- 新增 `lib/knowledge/asset-policy.ts`：无 `server-only`、无 Next/Auth 依赖的路径校验、附件引用授权与二进制读取策略。
- `getAssetForViewer` 只在笔记通过权限且 `analyzeMarkdown(note.markdown).assets` 确认引用目标附件后调用 `readBinary`。
- RouteContext 已解码时拒绝所有残余百分号、路径分隔符、控制字符、协议段及穿越段；不会二次解码。
- 仅缺失 Git blob（`知识库 Git 读取文件失败`）映射为 `null`；其他来源错误保留给上层处理。
- `getDetailForViewer` 已移入无服务端导入的 `access.ts`；`repository.ts` 仅负责 Auth 和快照适配。
- 搜索高亮改为 `{ text, matched }` 原文片段；按 NFKC（兼容形式）和大小写归一化确定原始文本范围，不再返回整篇正文。

### 最终检查

- `git diff --check`：通过。
- `tsc --noEmit`：本次修复后的唯一剩余报错为全局 `RouteContext` 不存在；该类型由 Next.js 的 `next dev`、`next build` 或 `next typegen` 自动生成，非本次策略代码错误。
