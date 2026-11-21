#!/usr/bin/env bash
# 旭日云课堂 · Linux 一键升级（在解压后的新发布包里运行）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${XURI_HOME:-/opt/xuri-classroom}"
SERVICE_NAME="${XURI_SERVICE:-xuri-classroom}"
BACKUP_DIR=""
DRY_RUN=0
FORCE=0
ASSUME_YES=0
SKIP_BACKUP=0
HEALTH_TIMEOUT="${XURI_HEALTH_TIMEOUT:-180}"

CUR_VERSION=""
NEW_VERSION=""
BACKUP_PATH=""
LOG_FILE=""
OLD_JAR=""

c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_cya=$'\033[36m'; c_rst=$'\033[0m'
say()  { printf '%s[升级]%s %s\n' "$c_cya" "$c_rst" "$*"; }
ok()   { printf '%s[完成]%s %s\n' "$c_grn" "$c_rst" "$*"; }
warn() { printf '%s[警告]%s %s\n' "$c_ylw" "$c_rst" "$*" >&2; }
die()  { printf '%s[中止]%s %s\n' "$c_red" "$c_rst" "$*" >&2; exit "${2:-1}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --service) SERVICE_NAME="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --whatif|--dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    --skip-backup) SKIP_BACKUP=1; shift ;;
    --health-timeout) HEALTH_TIMEOUT="$2"; shift 2 ;;
    -h|--help) sed -n '2,42p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "未知参数：$1（用 --help 查看用法）" ;;
  esac
done

env_get() {
  local file="$1" key="$2" value
  value=$(KEY="$key" awk -F= 'BEGIN{k=ENVIRON["KEY"]} $1==k{sub(/^[^=]*=/,"");print;exit}' "$file" 2>/dev/null || true)
  value=${value%$'\r'}
  case "$value" in \'*\') value=${value#\'}; value=${value%\'} ;; \"*\") value=${value#\"}; value=${value%\"} ;; esac
  printf '%s' "$value"
}

ver_cmp() {
  local a="${1#v}" b="${2#v}"
  if [[ "$a" == "$b" ]]; then echo 0; return; fi
  if ! [[ "$a" =~ ^[0-9]+(\.[0-9]+)*$ && "$b" =~ ^[0-9]+(\.[0-9]+)*$ ]]; then echo 2; return; fi
  local top; top=$(printf '%s\n%s\n' "$a" "$b" | sort -V | tail -n1)
  if [[ "$top" == "$a" ]]; then echo 1; else echo -1; fi
}

