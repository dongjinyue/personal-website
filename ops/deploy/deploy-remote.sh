#!/usr/bin/env bash
set -euo pipefail

if [[ ${#} -ne 1 || -z ${1} ]]; then
  printf '用法：deploy-remote.sh <项目目录>（通过标准输入接收 Git bundle）\n' >&2
  exit 64
fi

repo_dir=$1
if [[ ! -d "$repo_dir/.git" ]]; then
  printf '部署失败：项目目录不是 Git 工作树：%s\n' "$repo_dir" >&2
  exit 1
fi

cd "$repo_dir"

if [[ "$(git branch --show-current)" != "main" ]]; then
  printf '部署失败：服务器项目必须位于 main 分支。\n' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  printf '部署失败：服务器工作树存在本地改动；为避免覆盖，已停止。\n' >&2
  git status --short >&2
  exit 1
fi

bundle_file=$(mktemp "${TMPDIR:-/tmp}/personal-website-deploy.XXXXXX.bundle")
trap 'rm -f "$bundle_file"' EXIT

# 代码包由 GitHub Actions 通过 SSH 标准输入传来，服务器无需连接 GitHub。
cat > "$bundle_file"
if [[ ! -s "$bundle_file" ]]; then
  printf '部署失败：没有收到 Git bundle。\n' >&2
  exit 1
fi

git bundle verify "$bundle_file"
git fetch --quiet "$bundle_file" refs/remotes/origin/main:refs/remotes/origin/main

# 只接受快进更新；服务器有独立提交时不自动合并或覆盖。
git merge --ff-only refs/remotes/origin/main

printf '开始部署提交：%s\n' "$(git rev-parse --short HEAD)"
bash ops/deploy/deploy.sh
