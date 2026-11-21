#!/usr/bin/env bash
# 旭日云课堂 · Docker 一键升级（在解压后的新发布包里运行）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${XURI_HOME:-/opt/xuri-classroom}"
BACKUP_DIR=""
DRY_RUN=0
FORCE=0
ASSUME_YES=0
SKIP_BACKUP=0
HEALTH_TIMEOUT="${XURI_HEALTH_TIMEOUT:-180}"

APP_REPO=""
CUR_VERSION=""
NEW_VERSION=""
BACKUP_PATH=""
LOG_FILE=""

c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_cya=$'\033[36m'; c_rst=$'\033[0m'
say()  { printf '%s[升级]%s %s\n' "$c_cya" "$c_rst" "$*"; }
ok()   { printf '%s[完成]%s %s\n' "$c_grn" "$c_rst" "$*"; }
warn() { printf '%s[警告]%s %s\n' "$c_ylw" "$c_rst" "$*" >&2; }
die()  { printf '%s[中止]%s %s\n' "$c_red" "$c_rst" "$*" >&2; exit "${2:-1}"; }

usage() { sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --whatif|--dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    --skip-backup) SKIP_BACKUP=1; shift ;;
    --health-timeout) HEALTH_TIMEOUT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数：$1（用 --help 查看用法）" ;;
  esac
done

# ---------- 小工具
env_get() {
  local file="$1" key="$2" value
  value=$(KEY="$key" awk -F= 'BEGIN{k=ENVIRON["KEY"]} $1==k{sub(/^[^=]*=/,"");print;exit}' "$file" 2>/dev/null || true)
  value=${value%$'\r'}
  case "$value" in \'*\') value=${value#\'}; value=${value%\'} ;; \"*\") value=${value#\"}; value=${value%\"} ;; esac
  printf '%s' "$value"
}

env_set() {
  local file="$1" key="$2" value="$3"
  KEY="$key" VAL="$value" awk -F= 'BEGIN{k=ENVIRON["KEY"];v=ENVIRON["VAL"]} $1==k{print k"="v;found=1;next}{print} END{if(!found)print k"="v}' \
    "$file" > "$file.tmp.$$" || die "写入 $file 失败"
  mv -f -- "$file.tmp.$$" "$file"
}

ver_cmp() {  # echo -1 / 0 / 1
  local a="${1#v}" b="${2#v}"
  if [[ "$a" == "$b" ]]; then echo 0; return; fi
  if ! [[ "$a" =~ ^[0-9]+(\.[0-9]+)*$ && "$b" =~ ^[0-9]+(\.[0-9]+)*$ ]]; then
    echo 2; return   # 2 = 无法比较（例如 latest）
  fi
  local top; top=$(printf '%s\n%s\n' "$a" "$b" | sort -V | tail -n1)
  if [[ "$top" == "$a" ]]; then echo 1; else echo -1; fi
}

dc() { ( cd "$INSTALL_DIR" && docker compose --env-file .env -f docker-compose.release.yml "$@" ); }

compose_container() {
  local svc="$1"
  ( cd "$INSTALL_DIR" && docker compose --env-file .env -f docker-compose.release.yml ps -q "$svc" 2>/dev/null | head -n1 )
}

# ---------- 1. 身份检测
preflight() {
  command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
  docker info >/dev/null 2>&1 || die "docker 守护进程不可用（当前用户没权限？用 sudo）"

  [[ -f "$SCRIPT_DIR/VERSION" ]] || die "当前目录不是发布包（缺 VERSION）：$SCRIPT_DIR"
  NEW_VERSION="$(tr -d ' \r\n' < "$SCRIPT_DIR/VERSION")"
  [[ -n "$NEW_VERSION" ]] || die "发布包里的 VERSION 是空的"

  if [[ ! -f "$INSTALL_DIR/docker-compose.release.yml" || ! -f "$INSTALL_DIR/.env" ]]; then
    cat >&2 <<EOF
${c_ylw}没有在 $INSTALL_DIR 找到已安装的实例。${c_rst}

这看起来是一次**全新部署**。全新部署请按 README 的步骤来（不会用到本脚本）：

  mkdir -p $INSTALL_DIR && cd $INSTALL_DIR
  把 docker-compose.release.yml、.env.example、init-mysql.sql 放进来
  cp .env.example .env && vi .env        # 填 DB_PASSWORD / JWT_SECRET
  docker compose --env-file .env -f docker-compose.release.yml up -d

如果你确实已经装过、只是装在别的目录，请加：--dir <安装目录>
EOF
    exit 2
  fi

  command -v curl >/dev/null 2>&1 || die "需要 curl 做健康检查（apt install curl / dnf install curl）"
  docker volume inspect xuri-classroom-db-data >/dev/null 2>&1 || die "找不到数据卷 xuri-classroom-db-data —— 可能不是这套 compose 部署的实例"
  docker volume inspect xuri-classroom-app-files >/dev/null 2>&1 || warn "找不到附件卷 xuri-classroom-app-files（附件备份会跳过）"

  CUR_VERSION="$(env_get "$INSTALL_DIR/.env" VERSION)"
  CUR_VERSION="${CUR_VERSION:-latest}"
  APP_REPO="$(env_get "$INSTALL_DIR/.env" XURI_IMAGE)"
  APP_REPO="${APP_REPO:-ghcr.io/hermannmayer/xuri-classroom}"
}

