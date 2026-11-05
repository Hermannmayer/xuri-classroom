#!/usr/bin/env bash
# =============================================================================
# Linux 生产部署（systemd）
#
# 用途：创建运行用户/目录、拷贝 jar、生成 app.env、注册 systemd 服务并启动。
#
# 用法：
#   sudo ./install.sh /path/to/app.jar
#   sudo ./install.sh /path/to/app.jar --install-dir /opt/xuri-classroom \
#        --user xuri --port 80 --service-name xuri-classroom
#
# 参数：
#   <jar>                  必填，待部署的 Spring Boot jar
#   --install-dir <dir>    安装目录，默认 /opt/xuri-classroom
#   --user <name>          systemd 运行用户，默认 xuri
#   --port <port>          服务端口，默认 80
#   --service-name <name>  systemd 服务名，默认 xuri-classroom
#
# 说明：
#   - 重复执行是幂等的：jar/env 存在则保留（env 不覆盖），服务存在则 restart。
#   - 端口 < 1024 时给 systemd 加 CAP_NET_BIND_SERVICE，无需 root 运行 Java。
#   - 需要 root/sudo，且机器已安装 Java（可用 JAVA_BIN 环境变量覆盖）。
# =============================================================================
set -euo pipefail

JAR_PATH=""
INSTALL_DIR="/opt/xuri-classroom"
RUN_USER="xuri"
SERVER_PORT="80"
SERVICE_NAME="xuri-classroom"

usage() {
  sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

log() {
  echo "[INFO] $*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-dir|--dir)
      [[ $# -ge 2 ]] || die "$1 需要目录参数"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --user)
      [[ $# -ge 2 ]] || die "$1 需要用户名"
      RUN_USER="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 ]] || die "$1 需要端口号"
      SERVER_PORT="$2"
      shift 2
      ;;
    --service-name)
      [[ $# -ge 2 ]] || die "$1 需要服务名"
      SERVICE_NAME="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "未知参数：$1（用 --help 查看用法）"
      ;;
    *)
      [[ -z "$JAR_PATH" ]] || die "只能指定一个 jar 路径"
      JAR_PATH="$1"
      shift
      ;;
  esac
done

[[ -n "$JAR_PATH" ]] || { usage; die "缺少 jar 路径"; }
[[ -f "$JAR_PATH" ]] || die "jar 不存在：$JAR_PATH"
[[ "$EUID" -eq 0 ]] || die "请用 root 或 sudo 执行"
[[ "$SERVER_PORT" =~ ^[0-9]+$ ]] || die "端口必须是数字：$SERVER_PORT"
(( SERVER_PORT >= 1 && SERVER_PORT <= 65535 )) || die "端口范围 1-65535：$SERVER_PORT"
[[ "$RUN_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || die "用户名不合法：$RUN_USER"
[[ "$SERVICE_NAME" =~ ^[A-Za-z0-9_.@-]+$ ]] || die "服务名不合法：$SERVICE_NAME"
[[ "$INSTALL_DIR" = /* ]] || die "安装目录必须是绝对路径：$INSTALL_DIR"

JAVA_BIN="${JAVA_BIN:-$(command -v java || true)}"
[[ -n "$JAVA_BIN" && -x "$JAVA_BIN" ]] || die "找不到 java，可用 JAVA_BIN=/path/to/java 指定"
JAR_REAL="$(readlink -f "$JAR_PATH")"
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

log "创建用户和目录"
if ! id "$RUN_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin "$RUN_USER"
  log "已创建用户 $RUN_USER"
else
  log "用户 $RUN_USER 已存在，跳过创建"
fi

mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/files"

log "拷贝 jar"
TARGET_JAR="$INSTALL_DIR/app.jar"
if [[ "$JAR_REAL" != "$(readlink -f "$TARGET_JAR" 2>/dev/null || true)" ]]; then
  install -m 0644 "$JAR_REAL" "$TARGET_JAR"
else
  chmod 0644 "$TARGET_JAR"
fi

ENV_FILE="$INSTALL_DIR/app.env"
if [[ ! -f "$ENV_FILE" ]]; then
  log "生成 app.env 模板（请修改数据库密码）"
  cat > "$ENV_FILE" <<EOF
# xuri-classroom 运行环境变量（由 install.sh 生成）
# 修改后执行：systemctl restart ${SERVICE_NAME}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=surveyking
DB_USER=root
DB_PASSWORD=change-me
SERVER_PORT=${SERVER_PORT}
EOF
else
  log "app.env 已存在，保留原文件（如端口变化请手动改 SERVER_PORT）"
fi
chown "$RUN_USER:$RUN_USER" "$ENV_FILE"
chmod 0600 "$ENV_FILE"
chown -R "$RUN_USER:$RUN_USER" "$INSTALL_DIR"

log "写入 systemd unit：$UNIT_FILE"
cat > "$UNIT_FILE" <<EOF
[Unit]
Description=xuri-classroom application
After=network-online.target mysql.service
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${JAVA_BIN} -jar ${TARGET_JAR}
SuccessExitStatus=143
Restart=always
RestartSec=5
LimitNOFILE=65535
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

if systemctl is-active --quiet "$SERVICE_NAME.service"; then
  log "服务已运行，restart"
  systemctl enable "$SERVICE_NAME.service" >/dev/null 2>&1 || true
  systemctl restart "$SERVICE_NAME.service"
else
  log "启用并启动服务"
  systemctl enable --now "$SERVICE_NAME.service"
fi

log "部署完成：$SERVICE_NAME.service"
log "安装目录：$INSTALL_DIR"
log "配置文件：$ENV_FILE（记得改 DB_PASSWORD）"
log "查看状态：systemctl status $SERVICE_NAME --no-pager"
log "查看日志：journalctl -u $SERVICE_NAME -f"
