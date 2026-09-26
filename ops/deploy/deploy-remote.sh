#!/usr/bin/env bash
set -euo pipefail

if [[ ${#} -ne 1 || -z ${1} ]]; then
  printf '用法：deploy-remote.sh <项目目录>\n' >&2
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

# 只接受快进更新；服务器有独立提交时不自动合并或覆盖。
git fetch --quiet origin main
git pull --ff-only origin main

printf '开始部署提交：%s\n' "$(git rev-parse --short HEAD)"
bash ops/deploy/deploy.sh
