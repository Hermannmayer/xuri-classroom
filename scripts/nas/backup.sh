#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · NAS 生产备份脚本（当前形态：手工 docker run 的 H2 单机生产）
#
# 为什么不能直接复用 scripts/deploy/backup.sh：
#   那边 db 是 compose 里能进容器 exec 的 MySQL（mysqldump 可用）；
#   这边的生产是手工 docker run 的容器 surveyking，数据库是 H2 单文件库，
#   数据在宿主机 bind mount 里（下面四条都是实测路径）：
#       /vol2/1000/surveyking/db     → 容器内 /app/db   （H2 单文件库）
#       /vol2/1000/surveyking/files  → 容器内 /app/files（上传附件）
#       /vol2/1000/surveyking/config → 容器内 /app/config
#       /vol2/1000/surveyking/logs   → 容器内 /app/logs
#   H2 在进程运行期间对库文件持有独占锁，直接 cp/tar 可能拷到「写了一半」的库，
#   恢复时可能报 corrupt 或丢最近事务。所以默认采用**停机拷贝**：
#       docker stop → tar db → docker start（停机窗口只覆盖 db 目录，通常几十 MB）
#   附件/config 的打包放在容器恢复之后做，让停机窗口尽量短。
#
# 为什么不做 H2 在线 BACKUP TO：
#   H2 的 BACKUP TO 必须由持有库连接的那个 JVM 执行；从第二个进程连同一个文件库会撞
#   文件锁（这个库没开 AUTO_SERVER）。上游镜像里也没有可核实的 H2 工具入口，
#   在脚本里硬编一个 /app/xxx.jar 路径等同于编造。故这里不做「假在线备份」，
#   需要在线备份请在应用层另行实现，并先按本目录 README 的演练流程验证过再用。
#
# 归档内容（backup_YYYYmmdd-HHMMSS.tar.gz，默认在 /vol2/1000/xuri/backup）：
#   db.tar.gz      H2 数据库目录快照（停机拷贝；--hot 时是不一致风险快照）
#   files.tar.gz   上传附件（/app/files）
#   config.tar.gz  应用配置
#   logs.tar.gz    容器日志（仅 --with-logs）
#   manifest.txt   元信息：镜像版本、模式、路径、容器暴露端口、备份范围
#   SHA256SUMS     上面各 tar.gz 的校验和（解包后可 sha256sum -c SHA256SUMS）
# 归档旁边另写 backup_<时间戳>.tar.gz.sha256 与 .manifest.txt，不解包即可核对/查看。
#
# 用法（需要 root 或能读生产目录 + 操作 docker 的账号）：
#   sudo CONFIRM=yes bash scripts/nas/backup.sh                 # 默认：短暂停机备份
#   sudo CONFIRM=yes bash scripts/nas/backup.sh --retention 7 --output /vol2/1000/xuri/backup
#   sudo bash scripts/nas/backup.sh --dry-run                   # 只打印将执行的动作，不动生产
#   sudo CONFIRM=yes bash scripts/nas/backup.sh --with-logs
#   sudo bash scripts/nas/backup.sh --hot                       # 不停机直接拷，危险，见提示
#   无人值守（cron）：CONFIRM=yes 写进 crontab 行首，或加 --yes 显式承担短暂停机风险
#
# 安全约定：
#   - 停机模式会先打印将执行的命令，并要求 CONFIRM=yes（--yes 等价）；--dry-run 可先看
#   - 脚本内没有任何删数据的命令；retention 只删匹配 backup_*.tar.gz 的旧归档，且跳过刚生成的那份
#   - 只要容器是「本脚本停的」，任何异常退出都会在 trap 里重新拉起并等健康检查
#
# 退出码：
#   0  备份成功（归档 + 校验和 + 清单已生成）
#   1  参数/环境错误，或缺少 CONFIRM=yes（未做任何破坏性动作）
#   2  备份过程失败（容器已尝试恢复；若恢复也失败则是 3）
#   3  容器恢复失败 —— 生产可能处于停止状态，必须立刻人工处理
#
# 首次使用请先：chmod +x scripts/nas/backup.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ---------------------------------------------------------------- 默认值（NAS 实测路径）
CONTAINER="${XURI_CONTAINER:-surveyking}"           # 手工 docker run 起的生产容器
DATA_DIR="${XURI_LEGACY_DATA_DIR:-/vol2/1000/surveyking}"
BACKUP_DIR="${BACKUP_DIR:-/vol2/1000/xuri/backup}"
RETENTION=14
HEALTH_URL="${XURI_HEALTH_URL:-http://127.0.0.1:201/api/system}"   # 学校现在走宿主机 201
HEALTH_TIMEOUT="${XURI_HEALTH_TIMEOUT:-120}"
MODE="stop"          # stop | hot
INCLUDE_LOGS=0
VERIFY=1
DRY_RUN=0
ASSUME_CONFIRM=0
MIN_FREE_MB="${XURI_MIN_FREE_MB:-1024}"   # 除本次所需空间外，额外留 1GB

