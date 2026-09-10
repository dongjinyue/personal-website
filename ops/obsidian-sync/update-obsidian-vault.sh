#!/usr/bin/env bash
set -Eeuo pipefail

readonly VAULT_DIR="${OBSIDIAN_VAULT_DIR:-/home/ubuntu/content/obsidian-vault}"

if [[ ! -d "${VAULT_DIR}/.git" ]]; then
  echo "知识库目录不是 Git 仓库：${VAULT_DIR}" >&2
  exit 1
fi

# 服务器是只读副本；出现本地修改时停止，避免覆盖未知内容。
if [[ -n "$(git -C "${VAULT_DIR}" status --porcelain --untracked-files=normal)" ]]; then
  echo '工作区存在本地修改，停止同步。' >&2
  exit 1
fi

git -C "${VAULT_DIR}" fetch --quiet origin main
git -C "${VAULT_DIR}" merge --ff-only --quiet origin/main

printf 'obsidian-vault synced to %s\n' "$(git -C "${VAULT_DIR}" rev-parse --short HEAD)"
