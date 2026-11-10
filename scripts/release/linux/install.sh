#!/usr/bin/env bash
# ============================================================
# 旭日云课堂 · Linux 安装器（systemd 直装）
#
# 用法：
#   sudo bash install.sh --db-password '数据库密码' --init-db
#   sudo bash install.sh --help
#
# 说明：
#   · 安装包不内置 JRE。默认使用系统 java；没有 java 时会给出安装提示，
#     也可以加 --download-jre 从国内镜像下载 Temurin JRE 8 到安装目录。
#   · 幂等：重复执行会保留已有的 app.env 与 SK_JWT_SECRET，只更新命令行
#     显式给出的值，并重启服务。升级时用新包里的 install.sh 再跑一次即可。
#   · 只支持 bash；请勿使用 sh install.sh。
# ============================================================
set -euo pipefail

SERVICE_NAME="xuri-classroom"
INSTALL_DIR="/opt/xuri-classroom"
RUN_USER="xuri"
SERVER_PORT="8080"
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="surveyking"
DB_USER="surveyking"
DB_PASSWORD="${XURI_DB_PASSWORD:-}"
DB_ADMIN_USER="root"
DB_ADMIN_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
INIT_DB=0
USE_SYSTEMD=1
FORCE_SYSTEM_JAVA=0
DOWNLOAD_JRE=0
ASSUME_YES=0
PORT_SET=0
DB_HOST_SET=0
DB_PORT_SET=0
DB_NAME_SET=0
DB_USER_SET=0
DB_PASSWORD_SET=0
READY_TIMEOUT="${XURI_READY_TIMEOUT:-60}"

# 自动下载 JRE 使用的版本与镜像（x86_64 Linux）。如需换版本，改这里即可。
JRE_VERSION="8u512b09"
JRE_TARBALL="OpenJDK8U-jre_x64_linux_hotspot_${JRE_VERSION}.tar.gz"
# 官方 Temurin 8u512-b09 JRE（x86_64，约 39.9MB）的 SHA256，下载后强制校验
JRE_SHA256="57468dc8bfd71dd0578d9717e63a8c13b9efe0a2f2c85c2a13966d1c0f9b1e5f"
JRE_URLS=(
  "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/8/jre/x64/linux/${JRE_TARBALL}"
  "https://mirrors.nju.edu.cn/adoptium/8/jre/x64/linux/${JRE_TARBALL}"
)

SCRIPT_DIR=""
PKG_JAR=""
INIT_SQL=""
ENV_FILE=""
UNIT_FILE="/etc/systemd/system/xuri-classroom.service"
RUN_GROUP=""
JAVA_SRC=""
JAVA_BIN=""
RUNTIME_JAVA=0
ENV_EXISTS=0
FINAL_PORT=""
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
旭日云课堂 · Linux 安装器

用法：
  sudo bash install.sh [选项]

常用选项：
  --db-password <密码>      应用连接数据库的密码（必填；也可用环境变量 XURI_DB_PASSWORD）
  --init-db                 建库、建用户、授权，并导入 app/init-mysql.sql（只允许空库）
  --port <端口>             服务端口，默认 8080
  --install-dir <目录>      安装目录，默认 /opt/xuri-classroom
  --user <用户名>           运行用户，默认 xuri（不存在则创建系统用户）

数据库选项（默认本机 127.0.0.1:3306/surveyking）：
  --db-host <主机>
  --db-port <端口>
  --db-name <库名>
  --db-user <用户>
  --db-password <密码>
  --db-admin-user <用户>        --init-db 使用的管理员账号，默认 root
  --db-admin-password <密码>    --init-db 使用的管理员密码
                                （也可用环境变量 MYSQL_ROOT_PASSWORD）

Java 选项：
  --download-jre            从国内镜像下载 Temurin JRE 8（x86_64）到安装目录，
                            已在 <安装目录>/runtime/jre8 时直接复用
  --no-jre                  强制使用系统 java：不下载、也不用安装目录内的 JRE

其他：
  --no-systemd              只安装文件、不注册 systemd，打印手动启动命令
  --yes, -y                 不询问确认（自动化/无人值守）
  --help, -h                显示本帮助

示例：
  # 全新安装：本机 MySQL，自动建库并导入初始数据
  sudo bash install.sh --db-password 'Str0ng-Pass' --init-db

  # 机器没有 java，用国内镜像下载 JRE 8
  sudo bash install.sh --db-password 'Str0ng-Pass' --init-db --download-jre

  # 连接已有数据库，不建库、不导入
  sudo bash install.sh --db-host 10.0.0.5 --db-password 'Str0ng-Pass' --yes

  # 只准备文件，交给 systemd 之外的方式启动（测试/容器）
  sudo bash install.sh --no-systemd --install-dir /tmp/xuri --db-password 'Str0ng-Pass'

注意：
  · app/init-mysql.sql 含大量 DROP TABLE（当前版本 25 处），只允许对空库执行；
    安装器在导入前会检查表数量，非空库直接中止。
  · 卸载：sudo bash uninstall.sh（默认保留安装目录与数据）
USAGE
}