# ---------------------------------------------------------------- 输出助手
log()  { printf '[信息] %s\n' "$*"; }
warn() { printf '[警告] %s\n' "$*" >&2; }
err()  { printf '[错误] %s\n' "$*" >&2; }
die()  { err "$1"; exit "${2:-1}"; }

usage() {
  cat <<'USAGE'
用法：bash scripts/nas/backup.sh [选项]

  --output <目录>       备份输出目录，默认 ${BACKUP_DIR:-/vol2/1000/xuri/backup}
  --retention <份数>    保留最近多少份归档，默认 14（只删 backup_*.tar.gz 旧归档）
  --container <名称>    生产容器名，默认 surveyking
  --data-dir <目录>     生产数据根目录，默认 /vol2/1000/surveyking
  --with-logs           额外打包 logs 目录（体积可能较大）
  --hot                 不停止容器，直接拷贝 H2 目录（**有损坏风险**，会打印长篇警告）
  --dry-run             只打印将执行的动作，不停止容器、不写归档
  --no-verify           跳过创建后用 tar -tzf 复读一遍归档（大归档可省时间）
  --yes                 等价于 CONFIRM=yes：无人值守（cron）时显式授权短暂停机
  --health-url <url>    重启后的健康探测地址，默认 http://127.0.0.1:201/api/system
  --health-timeout <秒> 健康探测超时，默认 120
  -h, --help            显示本帮助

退出码：0 成功 / 1 参数或环境错误（或缺少 CONFIRM=yes）/ 2 备份失败（容器已恢复）/ 3 容器恢复失败（需人工）
USAGE
}

# ---------------------------------------------------------------- 参数解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output|--backup-dir|--output-dir)
      [[ $# -ge 2 ]] || die "$1 需要目录参数" 1
      BACKUP_DIR="$2"; shift 2 ;;
    --retention)
      [[ $# -ge 2 ]] || die "$1 需要数字" 1
      RETENTION="$2"; shift 2 ;;
    --container)
      [[ $# -ge 2 ]] || die "$1 需要容器名" 1
      CONTAINER="$2"; shift 2 ;;
    --data-dir)
      [[ $# -ge 2 ]] || die "$1 需要目录参数" 1
      DATA_DIR="$2"; shift 2 ;;
    --health-url)
      [[ $# -ge 2 ]] || die "$1 需要 URL" 1
      HEALTH_URL="$2"; shift 2 ;;
    --health-timeout)
      [[ $# -ge 2 ]] || die "$1 需要秒数" 1
      HEALTH_TIMEOUT="$2"; shift 2 ;;
    --with-logs) INCLUDE_LOGS=1; shift ;;
    --hot) MODE="hot"; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-verify) VERIFY=0; shift ;;
    --yes|-y) ASSUME_CONFIRM=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "未知参数：$1（用 --help 查看用法）" 1 ;;
    *)  die "未知位置参数：$1" 1 ;;
  esac
done

[[ "$RETENTION" =~ ^[1-9][0-9]*$ ]] || die "保留份数必须是正整数：$RETENTION" 1
[[ "$HEALTH_TIMEOUT" =~ ^[0-9]+$ ]] || die "健康探测超时必须是秒数：$HEALTH_TIMEOUT" 1
[[ "$MIN_FREE_MB" =~ ^[0-9]+$ ]] || die "XURI_MIN_FREE_MB 必须是整数兆：$MIN_FREE_MB" 1
[[ -n "$BACKUP_DIR" ]] || die "备份目录不能为空" 1

# ---------------------------------------------------------------- 运行期状态
STAGE=""
STOPPED_BY_US=0
T0=0

# ---------------------------------------------------------------- 工具函数（必须在 trap 之前定义）
health_once() {
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    return 1
  fi
  if command -v wget >/dev/null 2>&1; then
    if wget -q -T 5 -O /dev/null "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    return 1
  fi
  return 0   # 没有探测工具，视为通过（调用方会打印提示）
}

wait_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    warn "宿主机没有 curl/wget，跳过健康探测（请手工确认：$HEALTH_URL）"
    return 0
  fi
  log "轮询健康检查（最长 ${HEALTH_TIMEOUT}s）：$HEALTH_URL"
  while ((SECONDS < deadline)); do
    if health_once; then return 0; fi
    sleep 3
  done
  return 1
}

exists_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo missing)" == "true" ]]
}

