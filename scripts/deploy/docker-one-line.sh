#!/usr/bin/env bash
# ============================================================
# 旭日云课堂 · Docker 一键部署
#
# 用法：
#   curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo bash
#
# 可用环境变量（写在 sudo 后面才会被保留）：
#   XURI_HOME      安装目录，默认 /opt/xuri-classroom
#   APP_PORT       对外端口，默认 8080（仅首次生成 .env 时生效）
#   VERSION        镜像 tag，默认 latest（仅首次生成 .env 时生效）
#   XURI_RAW_BASE  GitHub raw 前缀，默认 official 仓库 main 分支（fork/镜像时覆盖）
#
# 说明：
#   · 首次运行：建目录、下载 compose 与 init-mysql.sql、生成随机密码的 .env、启动
#   · 重复运行：保留 .env 与数据卷，只更新 compose 文件后 up -d
#   · 本脚本绝不执行 docker compose down -v，不会删除数据库或上传文件
#   · 需要 root、docker、docker compose v2；不会自动安装任何软件包
# ============================================================
set -euo pipefail

RAW_BASE="${XURI_RAW_BASE:-https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main}"
XURI_HOME="${XURI_HOME:-/opt/xuri-classroom}"
APP_PORT="${APP_PORT:-8080}"
VERSION="${VERSION:-latest}"

COMPOSE_URL="$RAW_BASE/docker/docker-compose.release.yml"
ENV_URL="$RAW_BASE/docker/.env.example"
INIT_SQL_URL="$RAW_BASE/server/rdbms/src/main/resources/scripts/init-mysql.sql"

COMPOSE_FILE="$XURI_HOME/docker-compose.release.yml"
ENV_FILE="$XURI_HOME/.env"
INIT_SQL_FILE="$XURI_HOME/init-mysql.sql"

DB_VOLUME="xuri-classroom-db-data"
APP_VOLUME="xuri-classroom-app-files"

FIRST_RUN=0
DB_VOLUME_EXISTS=0
CLEANUP_FILES=()

die() { printf '[错误] %s\n' "$*" >&2; exit 1; }
warn() { printf '[警告] %s\n' "$*" >&2; }
info() { printf '[信息] %s\n' "$*"; }
ok() { printf '[完成] %s\n' "$*"; }