parse_args() {
  local a
  if [[ $# -gt 0 ]]; then
    local -a normalized=()
    for a in "$@"; do
      case "$a" in
        --*=*) normalized+=("${a%%=*}" "${a#*=}") ;;
        *) normalized+=("$a") ;;
      esac
    done
    if [[ ${#normalized[@]} -gt 0 ]]; then
      set -- "${normalized[@]}"
    else
      set --
    fi
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --port)
        [[ $# -ge 2 ]] || die "--port 需要端口号"
        SERVER_PORT="$2"; PORT_SET=1; shift 2 ;;
      --install-dir)
        [[ $# -ge 2 ]] || die "--install-dir 需要目录"
        INSTALL_DIR="$2"; shift 2 ;;
      --user)
        [[ $# -ge 2 ]] || die "--user 需要用户名"
        RUN_USER="$2"; shift 2 ;;
      --db-host)
        [[ $# -ge 2 ]] || die "--db-host 需要主机名或 IP"
        DB_HOST="$2"; DB_HOST_SET=1; shift 2 ;;
      --db-port)
        [[ $# -ge 2 ]] || die "--db-port 需要端口号"
        DB_PORT="$2"; DB_PORT_SET=1; shift 2 ;;
      --db-name)
        [[ $# -ge 2 ]] || die "--db-name 需要库名"
        DB_NAME="$2"; DB_NAME_SET=1; shift 2 ;;
      --db-user)
        [[ $# -ge 2 ]] || die "--db-user 需要用户名"
        DB_USER="$2"; DB_USER_SET=1; shift 2 ;;
      --db-password)
        [[ $# -ge 2 ]] || die "--db-password 需要密码"
        DB_PASSWORD="$2"; DB_PASSWORD_SET=1; shift 2 ;;
      --db-admin-user)
        [[ $# -ge 2 ]] || die "--db-admin-user 需要用户名"
        DB_ADMIN_USER="$2"; shift 2 ;;
      --db-admin-password)
        [[ $# -ge 2 ]] || die "--db-admin-password 需要密码"
        DB_ADMIN_PASSWORD="$2"; shift 2 ;;
      --init-db) INIT_DB=1; shift ;;
      --no-systemd) USE_SYSTEMD=0; shift ;;
      --download-jre) DOWNLOAD_JRE=1; shift ;;
      --no-jre) FORCE_SYSTEM_JAVA=1; shift ;;
      --yes|-y) ASSUME_YES=1; shift ;;
      --help|-h) usage; exit 0 ;;
      --) shift; break ;;
      -*) die "未知参数：$1（用 --help 查看用法）" ;;
      *) die "不支持位置参数：$1（用 --help 查看用法）" ;;
    esac
  done

  if [[ $# -gt 0 ]]; then
    die "不支持位置参数：$1（用 --help 查看用法）"
  fi

  if [[ -n "${XURI_DB_PASSWORD:-}" ]]; then
    DB_PASSWORD_SET=1
  fi
}

normalize_install_dir() {
  if [[ -z "$INSTALL_DIR" ]]; then
    die "安装目录不能为空"
  fi
  if [[ "$INSTALL_DIR" != /* ]]; then
    die "安装目录必须是绝对路径：$INSTALL_DIR"
  fi
  case "$INSTALL_DIR" in
    *$'\n'*|*$'\r'*) die "安装目录不能包含换行：$INSTALL_DIR" ;;
  esac
  if command -v readlink >/dev/null 2>&1; then
    INSTALL_DIR=$(readlink -m -- "$INSTALL_DIR" 2>/dev/null || printf '%s' "$INSTALL_DIR")
  fi
  while [[ "$INSTALL_DIR" == */ && "$INSTALL_DIR" != "/" ]]; do
    INSTALL_DIR="${INSTALL_DIR%/}"
  done
  case "$INSTALL_DIR" in
    /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/proc|/root|/run|/sbin|/srv|/sys|/tmp|/usr|/var)
      die "安装目录不能是系统目录：$INSTALL_DIR" ;;
  esac
}

detect_existing_env() {
  ENV_FILE="$INSTALL_DIR/app.env"
  if [[ -f "$ENV_FILE" ]]; then
    ENV_EXISTS=1
    info "检测到已有配置：$ENV_FILE（保留原值，仅更新命令行显式指定的项）"
    local v
    if [[ $PORT_SET -eq 0 ]]; then
      v=$(env_get "$ENV_FILE" SERVER_PORT)
      if [[ -n "$v" ]]; then SERVER_PORT="$v"; fi
    fi
    if [[ $DB_HOST_SET -eq 0 ]]; then
      v=$(env_get "$ENV_FILE" DB_HOST)
      if [[ -n "$v" ]]; then DB_HOST="$v"; fi
    fi
    if [[ $DB_PORT_SET -eq 0 ]]; then
      v=$(env_get "$ENV_FILE" DB_PORT)
      if [[ -n "$v" ]]; then DB_PORT="$v"; fi
    fi
    if [[ $DB_NAME_SET -eq 0 ]]; then
      v=$(env_get "$ENV_FILE" DB_NAME)
      if [[ -n "$v" ]]; then DB_NAME="$v"; fi
    fi
    if [[ $DB_USER_SET -eq 0 ]]; then
      v=$(env_get "$ENV_FILE" DB_USER)
      if [[ -n "$v" ]]; then DB_USER="$v"; fi
    fi
    if [[ $DB_PASSWORD_SET -eq 0 ]]; then
      v=$(env_get "$ENV_FILE" DB_PASSWORD)
      if [[ -n "$v" ]]; then DB_PASSWORD="$v"; fi
    fi
  fi
}

validate_args() {
  if [[ ! "$SERVER_PORT" =~ ^[0-9]+$ ]]; then
    die "端口必须是数字：$SERVER_PORT"
  fi
  if (( SERVER_PORT < 1 || SERVER_PORT > 65535 )); then
    die "端口超出范围（1-65535）：$SERVER_PORT"
  fi
  if [[ ! "$DB_PORT" =~ ^[0-9]+$ ]]; then
    die "数据库端口必须是数字：$DB_PORT"
  fi
  if (( DB_PORT < 1 || DB_PORT > 65535 )); then
    die "数据库端口超出范围（1-65535）：$DB_PORT"
  fi
  if [[ ! "$RUN_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
    die "运行用户名不合法（只允许小写字母、数字、下划线和短横线，且以字母或下划线开头）：$RUN_USER"
  fi
  if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]{1,64}$ ]]; then
    die "数据库名不合法（只允许字母、数字、下划线）：$DB_NAME"
  fi
  if [[ ! "$DB_USER" =~ ^[A-Za-z0-9_]{1,64}$ ]]; then
    die "数据库用户名不合法（只允许字母、数字、下划线）：$DB_USER"
  fi
  if [[ -z "$DB_HOST" ]]; then
    die "数据库主机不能为空"
  fi
  case "$DB_HOST" in
    *" "*|*"'"*|*$'\n'*) die "数据库主机不能包含空格、单引号或换行：$DB_HOST" ;;
  esac
  if [[ -z "$DB_ADMIN_USER" || "$DB_ADMIN_USER" == *" "* || "$DB_ADMIN_USER" == *"'"* ]]; then
    die "管理员用户名不合法：$DB_ADMIN_USER"
  fi
  if [[ ! "$READY_TIMEOUT" =~ ^[0-9]+$ ]]; then
    die "XURI_READY_TIMEOUT 必须是数字：$READY_TIMEOUT"
  fi
  if [[ $FORCE_SYSTEM_JAVA -eq 1 && $DOWNLOAD_JRE -eq 1 ]]; then
    die "--no-jre 与 --download-jre 不能同时使用（一个强制用系统 java，一个要下载内置 JRE）"
  fi
}

detect_package() {
  SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
  local -a jars=()
  local f
  for f in "$SCRIPT_DIR"/app/xuri-classroom-*.jar; do
    if [[ -f "$f" ]]; then jars+=("$f"); fi
  done
  if [[ ${#jars[@]} -eq 0 ]]; then
    for f in "$SCRIPT_DIR"/app/*.jar; do
      if [[ -f "$f" ]]; then jars+=("$f"); fi
    done
  fi
  if [[ ${#jars[@]} -eq 0 ]]; then
    die "安装包不完整：未找到 $SCRIPT_DIR/app/xuri-classroom-*.jar"
  fi
  PKG_JAR="${jars[0]}"
  if [[ ${#jars[@]} -gt 1 ]]; then
    warn "安装包内有多个 jar，使用：$PKG_JAR"
  fi
  # Spring Boot 的 bootJar 开了 launchScript()，文件头是 #!/bin/sh，不是 PK；
  # 两种都接受，真正的完整性由 java -jar 启动和后续健康检查兜底。
  jar_magic="$(head -c 2 -- "$PKG_JAR")"
  if [[ "$jar_magic" != "PK" && "$jar_magic" != "#!" ]]; then
    die "jar 文件无效（文件头既不是 PK 也不是 #!，可能下载不完整）：$PKG_JAR"
  fi
  INIT_SQL="$SCRIPT_DIR/app/init-mysql.sql"
  if [[ $INIT_DB -eq 1 && ! -f "$INIT_SQL" ]]; then
    die "指定了 --init-db，但安装包里没有 app/init-mysql.sql"
  fi
  info "安装包目录：$SCRIPT_DIR"
  info "待安装 jar：$PKG_JAR"
}

sha256_of() {
  local file="$1" out=""
  if command -v sha256sum >/dev/null 2>&1; then
    out=$(sha256sum "$file" | awk '{print $1}')
  elif command -v openssl >/dev/null 2>&1; then
    out=$(openssl dgst -sha256 "$file" 2>/dev/null | awk '{print $NF}')
  fi
  if [[ -z "$out" ]]; then
    return 1
  fi
  printf '%s' "$out" | tr '[:upper:]' '[:lower:]'
}

check_java_version() {
  local bin="$1" ver=""
  ver=$("$bin" -version 2>&1 | head -n 1 || true)
  info "Java 版本：${ver:-未知}（$bin）"
  case "$ver" in
    *'"1.8.'*|*'version "8'*) ;;
    *) warn "检测到的 Java 不是 8.x（${ver:-未知}）。本项目基于 Spring Boot 2.7，官方目标是 JRE 8，更高版本可能可用但不保证。" ;;
  esac
}

ensure_downloaded_jre() {
  local installed="$INSTALL_DIR/runtime/jre8/bin/java"
  if [[ -x "$installed" ]] && "$installed" -version >/dev/null 2>&1; then
    ok "已存在可用的 JRE：$INSTALL_DIR/runtime/jre8（跳过下载）"
    return 0
  fi

  local arch
  arch=$(uname -m 2>/dev/null || echo unknown)
  case "$arch" in
    x86_64|amd64) ;;
    *) die "自动下载的 JRE 只提供 x86_64 版本，当前架构是 $arch。请安装系统 JRE 8（--no-jre），或换用 x86_64 机器。" ;;
  esac

  local downloader=""
  if command -v curl >/dev/null 2>&1; then
    downloader="curl"
  elif command -v wget >/dev/null 2>&1; then
    downloader="wget"
  else
    die "下载 JRE 需要 curl 或 wget，当前都没有。请先安装 curl（apt install curl / dnf install curl）后重试。"
  fi

  local tmp_dir tmp_tar url worked=0
  tmp_dir=$(mktemp -d) || die "mktemp 失败"
  CLEANUP_FILES+=("$tmp_dir")
  tmp_tar="$tmp_dir/jre.tar.gz"

  info "下载 Temurin JRE ${JRE_VERSION}（x86_64，约 40MB，国内镜像）"
  for url in "${JRE_URLS[@]}"; do
    info "尝试：$url"
    if [[ "$downloader" == "curl" ]]; then
      if curl -fL --retry 3 --connect-timeout 15 --max-time 600 --progress-bar -o "$tmp_tar" "$url"; then
        worked=1
      fi
    else
      if wget -q --tries=3 --timeout=15 -O "$tmp_tar" "$url"; then
        worked=1
      fi
    fi
    if [[ $worked -eq 1 ]]; then break; fi
    warn "下载失败：$url"
  done
  if [[ $worked -eq 0 ]]; then
    die "JRE 下载失败。请检查网络/代理，或手动下载后解压到 $INSTALL_DIR/runtime/jre8：
  ${JRE_URLS[0]}
  ${JRE_URLS[1]}"
  fi

  local expected actual
  expected=$(printf '%s' "$JRE_SHA256" | tr '[:upper:]' '[:lower:]')
  actual=$(sha256_of "$tmp_tar") || die "无法计算下载文件的 SHA256（系统缺少 sha256sum/openssl）"
  if [[ "$actual" != "$expected" ]]; then
    die "JRE 压缩包 SHA256 校验失败（期望 $expected，实际 $actual）。已中止，请重试或换网络。"
  fi
  ok "JRE SHA256 校验通过"

  if ! tar -tzf "$tmp_tar" >/dev/null 2>&1; then
    die "下载的 JRE 压缩包损坏（tar 校验失败），请重试或手动下载。"
  fi

  info "解压 JRE 到 $INSTALL_DIR/runtime/jre8"
  mkdir -p -- "$tmp_dir/extract"
  if ! tar -xzf "$tmp_tar" -C "$tmp_dir/extract" --strip-components=1; then
    die "解压 JRE 失败（压缩包结构异常）"
  fi
  if [[ ! -x "$tmp_dir/extract/bin/java" ]]; then
    die "解压后的 JRE 缺少 bin/java，压缩包结构不符合预期，请手动下载。"
  fi
  rm -rf -- "$INSTALL_DIR/runtime/jre8"
  mkdir -p -- "$INSTALL_DIR/runtime"
  mv -- "$tmp_dir/extract" "$INSTALL_DIR/runtime/jre8" || die "安装 JRE 到 $INSTALL_DIR/runtime/jre8 失败"
  chown -R "$RUN_USER:$RUN_GROUP" "$INSTALL_DIR/runtime" || warn "设置 JRE 属主失败，请手动 chown -R $RUN_USER:$RUN_GROUP $INSTALL_DIR/runtime"
  if ! "$installed" -version >/dev/null 2>&1; then
    die "下载的 JRE 无法运行（可能是 glibc 版本不兼容）。请安装系统 JRE 8 后使用 --no-jre。"
  fi
  ok "JRE 已安装：$INSTALL_DIR/runtime/jre8"
}

resolve_java() {
  local installed="$INSTALL_DIR/runtime/jre8/bin/java"

  if [[ $DOWNLOAD_JRE -eq 1 ]]; then
    ensure_downloaded_jre
    RUNTIME_JAVA=1
    JAVA_SRC="$installed"
    JAVA_BIN="$installed"
    info "使用安装目录内的 JRE：$JAVA_BIN"
    check_java_version "$JAVA_SRC"
    return 0
  fi

  if [[ $FORCE_SYSTEM_JAVA -eq 0 ]] && command -v java >/dev/null 2>&1; then
    RUNTIME_JAVA=0
    JAVA_SRC=$(command -v java)
    JAVA_BIN=$(readlink -f -- "$JAVA_SRC" 2>/dev/null || printf '%s' "$JAVA_SRC")
    info "使用系统 java：$JAVA_SRC"
    check_java_version "$JAVA_SRC"
    return 0
  fi

  if [[ -x "$installed" ]]; then
    RUNTIME_JAVA=1
    JAVA_SRC="$installed"
    JAVA_BIN="$installed"
    info "系统没有 java，使用已安装的 JRE：$JAVA_BIN"
    check_java_version "$JAVA_SRC"
    return 0
  fi

  if [[ $FORCE_SYSTEM_JAVA -eq 1 ]]; then
    die "已指定 --no-jre，但系统里找不到 java。请先安装 JRE 8：
  Debian/Ubuntu : apt install openjdk-8-jre-headless
  RHEL/CentOS   : dnf install java-1.8.0-openjdk-headless
  或者去掉 --no-jre，加 --download-jre 从国内镜像下载。"
  fi

  die "系统里找不到 java。请任选一种：
  1) 安装系统 JRE 8：
     Debian/Ubuntu : apt install openjdk-8-jre-headless
     RHEL/CentOS   : dnf install java-1.8.0-openjdk-headless
  2) 加 --download-jre，从国内镜像下载 Temurin JRE 8 到 $INSTALL_DIR/runtime/jre8"
}

resolve_db_password() {
  if [[ -n "$DB_PASSWORD" ]]; then
    return 0
  fi
  if [[ $ASSUME_YES -eq 1 ]]; then
    die "没有提供数据库密码。请用 --db-password 指定，或设置环境变量 XURI_DB_PASSWORD。"
  fi
  if [[ ! -t 0 ]]; then
    die "当前不是交互终端，无法询问数据库密码。请用 --db-password 指定。"
  fi
  local first="" second=""
  printf '请输入数据库密码（输入时不回显）：'
  IFS= read -r -s first || die "读取密码失败"
  printf '\n'
  if [[ -z "$first" ]]; then die "数据库密码不能为空"; fi
  printf '请再输入一次：'
  IFS= read -r -s second || die "读取密码失败"
  printf '\n'
  if [[ "$first" != "$second" ]]; then die "两次输入的密码不一致"; fi
  DB_PASSWORD="$first"
  DB_PASSWORD_SET=1
}

check_systemd() {
  if [[ $USE_SYSTEMD -eq 0 ]]; then
    return 0
  fi
  if [[ ! -d /run/systemd/system ]] || ! command -v systemctl >/dev/null 2>&1; then
    warn "当前环境没有运行 systemd（/run/systemd/system 不存在），自动改用 --no-systemd 模式：只准备文件并打印手动启动命令。"
    USE_SYSTEMD=0
  fi
}

maybe_confirm() {
  if [[ $ASSUME_YES -eq 1 ]]; then
    return 0
  fi
  if [[ ! -t 0 ]]; then
    die "当前不是交互终端。请在命令中加 --yes 确认，或改用交互方式执行。"
  fi
  local init_text systemd_text jre_text answer
  if [[ $INIT_DB -eq 1 ]]; then
    init_text="是（建库/建用户/导入 init-mysql.sql）"
  else
    init_text="否"
  fi
  if [[ $USE_SYSTEMD -eq 1 ]]; then
    systemd_text="是（服务名 ${SERVICE_NAME}.service）"
  else
    systemd_text="否（只准备文件并打印手动启动命令）"
  fi
  if [[ $DOWNLOAD_JRE -eq 1 ]]; then
    jre_text="从国内镜像下载 Temurin JRE ${JRE_VERSION}"
  else
    jre_text="优先系统 java，缺失时使用安装目录内已有 JRE"
  fi
  cat <<EOF
即将安装旭日云课堂：
  安装目录    ：$INSTALL_DIR
  运行用户    ：$RUN_USER
  服务端口    ：$SERVER_PORT
  数据库      ：$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME
  初始化数据库：$init_text
  注册 systemd：$systemd_text
  Java        ：$jre_text

确认继续？[y/N] 
EOF
  read -r answer || die "已取消安装"
  case "$answer" in
    y|Y|yes|YES) ;;
    *) die "已取消安装" ;;
  esac
}

create_user() {
  if id "$RUN_USER" >/dev/null 2>&1; then
    RUN_GROUP=$(id -gn "$RUN_USER")
    info "运行用户已存在：$RUN_USER（组 $RUN_GROUP）"
    return 0
  fi
  local nologin
  nologin=$(command -v nologin || true)
  if [[ -z "$nologin" ]]; then nologin=/bin/false; fi
  useradd --system --home-dir "$INSTALL_DIR" --shell "$nologin" --user-group "$RUN_USER" \
    || die "创建系统用户失败：$RUN_USER"
  RUN_GROUP=$(id -gn "$RUN_USER")
  ok "已创建系统用户：$RUN_USER（组 $RUN_GROUP）"
}

create_dirs() {
  mkdir -p -- "$INSTALL_DIR" "$INSTALL_DIR/files"
  chown "$RUN_USER:$RUN_GROUP" "$INSTALL_DIR" "$INSTALL_DIR/files" || die "设置安装目录属主失败"
  chmod 0750 -- "$INSTALL_DIR" "$INSTALL_DIR/files"
  ok "安装目录已就绪：$INSTALL_DIR"
}

install_jar() {
  local src="$1" dst="$INSTALL_DIR/app.jar"
  local src_real dst_real
  src_real=$(readlink -f -- "$src" 2>/dev/null || printf '%s' "$src")
  dst_real=$(readlink -f -- "$dst" 2>/dev/null || true)
  if [[ -n "$dst_real" && "$src_real" == "$dst_real" ]]; then
    chmod 0644 -- "$dst"
    info "jar 已位于安装目录，跳过复制"
    return 0
  fi
  info "复制 jar 到 $dst"
  install -m 0644 -- "$src" "$INSTALL_DIR/.app.jar.new" || die "复制 jar 失败：$src"
  mv -f -- "$INSTALL_DIR/.app.jar.new" "$dst" || die "安装 jar 失败：$dst"
  ok "jar 已安装"
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
    *"'"*) die "配置项 $key 的取值不能包含单引号。如需使用含单引号的密码，请安装后按 systemd 的 EnvironmentFile 规则手工编辑 $file。" ;;
    *\\*) die "配置项 $key 的取值不能包含反斜杠（systemd 会处理转义，无法原样传递）。请改用不含反斜杠的密码，或安装后手工编辑 $file。" ;;
  esac
  KEY="$key" VAL="$value" awk -F= '
    BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"]; q = sprintf("%c", 39) }
    $1 == k { print k "=" q v q; found = 1; next }
    { print }
    END { if (!found) print k "=" q v q }
  ' "$file" > "$file.tmp.$$" || die "写入配置失败：$file"
  mv -f -- "$file.tmp.$$" "$file" || die "写入配置失败：$file"
  chmod 0600 -- "$file" 2>/dev/null || true
}

env_ensure() {
  local file="$1" key="$2" value="$3" current
  current=$(env_get "$file" "$key")
  if [[ -z "$current" ]]; then
    env_set "$file" "$key" "$value"
  fi
}

generate_jwt_secret() {
  local secret=""
  if command -v openssl >/dev/null 2>&1; then
    secret=$(openssl rand -base64 48 2>/dev/null | tr -d '\n' || true)
  fi
  if [[ -z "$secret" ]] && command -v base64 >/dev/null 2>&1; then
    secret=$(head -c 48 /dev/urandom | base64 | tr -d '\n' || true)
  fi
  if [[ -z "$secret" ]]; then
    die "无法生成 JWT 密钥：系统缺少 openssl/base64。请安装 openssl 后重试。"
  fi
  printf '%s' "$secret"
}

prepare_env() {
  ENV_FILE="$INSTALL_DIR/app.env"
  local created=0
  if [[ -f "$ENV_FILE" ]]; then
    info "保留已有配置：$ENV_FILE"
  else
    if [[ -f "$SCRIPT_DIR/app.env.example" ]]; then
      install -m 0600 -- "$SCRIPT_DIR/app.env.example" "$ENV_FILE" || die "写入 app.env 失败"
      info "已按安装包模板生成 app.env"
    else
      : > "$ENV_FILE"
      chmod 0600 -- "$ENV_FILE"
      warn "安装包内缺少 app.env.example，使用内置默认值生成 app.env"
    fi
    created=1
  fi

  local stored_secret
  stored_secret=$(env_get "$ENV_FILE" SK_JWT_SECRET)
  if [[ -z "$stored_secret" ]]; then
    stored_secret=$(generate_jwt_secret)
    info "已生成新的 SK_JWT_SECRET（请备份 app.env）"
  fi

  if [[ $created -eq 1 ]]; then
    env_set "$ENV_FILE" DB_HOST "$DB_HOST"
    env_set "$ENV_FILE" DB_PORT "$DB_PORT"
    env_set "$ENV_FILE" DB_NAME "$DB_NAME"
    env_set "$ENV_FILE" DB_USER "$DB_USER"
    env_set "$ENV_FILE" DB_PASSWORD "$DB_PASSWORD"
    env_set "$ENV_FILE" SERVER_PORT "$SERVER_PORT"
    env_set "$ENV_FILE" SK_JWT_SECRET "$stored_secret"
    env_set "$ENV_FILE" SK_WEB_SPA_ENABLED "true"
    env_set "$ENV_FILE" FILE_STORAGE_LOCAL_ROOT_PATH "$INSTALL_DIR/files"
  else
    if [[ $DB_HOST_SET -eq 1 ]]; then env_set "$ENV_FILE" DB_HOST "$DB_HOST"; fi
    if [[ $DB_PORT_SET -eq 1 ]]; then env_set "$ENV_FILE" DB_PORT "$DB_PORT"; fi
    if [[ $DB_NAME_SET -eq 1 ]]; then env_set "$ENV_FILE" DB_NAME "$DB_NAME"; fi
    if [[ $DB_USER_SET -eq 1 ]]; then env_set "$ENV_FILE" DB_USER "$DB_USER"; fi
    if [[ $DB_PASSWORD_SET -eq 1 ]]; then env_set "$ENV_FILE" DB_PASSWORD "$DB_PASSWORD"; fi
    if [[ $PORT_SET -eq 1 ]]; then env_set "$ENV_FILE" SERVER_PORT "$SERVER_PORT"; fi
    env_ensure "$ENV_FILE" DB_HOST "127.0.0.1"
    env_ensure "$ENV_FILE" DB_PORT "3306"
    env_ensure "$ENV_FILE" DB_NAME "surveyking"
    env_ensure "$ENV_FILE" DB_USER "surveyking"
    env_ensure "$ENV_FILE" DB_PASSWORD "$DB_PASSWORD"
    env_ensure "$ENV_FILE" SERVER_PORT "$SERVER_PORT"
    env_ensure "$ENV_FILE" SK_JWT_SECRET "$stored_secret"
    env_ensure "$ENV_FILE" SK_WEB_SPA_ENABLED "true"
    env_ensure "$ENV_FILE" FILE_STORAGE_LOCAL_ROOT_PATH "$INSTALL_DIR/files"
  fi

  env_ensure "$ENV_FILE" TZ "Asia/Shanghai"
  env_ensure "$ENV_FILE" JAVA_TOOL_OPTIONS "-Xmx768m"

  DB_HOST=$(env_get "$ENV_FILE" DB_HOST)
  DB_PORT=$(env_get "$ENV_FILE" DB_PORT)
  DB_NAME=$(env_get "$ENV_FILE" DB_NAME)
  DB_USER=$(env_get "$ENV_FILE" DB_USER)
  DB_PASSWORD=$(env_get "$ENV_FILE" DB_PASSWORD)
  FINAL_PORT=$(env_get "$ENV_FILE" SERVER_PORT)
  if [[ -z "$FINAL_PORT" ]]; then FINAL_PORT="$SERVER_PORT"; fi
  if [[ ! "$FINAL_PORT" =~ ^[0-9]+$ ]]; then
    die "app.env 里的 SERVER_PORT 不是有效端口：$FINAL_PORT"
  fi

  local ds_url="jdbc:mysql://$DB_HOST:$DB_PORT/$DB_NAME?rewriteBatchedStatements=true&useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai"
  env_set "$ENV_FILE" SPRING_DATASOURCE_URL "$ds_url"
  env_set "$ENV_FILE" SPRING_DATASOURCE_USERNAME "$DB_USER"
  env_set "$ENV_FILE" SPRING_DATASOURCE_PASSWORD "$DB_PASSWORD"

  # 统一属主：运行用户必须能读 app.jar、能写 files/（升级时也会顺带修正旧目录权限）
  chown -R "$RUN_USER:$RUN_GROUP" "$INSTALL_DIR" || die "设置安装目录属主失败"
  chmod 0750 -- "$INSTALL_DIR" "$INSTALL_DIR/files"
  chmod 0600 -- "$ENV_FILE"
  ok "配置文件已就绪：$ENV_FILE（0600，属主 $RUN_USER）"
}

is_loopback_host() {
  case "$DB_HOST" in
    127.0.0.1|localhost|::1|0.0.0.0) return 0 ;;
  esac
  return 1
}

write_cnf() {
  local path="$1" host="$2" port="$3" user="$4" pass="$5" escaped
  escaped=${pass//\\/\\\\}
  escaped=${escaped//\"/\\\"}
  {
    printf '[client]\n'
    printf 'host=%s\n' "$host"
    printf 'port=%s\n' "$port"
    printf 'user=%s\n' "$user"
    printf 'password="%s"\n' "$escaped"
    printf 'default-character-set=utf8mb4\n'
    printf 'connect-timeout=10\n'
  } > "$path" || die "写入临时配置失败：$path"
  chmod 0600 -- "$path"
}

init_db() {
  if ! command -v mysql >/dev/null 2>&1; then
    die "未找到 mysql 客户端，无法初始化数据库。请先安装（Debian/Ubuntu：apt install mysql-client；RHEL/CentOS：dnf install mysql；Alpine：apk add mysql-client），或去掉 --init-db 由 DBA 预先建库。"
  fi
  if [[ ! -f "$INIT_SQL" ]]; then
    die "--init-db 需要安装包内的 app/init-mysql.sql：$INIT_SQL"
  fi

  local admin_user="$DB_ADMIN_USER" admin_pass="$DB_ADMIN_PASSWORD"
  if [[ -z "$admin_pass" ]]; then
    if [[ $ASSUME_YES -eq 1 || ! -t 0 ]]; then
      die "初始化数据库需要管理员密码：请用 --db-admin-password 指定，或设置环境变量 MYSQL_ROOT_PASSWORD。"
    fi
    printf '请输入 MySQL 管理员（%s）密码（输入时不回显）：' "$admin_user"
    IFS= read -r -s admin_pass || die "读取管理员密码失败"
    printf '\n'
  fi
  if [[ -z "$admin_pass" ]]; then die "管理员密码不能为空"; fi

  local admin_cnf app_cnf
  admin_cnf=$(mktemp) || die "mktemp 失败"
  app_cnf=$(mktemp) || die "mktemp 失败"
  CLEANUP_FILES+=("$admin_cnf" "$app_cnf")
  write_cnf "$admin_cnf" "$DB_HOST" "$DB_PORT" "$admin_user" "$admin_pass"
  write_cnf "$app_cnf" "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASSWORD"

  info "检查数据库连接：$admin_user@$DB_HOST:$DB_PORT"
  if ! mysql --defaults-extra-file="$admin_cnf" --protocol=TCP -e 'SELECT 1' >/dev/null 2>&1; then
    die "无法连接数据库。请检查 DB_HOST/DB_PORT 是否正确、MySQL 是否已启动、管理员账号密码是否正确（--db-admin-user/--db-admin-password）。"
  fi

  info "创建数据库（若不存在）：$DB_NAME"
  mysql --defaults-extra-file="$admin_cnf" --protocol=TCP \
    -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    || die "创建数据库失败：$DB_NAME"

  if [[ "$DB_USER" == "root" ]]; then
    warn "DB_USER=root，跳过创建数据库用户；使用远程库时请确认 root 允许远程登录。"
  else
    info "创建/更新数据库用户：$DB_USER"
    local sql_file sql_pass h
    sql_file=$(mktemp) || die "mktemp 失败"
    CLEANUP_FILES+=("$sql_file")
    sql_pass=${DB_PASSWORD//\'/\'\'}
    local -a hosts=('%')
    if is_loopback_host; then
      hosts+=('localhost' '127.0.0.1')
    fi
    {
      for h in "${hosts[@]}"; do
        printf "CREATE USER IF NOT EXISTS '%s'@'%s' IDENTIFIED BY '%s';\n" "$DB_USER" "$h" "$sql_pass"
      done
      for h in "${hosts[@]}"; do
        printf "ALTER USER '%s'@'%s' IDENTIFIED BY '%s';\n" "$DB_USER" "$h" "$sql_pass"
      done
      for h in "${hosts[@]}"; do
        printf "GRANT ALL PRIVILEGES ON \`%s\`.* TO '%s'@'%s';\n" "$DB_NAME" "$DB_USER" "$h"
      done
      printf 'FLUSH PRIVILEGES;\n'
    } > "$sql_file" || die "生成授权 SQL 失败"
    mysql --defaults-extra-file="$admin_cnf" --protocol=TCP < "$sql_file" \
      || die "创建数据库用户或授权失败：$DB_USER"
    ok "数据库用户已就绪：$DB_USER"
  fi

  local tables
  if ! tables=$(mysql --defaults-extra-file="$admin_cnf" --protocol=TCP -N -B \
      -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>/dev/null | tr -d '[:space:]'); then
    die "无法确认数据库 $DB_NAME 是否为空，为避免误清库已中止。请检查管理员账号权限。"
  fi
  if [[ ! "$tables" =~ ^[0-9]+$ ]]; then
    die "无法确认数据库 $DB_NAME 的表数量（返回：${tables:-空}），为避免误清库已中止。"
  fi
  if (( tables > 0 )); then
    local drop_count=""
    drop_count=$(grep -c 'DROP TABLE IF EXISTS' "$INIT_SQL" 2>/dev/null || true)
    die "目标库 $DB_NAME 已有 $tables 张表。app/init-mysql.sql 含 ${drop_count:-大量} 处 DROP TABLE，会清空现有数据，已中止导入。如确实要重建：先备份，再手工执行 mysql ... < app/init-mysql.sql。"
  fi

  info "导入初始化数据：$INIT_SQL"
  mysql --defaults-extra-file="$app_cnf" --protocol=TCP "$DB_NAME" < "$INIT_SQL" \
    || die "导入 init-mysql.sql 失败（库和用户已创建）。请确认 MySQL 版本为 5.7/8.0，且 app/init-mysql.sql 完整。"

  local accounts
  accounts=$(mysql --defaults-extra-file="$app_cnf" --protocol=TCP -N -B "$DB_NAME" \
      -e 'SELECT COUNT(*) FROM t_account;' 2>/dev/null | tr -d '[:space:]' || true)
  if [[ "$accounts" =~ ^[0-9]+$ ]] && (( accounts > 0 )); then
    ok "数据库初始化完成（t_account 有 $accounts 条记录）"
  else
    warn "初始化脚本已执行，但没读到 t_account 记录，请人工确认。"
  fi
}

write_unit() {
  local port="$1"
  mkdir -p -- "$(dirname -- "$UNIT_FILE")"
  local tmp="$UNIT_FILE.new.$$"
  {
    printf '[Unit]\n'
    printf 'Description=旭日云课堂（xuri-classroom）\n'
    printf 'After=network-online.target\n'
    printf 'Wants=network-online.target\n'
    printf '\n[Service]\n'
    printf 'Type=simple\n'
    printf 'User=%s\n' "$RUN_USER"
    printf 'Group=%s\n' "$RUN_GROUP"
    printf 'WorkingDirectory=%s\n' "$INSTALL_DIR"
    printf 'EnvironmentFile=%s\n' "$ENV_FILE"
    printf 'ExecStart="%s" -jar "%s"\n' "$JAVA_BIN" "$INSTALL_DIR/app.jar"
    printf 'SuccessExitStatus=143\n'
    printf 'Restart=always\n'
    printf 'RestartSec=5\n'
    printf 'TimeoutStopSec=30\n'
    printf 'LimitNOFILE=65535\n'
    printf 'UMask=0027\n'
    printf 'SyslogIdentifier=%s\n' "$SERVICE_NAME"
    if (( port < 1024 )); then
      printf 'AmbientCapabilities=CAP_NET_BIND_SERVICE\n'
      printf 'CapabilityBoundingSet=CAP_NET_BIND_SERVICE\n'
    else
      printf 'NoNewPrivileges=true\n'
    fi
    printf '\n[Install]\n'
    printf 'WantedBy=multi-user.target\n'
  } > "$tmp" || die "写入 systemd 服务文件失败：$tmp"
  chmod 0644 -- "$tmp"
  mv -f -- "$tmp" "$UNIT_FILE" || die "安装 systemd 服务文件失败：$UNIT_FILE"
  ok "已写入 systemd 服务文件：$UNIT_FILE"
}

start_service() {
  if ! command -v systemctl >/dev/null 2>&1; then
    die "找不到 systemctl，无法启动服务"
  fi
  systemctl daemon-reload
  if ! systemctl enable "$SERVICE_NAME.service" >/dev/null 2>&1; then
    warn "systemctl enable 失败，重启后服务可能不会自动启动。"
  fi
  info "启动服务：$SERVICE_NAME.service"
  if ! systemctl restart "$SERVICE_NAME.service"; then
    warn "systemctl restart 返回失败，最近日志："
    journalctl -u "$SERVICE_NAME.service" -n 50 --no-pager 2>/dev/null || true
    die "启动 systemd 服务失败"
  fi
  sleep 2
  if systemctl is-active --quiet "$SERVICE_NAME.service"; then
    ok "服务已启动"
  else
    warn "服务没有保持运行，最近日志："
    journalctl -u "$SERVICE_NAME.service" -n 50 --no-pager 2>/dev/null || true
    die "服务启动失败（若数据库尚未就绪，可稍后执行 systemctl restart $SERVICE_NAME）"
  fi
}

wait_ready() {
  if [[ $READY_TIMEOUT -eq 0 ]]; then
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    info "系统没有 curl，跳过就绪检查"
    return 0
  fi
  local url="http://127.0.0.1:$FINAL_PORT/api/system" i=0 limit
  limit=$(( READY_TIMEOUT / 2 ))
  info "等待应用就绪（最多 $READY_TIMEOUT 秒）：$url"
  while (( i < limit )); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      ok "应用已就绪"
      return 0
    fi
    sleep 2
    i=$(( i + 1 ))
  done
  warn "应用在 $READY_TIMEOUT 秒内没有返回 200，请检查：journalctl -u $SERVICE_NAME -n 100 --no-pager"
  return 0
}

shell_quote() {
  local s="$1"
  if [[ "$s" == *"'"* ]]; then
    printf '%q' "$s"
  else
    printf "'%s'" "$s"
  fi
}

print_manual_start() {
  local manual_cmd boot_cmd
  manual_cmd=$(printf 'cd %q && set -a && . %q && set +a && exec %q -jar %q' \
    "$INSTALL_DIR" "$ENV_FILE" "$JAVA_BIN" "$INSTALL_DIR/app.jar")
  boot_cmd="$manual_cmd >> $(printf '%q' "$INSTALL_DIR/app.log") 2>&1 &"
  printf '\n'
  ok "文件已就绪（未注册 systemd）"
  printf '手动前台启动：\n'
  printf '  sudo -u %s bash -c %s\n' "$RUN_USER" "$(shell_quote "$manual_cmd")"
  printf '手动后台启动（日志写 app.log）：\n'
  printf '  sudo -u %s bash -c %s\n' "$RUN_USER" "$(shell_quote "$boot_cmd")"
  printf '\n'
}

print_summary() {
  local uninstall_cmd java_text
  uninstall_cmd="sudo bash $(printf '%q' "$SCRIPT_DIR/uninstall.sh") --install-dir $(printf '%q' "$INSTALL_DIR") --user $(printf '%q' "$RUN_USER")"
  if [[ $RUNTIME_JAVA -eq 1 ]]; then
    java_text="$JAVA_BIN（安装目录内 JRE）"
  else
    java_text="$JAVA_BIN（系统 java）"
  fi
  printf '\n================ 安装完成 ================\n'
  printf '访问地址：http://<服务器IP>:%s\n' "$FINAL_PORT"
  printf '安装目录：%s\n' "$INSTALL_DIR"
  printf '配置文件：%s（权限 0600）\n' "$ENV_FILE"
  printf '可执行 jar：%s\n' "$INSTALL_DIR/app.jar"
  printf 'Java：%s\n' "$java_text"
  if [[ $USE_SYSTEMD -eq 1 ]]; then
    printf '服务名称：%s.service\n' "$SERVICE_NAME"
    printf '查看状态：systemctl status %s --no-pager\n' "$SERVICE_NAME"
    printf '查看日志：journalctl -u %s -f\n' "$SERVICE_NAME"
    printf '重启服务：systemctl restart %s\n' "$SERVICE_NAME"
  else
    printf '未注册 systemd：启动命令见上方“手动前台启动”。\n'
  fi
  printf '卸载命令：%s\n' "$uninstall_cmd"
  if [[ $INIT_DB -eq 1 ]]; then
    printf '\n初始账号：admin / 123456 —— 首次登录后请立即修改密码。\n'
  fi
  printf '==========================================\n'
}

main() {
  parse_args "$@"
  if [[ $EUID -ne 0 ]]; then
    die "请用 root 或 sudo 执行：sudo bash $0 --help 查看用法"
  fi
  normalize_install_dir
  detect_existing_env
  validate_args
  detect_package
  resolve_db_password
  check_systemd
  maybe_confirm
  create_user
  create_dirs
  resolve_java
  install_jar "$PKG_JAR"
  prepare_env
  if [[ $USE_SYSTEMD -eq 0 && -f "$UNIT_FILE" ]]; then
    warn "检测到已存在的 systemd 服务：$UNIT_FILE。本次以 --no-systemd 运行，不会停止或修改它；如需停止：systemctl stop $SERVICE_NAME"
  fi
  if [[ $INIT_DB -eq 1 ]]; then
    init_db
  fi
  if [[ $USE_SYSTEMD -eq 1 ]]; then
    write_unit "$FINAL_PORT"
    start_service
    wait_ready
  else
    print_manual_start
  fi
  print_summary
}

if [[ "${BASH_SOURCE[0]:-}" == "$0" ]]; then
  main "$@"
fi