human_kb() { awk -v k="${1:-0}" 'BEGIN{ if (k>1048576) printf "%.1f GB", k/1048576; else if (k>1024) printf "%.1f MB", k/1024; else printf "%d KB", k }'; }

# ---------------------------------------------------------------- 收尾：任何路径退出都要保证容器回来
cleanup() {
  local rc=$?
  if [[ "$STOPPED_BY_US" -eq 1 ]]; then
    printf '[信息] 收尾：生产容器（%s）是本次停的，正在重新拉起\n' "$CONTAINER" >&2
    if docker start "$CONTAINER" >/dev/null 2>&1; then
      STOPPED_BY_US=0
      if wait_health; then
        printf '[信息] 容器已恢复，健康检查通过：%s\n' "$HEALTH_URL" >&2
      else
        printf '[警告] 容器已启动，但 %s 秒内健康检查未通过，请人工确认：curl -fsS %s\n' \
          "$HEALTH_TIMEOUT" "$HEALTH_URL" >&2
      fi
    else
      printf '[错误] 重新启动容器 %s 失败！生产现在可能处于停止状态。\n' "$CONTAINER" >&2
      printf '[错误] 请立刻执行：docker start %s\n' "$CONTAINER" >&2
      printf '[错误] 然后看日志：docker logs --tail 100 %s\n' "$CONTAINER" >&2
      rc=3
    fi
  fi
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then
    case "$STAGE" in
      *xuri_nas_backup*) rm -rf -- "$STAGE" ;;
      *) printf '[警告] 临时目录名不像本脚本创建的，保留不动：%s\n' "$STAGE" >&2 ;;
    esac
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

confirm_gate() {
  if [[ "$ASSUME_CONFIRM" -eq 1 || "${CONFIRM:-}" == "yes" ]]; then
    log "已确认（CONFIRM=yes / --yes），继续执行需要停机拷贝的步骤"
    return 0
  fi
  cat >&2 <<EOF

================ 需要确认 ================
接下来会**短暂停止生产容器**，把 H2 数据库目录拷成一致快照，然后重新拉起：

  docker stop --time 30 ${CONTAINER}
  tar -czf <暂存>/db.tar.gz -C ${DATA_DIR} --numeric-owner db
  docker start ${CONTAINER}

  · 停机时长 ≈ 打包 ${DATA_DIR}/db 的时间，之后立即重启并等健康检查
  · 附件与配置的打包放在容器恢复之后做，不进停机窗口
  · 如果此刻正在考试，学生会连接中断；先跑 scripts/nas/preflight.sh 判断

确认无考试进行后，用下面任一方式重新执行：
  CONFIRM=yes bash scripts/nas/backup.sh <同样的参数>
  bash scripts/nas/backup.sh --yes <同样的参数>

（想先看动作不落地：bash scripts/nas/backup.sh --dry-run）
==========================================

EOF
  exit 1
}

# ---------------------------------------------------------------- 前置检查
command -v docker >/dev/null 2>&1 || die "找不到 docker 命令（本脚本必须在 NAS 宿主机上跑）" 1
docker info >/dev/null 2>&1 || die "docker 守护进程不可用：检查 Docker 服务是否在运行（systemctl status docker）" 1
command -v tar >/dev/null 2>&1 || die "找不到 tar 命令" 1