# 读"当前装的是哪个版本"：优先问正在跑的服务，其次读 jar 里的 application.yml
detect_installed_version() {
  local port body jar="$INSTALL_DIR/app.jar"
  port="$(env_get "$INSTALL_DIR/app.env" SERVER_PORT)"; port="${port:-8080}"
  body="$(curl -fsS --max-time 3 "http://127.0.0.1:$port/api/system/version" 2>/dev/null || true)"
  if [[ "$body" =~ \"version\":\"([^\"]+)\" ]]; then printf '%s' "${BASH_REMATCH[1]}"; return; fi
  if [[ -f "$jar" ]] && command -v unzip >/dev/null 2>&1; then
    local v
    v="$(unzip -p "$jar" BOOT-INF/classes/application.yml 2>/dev/null | awk '/^version:/{print $2; exit}' | tr -d '\r')"
    if [[ -n "$v" ]]; then printf '%s' "$v"; return; fi
  fi
  if [[ -f "$INSTALL_DIR/VERSION" ]]; then tr -d ' \r\n' < "$INSTALL_DIR/VERSION"; return; fi
  printf 'unknown'
}

preflight() {
  [[ $EUID -eq 0 ]] || die "请用 root 或 sudo 执行"
  command -v systemctl >/dev/null 2>&1 || die "找不到 systemctl（这套脚本只用于 systemd 安装）"
  command -v curl >/dev/null 2>&1 || die "需要 curl 做健康检查"

  [[ -f "$SCRIPT_DIR/VERSION" ]] || die "当前目录不是发布包（缺 VERSION）：$SCRIPT_DIR"
  NEW_VERSION="$(tr -d ' \r\n' < "$SCRIPT_DIR/VERSION")"
  [[ -n "$NEW_VERSION" ]] || die "发布包里的 VERSION 是空的"

  local jar=""
  jar="$(ls -1 "$SCRIPT_DIR"/app/xuri-classroom-*.jar 2>/dev/null | head -n1 || true)"
  [[ -n "$jar" ]] || die "发布包里没有 app/xuri-classroom-<版本>.jar，包不完整"

  if [[ ! -f "$INSTALL_DIR/app.jar" || ! -f "$INSTALL_DIR/app.env" ]] || ! systemctl list-unit-files "$SERVICE_NAME.service" >/dev/null 2>&1; then
    if [[ ! -f "$INSTALL_DIR/app.jar" || ! -f "$INSTALL_DIR/app.env" ]]; then
      cat >&2 <<EOF
${c_ylw}没有在 $INSTALL_DIR 找到已安装的实例。${c_rst}

这看起来是一次**全新安装**。全新安装请用包里的安装器（不会用到本脚本）：

  sudo bash install.sh --db-password '你的数据库密码' --init-db

如果你确实装过、只是装在别的目录，请加：--dir <安装目录>
EOF
      exit 2
    fi
  fi
  systemctl cat "$SERVICE_NAME.service" >/dev/null 2>&1 || die "找不到 systemd 服务 $SERVICE_NAME（用 --service 指定）"

  OLD_JAR="$INSTALL_DIR/app.jar"
  CUR_VERSION="$(detect_installed_version)"
}

confirm() {
  local cmp; cmp=$(ver_cmp "$NEW_VERSION" "$CUR_VERSION")
  say "已安装版本：$CUR_VERSION    发布包版本：$NEW_VERSION"
  if [[ "$cmp" == "0" && $FORCE -eq 0 ]]; then die "已经是 $NEW_VERSION 了。确实要重装请加 --force。"; fi
  if [[ "$cmp" == "-1" && $FORCE -eq 0 ]]; then die "发布包版本($NEW_VERSION) 低于已安装版本($CUR_VERSION)，默认拒绝降级。确实要降级请加 --force。"; fi
  if [[ "$cmp" == "2" ]]; then warn "已安装版本是 $CUR_VERSION，无法比较大小；将直接安装本包版本。"; fi

  echo
  say "====== 升级计划 ======"
  say "安装目录 : $INSTALL_DIR"
  say "服务名   : $SERVICE_NAME"
  say "版本     : $CUR_VERSION → $NEW_VERSION"
  say "备份位置 : ${BACKUP_DIR:-$INSTALL_DIR/backup}/upgrade-<时间>"
  if [[ $SKIP_BACKUP -eq 1 ]]; then warn "已指定 --skip-backup：本次没有备份还原点"; fi
  say "流程     : 停服务 → 备份 → 换 jar → 启动 → 校验（失败自动回滚）"
  say "======================"
  echo
  if [[ $DRY_RUN -eq 1 ]]; then say "--whatif：以上是计划，本次不做任何改动"; exit 0; fi
  if [[ $ASSUME_YES -eq 0 ]]; then
    read -r -p "确认继续？[y/N] " answer
    case "$answer" in y|Y|yes|YES) ;; *) die "已取消，没有做任何改动" ;; esac
  fi
}

