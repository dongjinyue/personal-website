#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
healthcheck_url=${DEPLOY_HEALTHCHECK_URL:-http://127.0.0.1:3000/}
healthcheck_attempts=${DEPLOY_HEALTHCHECK_ATTEMPTS:-30}
healthcheck_interval=${DEPLOY_HEALTHCHECK_INTERVAL:-2}

cd "$repo_dir"
printf '安装锁定依赖……\n'
npm ci

printf '构建生产版本……\n'
npm run build

printf '重启 personal-website.service……\n'
sudo -n systemctl restart personal-website.service

printf '检查网站健康状态：%s\n' "$healthcheck_url"
for ((attempt = 1; attempt <= healthcheck_attempts; attempt += 1)); do
  if curl --fail --silent --show-error --output /dev/null "$healthcheck_url"; then
    printf '部署成功：网站健康检查通过（第 %s 次）。\n' "$attempt"
    exit 0
  fi

  if (( attempt < healthcheck_attempts )); then
    sleep "$healthcheck_interval"
  fi
done

printf '部署失败：网站在 %s 次尝试后仍未通过健康检查。\n' "$healthcheck_attempts" >&2
exit 1