[[ -d "$DATA_DIR" ]] || die "生产数据根目录不存在：$DATA_DIR（用 --data-dir 指定）" 1
[[ -d "$DATA_DIR/db" ]] || die "H2 数据库目录不存在：$DATA_DIR/db；没有可备份的数据库，中止" 1
[[ -r "$DATA_DIR/db" ]] || die "没有读权限：$DATA_DIR/db，请用 sudo 执行" 1
mkdir -p "$BACKUP_DIR" 2>/dev/null || die "无法创建备份目录：$BACKUP_DIR（检查权限或用 --output）" 1
[[ -w "$BACKUP_DIR" ]] || die "备份目录不可写：$BACKUP_DIR（检查权限或用 --output）" 1

CONTAINER_EXISTS=1
if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  CONTAINER_EXISTS=0
  warn "找不到容器 $CONTAINER（容器名不同或首次使用？）。将只备份宿主机目录，不做停机动作。"
fi

# 空间检查：所需 ≈ 未压缩数据大小 + 余量（tar.gz 会压缩，按未压缩算最保守）
NEED_KB=0
for sub in db files config logs; do
  if [[ "$sub" == "logs" && "$INCLUDE_LOGS" -ne 1 ]]; then continue; fi
  [[ -d "$DATA_DIR/$sub" ]] || continue
  sub_kb="$(du -sk "$DATA_DIR/$sub" 2>/dev/null | awk '{print $1}')"
  [[ "$sub_kb" =~ ^[0-9]+$ ]] || sub_kb=0
  NEED_KB=$((NEED_KB + sub_kb))
done
AVAIL_KB="$(df -Pk "$BACKUP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
if [[ "$AVAIL_KB" =~ ^[0-9]+$ ]]; then
  log "备份目录剩余空间 $(human_kb "$AVAIL_KB")，本次数据约 $(human_kb "$NEED_KB")（未压缩估算）"
  if (( AVAIL_KB < NEED_KB + MIN_FREE_MB * 1024 )); then
    die "剩余空间不足：至少需要 $(human_kb "$((NEED_KB + MIN_FREE_MB * 1024))")（含 ${MIN_FREE_MB}MB 余量），实际 $(human_kb "$AVAIL_KB")。请先清理旧备份或改 --output" 2
  fi
else
  warn "无法读取 $BACKUP_DIR 的剩余空间，跳过空间检查"
fi

# ---------------------------------------------------------------- 暂存目录（放备份目录内，同文件系统）
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$BACKUP_DIR/backup_${STAMP}.tar.gz"
suffix=2
while [[ -e "$ARCHIVE" ]]; do
  ARCHIVE="$BACKUP_DIR/backup_${STAMP}-r${suffix}.tar.gz"
  suffix=$((suffix + 1))
done
# 暂存目录名必须能被 cleanup 的白名单模式 *xuri_nas_backup* 匹配，否则退出时不会自动清理
STAGE="$BACKUP_DIR/.tmp_xuri_nas_backup_${STAMP}_$$"
COMPONENTS=()

# ---------------------------------------------------------------- 采集元信息
CONTAINER_IMAGE="unknown"
CONTAINER_IMAGE_ID="unknown"
CONTAINER_PORTS="无端口映射"
CONTAINER_ENV_SUMMARY=""
WAS_RUNNING=0
if [[ "$CONTAINER_EXISTS" -eq 1 ]]; then
  CONTAINER_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || echo unknown)"
  CONTAINER_IMAGE_ID="$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || echo unknown)"
  CONTAINER_PORTS="$(docker port "$CONTAINER" 2>/dev/null | tr '\n' ' ' || true)"
  CONTAINER_PORTS="${CONTAINER_PORTS:-无端口映射}"
  # 只记录非敏感环境变量，绝不打库密码、加密密钥、JWT 密钥
  CONTAINER_ENV_SUMMARY="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" 2>/dev/null \
    | grep -E '^(PROFILE|SPRING_PROFILES_ACTIVE|SERVER_PROFILES_ACTIVE|SERVER_PORT|TZ|JAVA_OPTS|JAVA_TOOL_OPTIONS)=' || true)"
  if exists_running; then WAS_RUNNING=1; fi
fi