do_backup() {
  if [[ $SKIP_BACKUP -eq 1 ]]; then warn "按 --skip-backup 跳过备份"; return 0; fi
  local stamp base db_host db_port db_name db_user db_pass
  stamp=$(date +%Y%m%d-%H%M%S)
  base="${BACKUP_DIR:-$INSTALL_DIR/backup}"
  BACKUP_PATH="$base/upgrade-$stamp"
  mkdir -p "$BACKUP_PATH"; chmod 700 "$BACKUP_PATH"

  db_host="$(env_get "$INSTALL_DIR/app.env" DB_HOST)"; db_host="${db_host:-127.0.0.1}"
  db_port="$(env_get "$INSTALL_DIR/app.env" DB_PORT)"; db_port="${db_port:-3306}"
  db_name="$(env_get "$INSTALL_DIR/app.env" DB_NAME)"; db_name="${db_name:-surveyking}"
  db_user="$(env_get "$INSTALL_DIR/app.env" DB_USER)"; db_user="${db_user:-root}"
  db_pass="$(env_get "$INSTALL_DIR/app.env" DB_PASSWORD)"

  command -v mysqldump >/dev/null 2>&1 || die "找不到 mysqldump（mysql 客户端）。请先安装：apt install mysql-client / dnf install mysql，或用 --skip-backup 明确跳过备份。"

  say "备份数据库 → $BACKUP_PATH/db.sql.gz"
  if ! MYSQL_PWD="$db_pass" mysqldump -h "$db_host" -P "$db_port" -u "$db_user" \
        --single-transaction --quick --routines --triggers --no-tablespaces \
        --default-character-set=utf8mb4 "$db_name" | gzip -6 > "$BACKUP_PATH/db.sql.gz"; then
    die "数据库导出失败。升级已中止，服务即将恢复启动。"
  fi
  gzip -t "$BACKUP_PATH/db.sql.gz" || die "备份文件校验失败（gzip -t）。升级已中止。"
  [[ -s "$BACKUP_PATH/db.sql.gz" ]] || die "备份文件是空的。升级已中止。"

  local files_dir tables
  files_dir="$(env_get "$INSTALL_DIR/app.env" FILE_STORAGE_LOCAL_ROOT_PATH)"; files_dir="${files_dir:-$INSTALL_DIR/files}"
  if [[ -d "$files_dir" ]]; then
    say "备份附件 → $BACKUP_PATH/files.tar.gz"
    tar czf "$BACKUP_PATH/files.tar.gz" -C "$files_dir" . 2>/dev/null || die "附件打包失败。升级已中止。"
  else
    warn "附件目录不存在（$files_dir），跳过"
  fi

  cp -p "$INSTALL_DIR/app.env" "$BACKUP_PATH/app.env"; chmod 600 "$BACKUP_PATH/app.env"
  cp -p "$OLD_JAR" "$BACKUP_PATH/app.jar" 2>/dev/null || warn "旧 jar 备份失败（继续）"

  tables=$(MYSQL_PWD="$db_pass" mysql -h "$db_host" -P "$db_port" -u "$db_user" -N -B \
      -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$db_name' AND table_type='BASE TABLE';" 2>/dev/null | tr -d '\r' | tail -n1 || true)

  {
    echo "from_version=$CUR_VERSION"
    echo "to_version=$NEW_VERSION"
    echo "created_at=$stamp"
    echo "install_dir=$INSTALL_DIR"
    echo "db_tables=${tables:-unknown}"
  } > "$BACKUP_PATH/manifest.txt"
  ok "备份完成：$BACKUP_PATH（表数 ${tables:-未知}）"
}

switch_and_start() {
  local new_jar
  new_jar="$(ls -1 "$SCRIPT_DIR"/app/xuri-classroom-*.jar | head -n1)"
  say "停止服务 $SERVICE_NAME"
  systemctl stop "$SERVICE_NAME.service" || die "停止服务失败"

  say "替换 jar（旧版本保留为 app.jar.bak.$CUR_VERSION）"
  cp -p "$OLD_JAR" "$INSTALL_DIR/app.jar.bak.$CUR_VERSION" 2>/dev/null || true
  install -m 0644 "$new_jar" "$INSTALL_DIR/app.jar" || die "写入 app.jar 失败"
  chown "$(stat -c '%U:%G' "$INSTALL_DIR/app.env")" "$INSTALL_DIR/app.jar" 2>/dev/null || true

  say "启动服务（首次启动会执行数据库结构迁移）"
  systemctl start "$SERVICE_NAME.service" || die "启动服务失败。查看：journalctl -u $SERVICE_NAME -n 100 --no-pager"
}

wait_healthy() {
  local port deadline body
  port="$(env_get "$INSTALL_DIR/app.env" SERVER_PORT)"; port="${port:-8080}"
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  say "等待 /api/system/version 返回 $NEW_VERSION 且库结构检查完成（最长 ${HEALTH_TIMEOUT}s）"
  while (( SECONDS < deadline )); do
    body="$(curl -fsS --max-time 5 "http://127.0.0.1:$port/api/system/version" 2>/dev/null || true)"
    if [[ "$body" == *"\"version\":\"$NEW_VERSION\""* && "$body" == *'"schemaStatus"'* ]]; then
      ok "服务已就绪：$body"
      return 0
    fi
    sleep 3
  done
  return 1
}

wait_healthy_any() {
  local port deadline body
  port="$(env_get "$INSTALL_DIR/app.env" SERVER_PORT)"; port="${port:-8080}"
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  while (( SECONDS < deadline )); do
    body="$(curl -fsS --max-time 5 "http://127.0.0.1:$port/api/system/version" 2>/dev/null || true)"
    [[ -n "$body" && "$body" == *'"schemaStatus"'* ]] && return 0
    sleep 3
  done
  return 1
}

rollback() {
  warn "新版本校验未通过，回滚到 $CUR_VERSION"
  systemctl stop "$SERVICE_NAME.service" >/dev/null 2>&1 || true
  if [[ -f "$INSTALL_DIR/app.jar.bak.$CUR_VERSION" ]]; then
    cp -p "$INSTALL_DIR/app.jar.bak.$CUR_VERSION" "$INSTALL_DIR/app.jar"
    systemctl start "$SERVICE_NAME.service" >/dev/null 2>&1 || true
    if wait_healthy_any; then
      printf '\n%s[已回滚]%s 服务已恢复到 %s；数据库结构未被破坏（迁移只做增量）。\n' "$c_ylw" "$c_rst" "$CUR_VERSION"
      printf '  日志：journalctl -u %s -n 100 --no-pager\n' "$SERVICE_NAME"
      printf '  备份：%s\n' "$BACKUP_PATH"
      exit 4
    fi
    printf '\n%s[回滚后仍不健康]%s 立即人工处理：\n' "$c_red" "$c_rst"
    printf '  1) journalctl -u %s -n 200 --no-pager\n' "$SERVICE_NAME"
    printf '  2) 恢复数据：见 %s/db.sql.gz 与 app.env（恢复前先停服务）\n' "$BACKUP_PATH"
    exit 5
  fi
  printf '\n%s[无法自动回滚]%s 找不到 app.jar.bak.%s\n' "$c_red" "$c_rst" "$CUR_VERSION"
  printf '  备份里保留了旧 jar：%s/app.jar\n' "$BACKUP_PATH"
  exit 5
}

main() {
  preflight
  [[ "$DRY_RUN" -eq 1 ]] || { mkdir -p "$INSTALL_DIR/logs"; LOG_FILE="$INSTALL_DIR/logs/upgrade-$(date +%Y%m%d-%H%M%S).log"; exec > >(tee -a "$LOG_FILE") 2>&1; }
  say "旭日云课堂 Linux 升级 · 日志：${LOG_FILE:-（预演，不写日志）}"
  confirm

  if ! do_backup; then
    warn "备份未完成，恢复启动旧版本"
    systemctl start "$SERVICE_NAME.service" >/dev/null 2>&1 || true
    die "升级中止：备份没有通过校验。"
  fi

  switch_and_start
  if wait_healthy; then
    echo
    ok "====== 升级成功 ======"
    ok "版本：$CUR_VERSION → $NEW_VERSION"
    ok "备份：$BACKUP_PATH"
    say "回滚：sudo cp $INSTALL_DIR/app.jar.bak.$CUR_VERSION $INSTALL_DIR/app.jar && sudo systemctl restart $SERVICE_NAME"
    exit 0
  fi

  journalctl -u "$SERVICE_NAME" -n 60 --no-pager 2>&1 || true
  rollback
}

main "$@"