# ---------- 2. 版本比较与确认
confirm() {
  local cmp; cmp=$(ver_cmp "$NEW_VERSION" "$CUR_VERSION")
  say "已安装版本：$CUR_VERSION    发布包版本：$NEW_VERSION"
  if [[ "$cmp" == "0" && $FORCE -eq 0 ]]; then
    die "已经是 $NEW_VERSION 了。确实要重装请加 --force。"
  fi
  if [[ "$cmp" == "-1" && $FORCE -eq 0 ]]; then
    die "发布包版本($NEW_VERSION) 低于已安装版本($CUR_VERSION)，默认拒绝降级。确实要降级请加 --force。"
  fi
  if [[ "$cmp" == "2" ]]; then
    warn "已安装版本是 $CUR_VERSION（不是 x.y.z），无法比较大小；将直接按发布包版本安装。"
  fi

  echo
  say "====== 升级计划 ======"
  say "安装目录     : $INSTALL_DIR"
  say "镜像仓库     : $APP_REPO"
  say "版本         : $CUR_VERSION → $NEW_VERSION"
  say "备份位置     : ${BACKUP_DIR:-$INSTALL_DIR/backup}/upgrade-<时间>"
  if [[ $SKIP_BACKUP -eq 1 ]]; then warn "已指定 --skip-backup：本次没有备份还原点"; fi
  say "流程         : 停应用 → 备份 → 构建新镜像 → 启动 → 校验（失败自动回滚）"
  say "不会执行     : docker compose down -v（任何删卷动作都没有）"
  say "======================"
  echo

  if [[ $DRY_RUN -eq 1 ]]; then
    say "--whatif：以上是计划，本次不做任何改动"
    exit 0
  fi
  if [[ $ASSUME_YES -eq 0 ]]; then
    read -r -p "确认继续？[y/N] " answer
    case "$answer" in y|Y|yes|YES) ;; *) die "已取消，没有做任何改动" ;; esac
  fi
}