# ---------------------------------------------------------------- 计划打印
echo
log "================ 备份计划 ================"
log "容器            : $CONTAINER（存在=$([[ $CONTAINER_EXISTS -eq 1 ]] && echo 是 || echo 否)，备份前运行中=$([[ $WAS_RUNNING -eq 1 ]] && echo 是 || echo 否)）"
log "镜像            : $CONTAINER_IMAGE"
log "数据根目录      : $DATA_DIR"
log "备份输出        : $ARCHIVE"
if [[ "$MODE" == "stop" ]]; then
  log "备份模式        : stop（停容器 → 拷 db → 起容器）"
else
  log "备份模式        : hot（不停机直接拷，有损坏风险）"
fi
log "包含 logs 目录  : $([[ $INCLUDE_LOGS -eq 1 ]] && echo 是 || echo 否)"
log "保留份数        : $RETENTION"
log "健康探测        : $HEALTH_URL（超时 ${HEALTH_TIMEOUT}s）"
log "=========================================="
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "--dry-run：以下是将执行的动作，本次不会真的执行"
  if [[ "$MODE" == "stop" && "$WAS_RUNNING" -eq 1 ]]; then
    log "  docker stop --time 30 $CONTAINER"
    log "  tar -czf <暂存>/db.tar.gz -C $DATA_DIR --numeric-owner db"
    log "  docker start $CONTAINER && 轮询 $HEALTH_URL（最长 ${HEALTH_TIMEOUT}s）"
  elif [[ "$MODE" == "hot" ]]; then
    log "  tar -czf <暂存>/db.tar.gz -C $DATA_DIR --numeric-owner db   # 容器保持运行，H2 可能不一致"
  else
    log "  容器未运行：直接 tar -czf <暂存>/db.tar.gz -C $DATA_DIR --numeric-owner db"
  fi
  for sub in files config; do
    if [[ -d "$DATA_DIR/$sub" ]]; then
      log "  tar -czf <暂存>/${sub}.tar.gz -C $DATA_DIR --numeric-owner $sub"
    fi
  done
  if [[ "$INCLUDE_LOGS" -eq 1 && -d "$DATA_DIR/logs" ]]; then
    log "  tar -czf <暂存>/logs.tar.gz -C $DATA_DIR --numeric-owner logs"
  fi
  log "  tar -czf $ARCHIVE -C <暂存> .  并生成 SHA256SUMS / manifest.txt / .sha256 / .manifest.txt"
  log "  按 --retention $RETENTION 清理更旧的 backup_*.tar.gz"
  exit 0
fi

# ---------------------------------------------------------------- 打包组件
tar_component() {
  local name="$1" out="$2"
  [[ -d "$DATA_DIR/$name" ]] || return 1
  log "打包 $DATA_DIR/$name → $(basename "$out")"
  tar -czf "$out" -C "$DATA_DIR" --numeric-owner "$name"
}

mkdir -p "$STAGE"

if [[ "$MODE" == "stop" && "$WAS_RUNNING" -eq 1 ]]; then
  # ---- 短暂停机：只覆盖 db 目录 ----
  confirm_gate
  T0=$SECONDS
  log "[动作] docker stop --time 30 $CONTAINER"
  # 先置位：即使 stop 行为异常（超时/部分成功），退出时也会尝试拉起
  STOPPED_BY_US=1
  if ! docker stop --time 30 "$CONTAINER" >/dev/null; then
    die "docker stop $CONTAINER 失败；容器状态未知，未做任何拷贝。请先手工检查：docker ps -a --filter name=$CONTAINER" 2
  fi
  if exists_running; then
    die "容器 $CONTAINER 停止后仍在运行，为安全起见中止（不会在运行状态下拷贝 H2 文件）" 2
  fi
  EXIT_CODE="$(docker inspect -f '{{.State.ExitCode}}' "$CONTAINER" 2>/dev/null || echo unknown)"
  if [[ "$EXIT_CODE" != "0" ]]; then
    warn "容器退出码为 $EXIT_CODE（非 0），H2 可能没有干净关闭；本次 db.tar.gz 请先在演练环境试打开，再当作可用备份"
  else
    log "容器已优雅退出（exit code 0），H2 文件已关闭，可以安全拷贝"
  fi

  tar_component db "$STAGE/db.tar.gz" || die "打包 H2 目录失败（$DATA_DIR/db）" 2
  COMPONENTS+=("db.tar.gz")

  # 立即恢复生产；压缩/校验等耗时动作全部放到恢复之后
  log "[动作] docker start $CONTAINER"
  if ! docker start "$CONTAINER" >/dev/null; then
    err "启动容器失败！生产当前处于停止状态。"
    err "请立刻执行：docker start $CONTAINER && docker logs --tail 100 $CONTAINER"
    STOPPED_BY_US=0   # 避免 trap 重复尝试掩盖真实错误
    exit 3
  fi
  STOPPED_BY_US=0
  DOWN_SECONDS=$((SECONDS - T0))
  log "生产已恢复，本次停机 ${DOWN_SECONDS}s"
  if wait_health; then
    log "健康检查通过"
  else
    warn "健康检查 ${HEALTH_TIMEOUT}s 内未通过，请人工确认：curl -fsS $HEALTH_URL"
  fi