cleanup() {
  local f
  if [[ ${#CLEANUP_FILES[@]} -gt 0 ]]; then
    for f in "${CLEANUP_FILES[@]}"; do
      if [[ -n "$f" ]]; then
        rm -rf -- "$f" 2>/dev/null || true
      fi
    done
  fi
}
trap cleanup EXIT

usage() {
  cat <<'USAGE'
旭日云课堂 · Docker 一键部署

用法：
  curl -fsSL <脚本地址> | sudo bash

可覆盖的环境变量：
  XURI_HOME      安装目录，默认 /opt/xuri-classroom
  APP_PORT       对外端口，默认 8080（仅首次生成 .env 时生效）
  VERSION        镜像 tag，默认 latest（仅首次生成 .env 时生效）
  XURI_RAW_BASE  GitHub raw 前缀（fork 或镜像源时使用）

示例：
  curl -fsSL .../docker-one-line.sh | sudo XURI_HOME=/opt/xuri APP_PORT=9090 bash

说明：
  · 重复执行是幂等的：保留 .env 与数据卷，只更新 compose 文件并 up -d
  · 首次启动会自动生成 DB_PASSWORD / JWT_SECRET
  · 不会执行 docker compose down -v；卸载命令见脚本末尾输出
USAGE
}

normalize_home() {
  if [[ -z "$XURI_HOME" ]]; then
    die "XURI_HOME 不能为空"
  fi
  if [[ "$XURI_HOME" != /* ]]; then
    die "XURI_HOME 必须是绝对路径：$XURI_HOME"
  fi
  case "$XURI_HOME" in
    *$'\n'*|*$'\r'*) die "XURI_HOME 不能包含换行" ;;
  esac
  if command -v readlink >/dev/null 2>&1; then
    XURI_HOME=$(readlink -m -- "$XURI_HOME" 2>/dev/null || printf '%s' "$XURI_HOME")
  fi
  while [[ "$XURI_HOME" == */ && "$XURI_HOME" != "/" ]]; do
    XURI_HOME="${XURI_HOME%/}"
  done
  COMPOSE_FILE="$XURI_HOME/docker-compose.release.yml"
  ENV_FILE="$XURI_HOME/.env"
  INIT_SQL_FILE="$XURI_HOME/init-mysql.sql"
  case "$XURI_HOME" in
    /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/proc|/root|/run|/sbin|/srv|/sys|/tmp|/usr|/var)
      die "XURI_HOME 不能是系统目录：$XURI_HOME" ;;
  esac
}

validate_args() {
  if [[ ! "$APP_PORT" =~ ^[0-9]+$ ]]; then
    die "APP_PORT 必须是数字：$APP_PORT"
  fi
  if (( APP_PORT < 1 || APP_PORT > 65535 )); then
    die "APP_PORT 超出范围（1-65535）：$APP_PORT"
  fi
  if [[ ! "$VERSION" =~ ^[A-Za-z0-9._-]{1,64}$ ]]; then
    die "VERSION 不合法（只允许字母、数字、点、下划线、短横线）：$VERSION"
  fi
}

check_root() {
  if [[ $EUID -ne 0 ]]; then
    die "请用 root 或 sudo 执行，例如：
  curl -fsSL <脚本地址> | sudo bash"
  fi
}

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    die "未检测到 docker。请先安装 Docker Engine（Ubuntu/Debian 见 https://docs.docker.com/engine/install/；RHEL/CentOS 可用 dnf install docker-ce），并启动 docker 服务后重试。本脚本不会自动安装软件包。"
  fi
  if ! docker info >/dev/null 2>&1; then
    die "docker 已安装，但守护进程不可用。请先启动：sudo systemctl start docker（并确认当前用户有 docker 权限），然后重试。"
  fi
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    die "检测到旧版 docker-compose（v1）。本编排需要 Docker Compose v2（docker compose 子命令）。请升级 Docker 或安装 docker-compose-plugin 后重试。"
  fi
  die "未检测到 Docker Compose v2。请安装 docker-compose-plugin（或新版 Docker Engine 自带的 compose 插件）后重试。"
}

download_file() {
  local url="$1" dest="$2" tmp
  tmp="$dest.tmp.$$"
  if command -v curl >/dev/null 2>&1; then
    if curl -fsSL --retry 3 --connect-timeout 15 --max-time 120 -o "$tmp" "$url"; then
      mv -f -- "$tmp" "$dest"
      return 0
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -q --tries=3 --timeout=15 -O "$tmp" "$url"; then
      mv -f -- "$tmp" "$dest"
      return 0
    fi
  else
    die "下载需要 curl 或 wget，当前都没有。请先安装 curl（apt install curl / dnf install curl）后重试。"
  fi
  rm -f -- "$tmp" 2>/dev/null || true
  return 1
}

env_get() {
  local file="$1" key="$2" value
  value=$(KEY="$key" awk -F= '
    BEGIN { k = ENVIRON["KEY"] }
    $1 == k { sub(/^[^=]*=/, ""); print; exit }
  ' "$file" 2>/dev/null || true)
  value=${value%$'\r'}
  case "$value" in
    \'*\') value=${value#\'}; value=${value%\'} ;;
    \"*\") value=${value#\"}; value=${value%\"} ;;
  esac
  printf '%s' "$value"
}

env_set() {
  local file="$1" key="$2" value="$3"
  case "$value" in
    *$'\n'*|*$'\r'*) die "配置项 $key 的取值不能包含换行" ;;
  esac
  KEY="$key" VAL="$value" awk -F= '
    BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"] }
    $1 == k { print k "=" v; found = 1; next }
    { print }
    END { if (!found) print k "=" v }
  ' "$file" > "$file.tmp.$$" || die "写入配置失败：$file"
  mv -f -- "$file.tmp.$$" "$file" || die "写入配置失败：$file"
}

env_ensure() {
  local file="$1" key="$2" value="$3" current
  current=$(env_get "$file" "$key")
  if [[ -z "$current" ]]; then
    env_set "$file" "$key" "$value"
  fi
}

random_hex() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    head -c "$bytes" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

random_b64() {
  local bytes="$1" value=""
  if command -v openssl >/dev/null 2>&1; then
    value=$(openssl rand -base64 "$bytes" 2>/dev/null | tr -d '\n' || true)
  fi
  if [[ -z "$value" ]] && command -v base64 >/dev/null 2>&1; then
    value=$(head -c "$bytes" /dev/urandom | base64 | tr -d '\n' || true)
  fi
  if [[ -z "$value" ]]; then
    value=$(random_hex "$bytes")
  fi
  printf '%s' "$value"
}

prepare_dirs() {
  mkdir -p -- "$XURI_HOME" || die "创建目录失败：$XURI_HOME"
  chmod 0750 -- "$XURI_HOME" 2>/dev/null || true
}

download_compose() {
  info "更新编排文件：$COMPOSE_FILE"
  local tmp="$COMPOSE_FILE.new.$$"
  if download_file "$COMPOSE_URL" "$tmp"; then
    mv -f -- "$tmp" "$COMPOSE_FILE" || die "保存 compose 文件失败：$COMPOSE_FILE"
    ok "compose 文件已更新"
    return 0
  fi
  if [[ -f "$COMPOSE_FILE" ]]; then
    warn "下载 compose 文件失败，沿用已有文件：$COMPOSE_FILE"
    return 0
  fi
  die "无法下载 compose 文件。请检查网络/代理，或手动下载后放到 $COMPOSE_FILE：
  $COMPOSE_URL"
}

download_init_sql() {
  info "更新数据库初始化脚本：$INIT_SQL_FILE"
  local tmp="$INIT_SQL_FILE.new.$$"
  if download_file "$INIT_SQL_URL" "$tmp"; then
    mv -f -- "$tmp" "$INIT_SQL_FILE" || die "保存 init-mysql.sql 失败"
    ok "init-mysql.sql 已更新"
    return 0
  fi
  if [[ -f "$INIT_SQL_FILE" ]]; then
    warn "下载 init-mysql.sql 失败，沿用已有文件"
    return 0
  fi
  die "无法下载 init-mysql.sql（首次启动建库需要）。请检查网络，或手动下载后放到 $INIT_SQL_FILE：
  $INIT_SQL_URL"
}

prepare_env() {
  if [[ -f "$ENV_FILE" ]]; then
    info "检测到已有 .env，保留数据库密码与 JWT 密钥"
    env_ensure "$ENV_FILE" APP_PORT "$APP_PORT"
    env_ensure "$ENV_FILE" VERSION "$VERSION"
    env_ensure "$ENV_FILE" DB_NAME "surveyking"
    env_ensure "$ENV_FILE" DB_USER "xuri"
    local dbp jwt
    dbp=$(env_get "$ENV_FILE" DB_PASSWORD)
    jwt=$(env_get "$ENV_FILE" JWT_SECRET)
    if [[ -z "$dbp" ]]; then
      env_set "$ENV_FILE" DB_PASSWORD "$(random_hex 24)"
      warn "已有 .env 里 DB_PASSWORD 为空，已生成新密码（数据库尚未初始化时可用）"
    elif [[ "$dbp" == "change-me" ]]; then
      warn "现有 .env 的 DB_PASSWORD 仍是 change-me，请尽快修改（数据卷已初始化后需同步改 MySQL 用户）"
    fi
    if [[ -z "$jwt" ]]; then
      env_set "$ENV_FILE" JWT_SECRET "$(random_b64 48)"
      warn "已有 .env 里 JWT_SECRET 为空，已生成新密钥（已登录用户需要重新登录）"
    elif [[ "$jwt" == "change-me" ]]; then
      warn "现有 .env 的 JWT_SECRET 仍是 change-me，请尽快修改"
    fi
    chmod 0600 -- "$ENV_FILE"
    return 0
  fi

  FIRST_RUN=1
  info "首次运行：生成 $ENV_FILE"
  local tmp_template=""
  tmp_template=$(mktemp) || die "mktemp 失败"
  CLEANUP_FILES+=("$tmp_template")
  if download_file "$ENV_URL" "$tmp_template"; then
    cp -f -- "$tmp_template" "$ENV_FILE" || die "创建 .env 失败"
  else
    warn "无法下载 .env.example，将生成最小配置；完整模板见：$ENV_URL"
    {
      printf '# 旭日云课堂 · Docker 环境变量（脚本生成）\n'
      printf '# 完整模板：%s\n' "$ENV_URL"
      printf 'APP_PORT=%s\n' "$APP_PORT"
      printf 'DB_NAME=surveyking\n'
      printf 'DB_USER=xuri\n'
      printf 'DB_PASSWORD=\n'
      printf 'JWT_SECRET=\n'
      printf 'VERSION=%s\n' "$VERSION"
    } > "$ENV_FILE" || die "创建 .env 失败"
  fi

  chmod 0600 -- "$ENV_FILE"
  env_set "$ENV_FILE" APP_PORT "$APP_PORT"
  env_set "$ENV_FILE" VERSION "$VERSION"
  env_set "$ENV_FILE" DB_PASSWORD "$(random_hex 24)"
  env_set "$ENV_FILE" JWT_SECRET "$(random_b64 48)"
  env_ensure "$ENV_FILE" DB_NAME "surveyking"
  env_ensure "$ENV_FILE" DB_USER "xuri"
  chmod 0600 -- "$ENV_FILE"
  ok "已生成 .env（随机数据库密码与 JWT 密钥，权限 0600）"
}

load_env_exports() {
  local key value
  for key in APP_PORT VERSION DB_NAME DB_USER DB_PASSWORD JWT_SECRET; do
    value=$(env_get "$ENV_FILE" "$key")
    if [[ -n "$value" ]]; then
      export "$key=$value"
    fi
  done
  APP_PORT=$(env_get "$ENV_FILE" APP_PORT)
  VERSION=$(env_get "$ENV_FILE" VERSION)
  if [[ -z "$APP_PORT" || ! "$APP_PORT" =~ ^[0-9]+$ ]]; then
    die ".env 里的 APP_PORT 无效：${APP_PORT:-空}"
  fi
}

compose() {
  cd "$XURI_HOME"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

start_stack() {
  info "拉取镜像（app: $VERSION）"
  if ! compose pull; then
    warn "镜像拉取失败（网络/镜像源/未登录 GHCR）。若本机已有镜像，将继续尝试启动。"
  fi
  info "启动容器"
  if ! compose up -d; then
    die "启动失败。排查建议：
  cd $XURI_HOME && docker compose -f docker-compose.release.yml logs --tail=100
  国内网络可改 .env 的 XURI_IMAGE 为镜像源后再试。"
  fi
  ok "容器已启动"
}

print_summary() {
  local ip
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  if [[ -z "$ip" ]]; then ip="<服务器IP>"; fi
  printf '\n================ 部署完成 ================\n'
  printf '访问地址：http://%s:%s\n' "$ip" "$APP_PORT"
  printf '安装目录：%s\n' "$XURI_HOME"
  printf '编排文件：%s\n' "$COMPOSE_FILE"
  printf '配置文件：%s（权限 0600，含数据库密码与 JWT 密钥）\n' "$ENV_FILE"
  printf '数据卷  ：%s / %s\n' "$DB_VOLUME" "$APP_VOLUME"
  if [[ $FIRST_RUN -eq 1 && $DB_VOLUME_EXISTS -eq 0 ]]; then
    printf '\n首次初始化数据库已完成（init-mysql.sql），初始账号：admin / 123456\n登录后请立即修改密码。\n'
  fi
  printf '\n常用命令：\n'
  printf '  状态    ：cd %q && docker compose -f docker-compose.release.yml ps\n' "$XURI_HOME"
  printf '  日志    ：cd %q && docker compose -f docker-compose.release.yml logs -f app\n' "$XURI_HOME"
  printf '  重启    ：cd %q && docker compose -f docker-compose.release.yml restart app\n' "$XURI_HOME"
  printf '  升级    ：修改 %s 里的 VERSION 后重跑本脚本，或\n' "$ENV_FILE"
  printf '            cd %q && docker compose pull app && docker compose up -d app\n' "$XURI_HOME"
  printf '  卸载    ：cd %q && docker compose -f docker-compose.release.yml down\n' "$XURI_HOME"
  printf '  彻底删除：cd %q && docker compose -f docker-compose.release.yml down -v\n' "$XURI_HOME"
  printf '            （-v 会删除数据库与上传文件，务必先备份）\n'
  printf '==========================================\n'
}

main() {
  if [[ ${#} -gt 0 ]]; then
    case "$1" in
      --help|-h) usage; exit 0 ;;
      *) die "不支持参数：$1（用 --help 查看用法）" ;;
    esac
  fi

  check_root
  normalize_home
  validate_args
  check_docker

  if docker volume inspect "$DB_VOLUME" >/dev/null 2>&1; then
    DB_VOLUME_EXISTS=1
  fi

  prepare_dirs
  download_compose
  download_init_sql
  prepare_env
  load_env_exports
  start_stack
  print_summary
}

if [[ "${BASH_SOURCE[0]:-}" == "$0" ]]; then
  main "$@"
fi
