#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_UNDER_TEST="${1:?请传入同步脚本路径}"

if [[ ! -x "${SCRIPT_UNDER_TEST}" ]]; then
  echo "FAIL: 同步脚本不存在或不可执行：${SCRIPT_UNDER_TEST}" >&2
  exit 1
fi

readonly TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "${TEST_ROOT}"' EXIT

readonly REMOTE_REPO="${TEST_ROOT}/remote.git"
readonly SEED_REPO="${TEST_ROOT}/seed"
readonly VAULT_REPO="${TEST_ROOT}/vault"

git init --bare --initial-branch=main "${REMOTE_REPO}" >/dev/null
git init --initial-branch=main "${SEED_REPO}" >/dev/null
git -C "${SEED_REPO}" config user.name "Sync Test"
git -C "${SEED_REPO}" config user.email "sync-test@example.invalid"
printf '# 初始内容\n' > "${SEED_REPO}/README.md"
git -C "${SEED_REPO}" add README.md
git -C "${SEED_REPO}" commit -m "initial" >/dev/null
git -C "${SEED_REPO}" remote add origin "${REMOTE_REPO}"
git -C "${SEED_REPO}" push -u origin main >/dev/null
git clone "${REMOTE_REPO}" "${VAULT_REPO}" >/dev/null

# 这个分支用于捕获“错误覆盖服务器本地修改”的回归。
printf '本地修改\n' > "${VAULT_REPO}/local-only.md"
if OBSIDIAN_VAULT_DIR="${VAULT_REPO}" "${SCRIPT_UNDER_TEST}" >"${TEST_ROOT}/dirty.out" 2>&1; then
  echo 'FAIL: 工作区存在未跟踪文件时脚本仍然成功。' >&2
  exit 1
fi
grep -F '工作区存在本地修改，停止同步。' "${TEST_ROOT}/dirty.out" >/dev/null
rm "${VAULT_REPO}/local-only.md"

# 真实创建远程提交，验证脚本能完成快进同步，而不是只检查命令文本。
printf '# 远程更新\n' > "${SEED_REPO}/README.md"
git -C "${SEED_REPO}" add README.md
git -C "${SEED_REPO}" commit -m "update" >/dev/null
git -C "${SEED_REPO}" push >/dev/null

OBSIDIAN_VAULT_DIR="${VAULT_REPO}" "${SCRIPT_UNDER_TEST}" >"${TEST_ROOT}/sync.out"
test "$(git -C "${VAULT_REPO}" rev-parse HEAD)" = "$(git -C "${REMOTE_REPO}" rev-parse main)"
grep -E '^obsidian-vault synced to [0-9a-f]+$' "${TEST_ROOT}/sync.out" >/dev/null
test -z "$(git -C "${VAULT_REPO}" status --porcelain --untracked-files=normal)"

echo 'PASS: dirty-worktree guard and fast-forward sync'