else
  # ---- 容器本来就没运行，或 --hot 模式 ----
  if [[ "$MODE" == "hot" && "$WAS_RUNNING" -eq 1 ]]; then
    warn "=================================================================="
    warn "--hot 模式：容器保持运行，直接拷贝 H2 目录"
    warn "H2 单文件库在运行期间有未落盘的页和写了一半的事务，拷出来的库可能"
    warn "无法打开（corrupt）或丢失最近写入的数据。本模式只适用于："
    warn "  · 库已经坏了、要抢救现有文件；或"
    warn "  · 已确认此刻无人使用且宁可承担风险"
    warn "拷完必须立刻在演练环境尝试打开验证，不要当作正式备份。"
    warn "=================================================================="
  fi
  if [[ "$WAS_RUNNING" -eq 0 ]]; then
    log "容器未在运行：H2 文件应已关闭，直接拷贝（不会替你启动它）"
  fi
  tar_component db "$STAGE/db.tar.gz" || die "打包 H2 目录失败（$DATA_DIR/db）" 2
  COMPONENTS+=("db.tar.gz")
fi

# ---- 附件 / 配置 / 日志（此时生产已恢复，不影响停机窗口）----
MISSING_NOTES=""
for sub in files config; do
  if [[ -d "$DATA_DIR/$sub" ]]; then
    tar_component "$sub" "$STAGE/${sub}.tar.gz" || die "打包 $DATA_DIR/$sub 失败" 2
    COMPONENTS+=("${sub}.tar.gz")
  else
    warn "目录不存在，跳过：$DATA_DIR/$sub"
    MISSING_NOTES="${MISSING_NOTES}skip=${sub}_MISSING"$'\n'
  fi
done
if [[ "$INCLUDE_LOGS" -eq 1 ]]; then
  if [[ -d "$DATA_DIR/logs" ]]; then
    if tar_component logs "$STAGE/logs.tar.gz"; then
      COMPONENTS+=("logs.tar.gz")
    else
      warn "打包 logs 失败，已跳过日志"
    fi
  else
    warn "目录不存在，跳过：$DATA_DIR/logs"
  fi
fi