# ---------- 3. 备份
do_backup() {
  if [[ $SKIP_BACKUP -eq 1 ]]; then
    warn "按 --skip-backup 跳过备份"
    return 0
  fi
  local stamp base
  stamp=$(date +%Y%m%d-%H%M%S)
  base="${BACKUP_DIR:-$INSTALL_DIR/backup}"
  BACKUP_PATH="$base/upgrade-$stamp"
  mkdir -p "$BACKUP_PATH"
  chmod 700 "$BACKUP_PATH"

  say "备份数据库 → $BACKUP_PATH/db.sql.gz"
  if ! dc exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --triggers --no-tablespaces "$MYSQL_DATABASE"' \
        | gzip -6 > "$BACKUP_PATH/db.sql.gz"; then
    die "数据库导出失败。升级已中止，服务即将恢复启动。"
  fi
  gzip -t "$BACKUP_PATH/db.sql.gz" || die "备份文件校验失败（gzip -t）。升级已中止。"
  [[ -s "$BACKUP_PATH/db.sql.gz" ]] || die "备份文件是空的。升级已中止。"

  local tables
  tables=$(dc exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"$MYSQL_DATABASE\" AND table_type=\"BASE TABLE\";"' 2>/dev/null | tr -d '\r' | tail -n1)
  say "数据库表数：${tables:-未知}"

  if docker volume inspect xuri-classroom-app-files >/dev/null 2>&1; then
    say "备份附件卷 → $BACKUP_PATH/files.tar.gz"
    if ! docker run --rm -v xuri-classroom-app-files:/files:ro -v "$BACKUP_PATH":/backup mysql:8.0 \
          tar czf /backup/files.tar.gz -C /files . ; then
      die "附件打包失败。升级已中止（数据库备份已在 $BACKUP_PATH）。"
    fi
    [[ -s "$BACKUP_PATH/files.tar.gz" ]] || warn "附件备份是空的（可能确实没有附件）"
  else
    warn "没有附件卷，跳过附件备份"
  fi

  cp -p "$INSTALL_DIR/.env" "$BACKUP_PATH/app.env"
  chmod 600 "$BACKUP_PATH/app.env"

  {
    echo "from_version=$CUR_VERSION"
    echo "to_version=$NEW_VERSION"
    echo "created_at=$stamp"
    echo "install_dir=$INSTALL_DIR"
    echo "db_tables=${tables:-unknown}"
  } > "$BACKUP_PATH/manifest.txt"

  ok "备份完成：$BACKUP_PATH"
}

# ---------- 4. 换镜像 + 启动
switch_and_start() {
  local old_image_id
  old_image_id="$(compose_container app)"
  if [[ -n "$old_image_id" ]]; then
    old_image_id="$(docker inspect -f '{{.Image}}' "$old_image_id" 2>/dev/null || true)"
  fi

  say "停止应用（数据库保持运行）"
  dc stop app >/dev/null 2>&1 || true

  say "用包内 jar 构建镜像 $APP_REPO:$NEW_VERSION"
  docker build -f "$SCRIPT_DIR/Dockerfile.runtime" -t "$APP_REPO:$NEW_VERSION" "$SCRIPT_DIR" >/dev/null \
    || die "镜像构建失败。服务仍是旧版本，可手工 docker compose --env-file .env -f docker-compose.release.yml up -d app 恢复。"

  if [[ -n "$old_image_id" ]]; then
    docker tag "$old_image_id" "$APP_REPO:previous" 2>/dev/null || warn "记录 :previous 失败（自动回滚将不可用）"
    say "已记录旧镜像为 $APP_REPO:previous"
  fi

  say "切换 .env 的 VERSION=$NEW_VERSION"
  env_set "$INSTALL_DIR/.env" VERSION "$NEW_VERSION"

  say "启动应用（首次启动会执行数据库结构迁移）"
  dc up -d app >/dev/null || die "启动失败。请查看：docker compose --env-file .env -f docker-compose.release.yml logs --tail=100 app"
}

# ---------- 5. 健康检查
wait_healthy() {
  local port deadline body
  port="$(env_get "$INSTALL_DIR/.env" APP_PORT)"; port="${port:-8080}"
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  say "等待 /api/system/version 返回 $NEW_VERSION 且库结构检查完成（最长 ${HEALTH_TIMEOUT}s）"
  while (( SECONDS < deadline )); do
    body="$(curl -fsS --max-time 5 "http://127.0.0.1:$port/api/system/version" 2>/dev/null || true)"
    if [[ "$body" == *"\"version\":\"$NEW_VERSION\""* && "$body" == *'"schemaStatus"'* ]]; then
      ok "应用已就绪：$body"
      return 0
    fi
    sleep 3
  done
  return 1
}

# ---------- 6. 回滚
rollback() {
  warn "新版本校验未通过，开始回滚到 $CUR_VERSION"
  dc stop app >/dev/null 2>&1 || true
  if docker image inspect "$APP_REPO:previous" >/dev/null 2>&1; then
    docker tag "$APP_REPO:previous" "$APP_REPO:$CUR_VERSION" 2>/dev/null || true
    env_set "$INSTALL_DIR/.env" VERSION "$CUR_VERSION"
    dc up -d app >/dev/null 2>&1 || true
    if wait_healthy_any; then
      printf '\n%s[已回滚]%s 服务已恢复到 %s；数据库结构未被破坏（迁移只做增量）。\n' "$c_ylw" "$c_rst" "$CUR_VERSION"
      printf '  查看日志：cd %s && docker compose logs --tail=100 app\n' "$INSTALL_DIR"
      printf '  备份位置：%s\n' "$BACKUP_PATH"
      exit 4
    fi
    printf '\n%s[回滚后仍不健康]%s 立即人工处理：\n' "$c_red" "$c_rst"
    printf '  1) docker compose -f %s/docker-compose.release.yml logs --tail=200 app\n' "$INSTALL_DIR"
    printf '  2) 如需恢复数据：见 %s/app.env 与 db.sql.gz（恢复前先停应用）\n' "$BACKUP_PATH"
    exit 5
  fi
  printf '\n%s[无法自动回滚]%s 找不到 %s:previous。\n' "$c_red" "$c_rst" "$APP_REPO"
  printf '  手工恢复：把 .env 的 VERSION 改回 %s，然后 docker compose up -d app\n' "$CUR_VERSION"
  printf '  数据备份：%s\n' "$BACKUP_PATH"
  exit 5
}

wait_healthy_any() {
  local port deadline body
  port="$(env_get "$INSTALL_DIR/.env" APP_PORT)"; port="${port:-8080}"
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  while (( SECONDS < deadline )); do
    body="$(curl -fsS --max-time 5 "http://127.0.0.1:$port/api/system/version" 2>/dev/null || true)"
    [[ -n "$body" && "$body" == *'"schemaStatus"'* ]] && return 0
    sleep 3
  done
  return 1
}

# ---------- main
main() {
  preflight
  [[ "$DRY_RUN" -eq 1 ]] || { mkdir -p "$INSTALL_DIR/logs"; LOG_FILE="$INSTALL_DIR/logs/upgrade-$(date +%Y%m%d-%H%M%S).log"; exec > >(tee -a "$LOG_FILE") 2>&1; }
  say "旭日云课堂 Docker 升级 · 日志：${LOG_FILE:-（预演，不写日志）}"
  confirm

  if ! do_backup; then
    warn "备份未完成，恢复启动旧版本"
    dc up -d app >/dev/null 2>&1 || true
    die "升级中止：备份没有通过校验。"
  fi

  switch_and_start
  if wait_healthy; then
    echo
    ok "====== 升级成功 ======"
    ok "版本：$CUR_VERSION → $NEW_VERSION"
    ok "备份：$BACKUP_PATH"
    say "回滚：把 $INSTALL_DIR/.env 的 VERSION 改回 $CUR_VERSION，再 docker compose up -d app"
    exit 0
  fi

  dc logs --tail=60 app 2>&1 || true
  rollback
}

main "$@"