# ---------------------------------------------------------------- manifest + 校验和
log "生成 manifest.txt 与 SHA256SUMS"
{
  echo "# 旭日云课堂 · NAS 生产备份清单"
  echo "created=$(date '+%Y-%m-%dT%H:%M:%S%z')"
  echo "created_epoch=$(date +%s)"
  echo "hostname=$(hostname 2>/dev/null || echo unknown)"
  echo "script=scripts/nas/backup.sh"
  echo "repo_root=${REPO_ROOT}"
  echo "backup_mode=${MODE}"
  echo "container=${CONTAINER}"
  echo "container_exists=$([[ "$CONTAINER_EXISTS" -eq 1 ]] && echo yes || echo no)"
  echo "container_running_before=$([[ "$WAS_RUNNING" -eq 1 ]] && echo yes || echo no)"
  echo "container_image=${CONTAINER_IMAGE}"
  echo "container_image_id=${CONTAINER_IMAGE_ID}"
  echo "container_ports=${CONTAINER_PORTS}"
  if [[ -n "$CONTAINER_ENV_SUMMARY" ]]; then
    echo "# 容器非敏感环境变量（库密码/加密密钥/JWT 一律不记录）"
    printf '%s\n' "$CONTAINER_ENV_SUMMARY" | sed 's/^/container_env=/'
  fi
  echo "data_dir=${DATA_DIR}"
  echo "health_url=${HEALTH_URL}"
  echo "components=$(printf '%s ' "${COMPONENTS[@]}")"
  echo "retention=${RETENTION}"
  if [[ -n "$MISSING_NOTES" ]]; then
    printf '%s' "$MISSING_NOTES"
  fi
  if [[ "$MODE" == "hot" ]]; then
    echo "warning=HOT_COPY：容器运行中直接拷贝 H2 目录，数据库可能不一致，使用前必须在演练环境验证"
  fi
  echo "restore=停容器 → 用 db.tar.gz 覆盖 ${DATA_DIR}/db、files.tar.gz 覆盖 ${DATA_DIR}/files → 起容器；详见 deploy/nas/prod/README.md"
  echo "verify=tar xzf <归档> 后执行 sha256sum -c SHA256SUMS"
} > "$STAGE/manifest.txt"

if ((${#COMPONENTS[@]} > 0)); then
  ( cd "$STAGE" && sha256sum "${COMPONENTS[@]}" > SHA256SUMS )
fi

# ---------------------------------------------------------------- 生成归档
log "生成归档：$ARCHIVE"
tar -czf "$ARCHIVE" -C "$STAGE" .

if [[ "$VERIFY" -eq 1 ]]; then
  log "复读归档做完整性检查（大归档会慢一点，可加 --no-verify 跳过）"
  if ! tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
    die "归档完整性检查失败：$ARCHIVE 可能被写坏（磁盘满？）。请删掉它并重跑：rm -f '$ARCHIVE'" 2
  fi
fi

# 归档旁的旁挂文件（不解包就能核对/查看）
( cd "$BACKUP_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256" )
cp -f "$STAGE/manifest.txt" "$ARCHIVE.manifest.txt"

# ---------------------------------------------------------------- 保留策略
log "应用保留策略：保留最近 $RETENTION 份 backup_*.tar.gz"
KEEP_FROM=$((RETENTION + 1))
OLD_LIST=""
OLD_LIST="$(ls -1t -- "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +"$KEEP_FROM" || true)"
if [[ -n "$OLD_LIST" ]]; then
  while IFS= read -r old; do
    [[ -n "$old" && -f "$old" ]] || continue
    [[ "$old" == "$ARCHIVE" ]] && continue      # 绝不删刚生成的这份
    log "清理旧备份：$(basename "$old")"
    rm -f -- "$old" "$old.sha256" "$old.manifest.txt" || warn "删除旧备份失败：$old"
  done <<< "$OLD_LIST"
else
  log "没有需要清理的旧备份"
fi

# ---------------------------------------------------------------- 收尾报告
ARCHIVE_BYTES="$(wc -c < "$ARCHIVE" 2>/dev/null || echo 0)"
ARCHIVE_KB=$(( (ARCHIVE_BYTES + 1023) / 1024 ))
AVAIL_AFTER="$(df -Pk "$BACKUP_DIR" 2>/dev/null | awk 'NR==2 {print $4}' || true)"
echo
log "================ 备份完成 ================"
log "归档      : $ARCHIVE（$(human_kb "$ARCHIVE_KB")）"
log "校验和    : $ARCHIVE.sha256"
log "清单      : $ARCHIVE.manifest.txt"
log "包含组件  : $(printf '%s ' "${COMPONENTS[@]}")"
if [[ -n "$AVAIL_AFTER" ]]; then
  log "剩余空间  : $(human_kb "$AVAIL_AFTER")"
fi
log "核对方法  : (cd $BACKUP_DIR && sha256sum -c $(basename "$ARCHIVE").sha256)"
log "恢复演练  : 见 deploy/nas/prod/README.md「恢复演练」一节（务必先演练再当真）"
if [[ "$MODE" == "hot" ]]; then
  warn "注意：本次是 --hot 热拷贝，使用前必须在演练环境验证数据库能打开"
fi
log "=========================================="
exit 0
