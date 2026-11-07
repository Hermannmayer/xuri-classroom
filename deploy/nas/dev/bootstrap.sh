#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · 飞牛 NAS 开发环境引导脚本
#
# 这个脚本只做一件事：把「在飞牛 NAS 上跑开发环境」的一次性手工步骤，
# 变成一条可以重复执行的命令。它**不会**：
#   - 在宿主机上装 JDK / Node / Gradle（全在 devbox 镜像里）
#   - 碰生产考试系统（容器 surveyking / 宿主机 201 / /vol2/1000/surveyking/）
#   - 占用宿主机 80 端口（飞牛 Web 管理界面在用）
#
# 用法（在 NAS 上执行，随便哪个目录都行）：
#   bash deploy/nas/dev/bootstrap.sh
# 首次可能需要：
#   chmod +x deploy/nas/dev/bootstrap.sh && ./deploy/nas/dev/bootstrap.sh
# （git clone 到 Linux 后如果没有执行位，用 `bash 脚本名` 方式跑同样可以）
#
# 幂等：重复执行安全 —— 目录已存在不会报错，容器已在跑会走 `up -d` 的增量更新。
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# 0. 前置自检
# -----------------------------------------------------------------------------
# 如果这个文件被 Windows 的 Git / 编辑器改成了 CRLF 换行，bash 会在奇怪的地方报错。
# 先自己查一遍，给出确定的修复命令，别让人对着 "$'\r': command not found" 发呆。
if grep -q $'\r' "${BASH_SOURCE[0]}" 2>/dev/null; then
  echo "" >&2
  echo "❌ bootstrap.sh 里含有 Windows 的 CRLF 换行，bash 无法正确解析。" >&2
  echo "   在 NAS 上执行下面这条命令修好它，然后重新运行：" >&2
  echo "     sed -i 's/\r\$//' \"$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/$(basename -- "${BASH_SOURCE[0]}")\"" >&2
  echo "" >&2
  exit 1
fi

if [ "$(uname -s)" != "Linux" ]; then
  echo "❌ 本脚本要在飞牛 NAS（Linux）上执行，当前系统是 $(uname -s)。" >&2
  echo "   在 Windows 上调试请直接在 NAS 的 SSH 里跑，不要用 Git Bash / WSL 去驱动 NAS。" >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

# 后面每个 docker compose 调用都显式带 -f 和 --env-file，再配合 cd 到本目录：
# 不管用户从哪个目录执行脚本，读到的都是同一份 compose 和同一份 .env。
# （Compose 各版本对「.env 从工作目录还是 compose 文件目录加载」的行为不完全一致，
#   显式 --env-file 可以彻底躲开这个坑，也避免误用仓库根目录那份生产 .env。）
cd -- "${SCRIPT_DIR}"

# 出错时统一打中文原因，别让用户只看到一行 "exit code 1"
on_error() {
  local code=$?
  echo "" >&2
  echo "❌ 引导失败（退出码 ${code}）。最后执行的命令：${BASH_COMMAND}" >&2
  echo "   下一步排查建议：" >&2
  echo "     1) 看上面的中文提示，通常已经写明原因" >&2
  echo "     2) docker compose -f \"${COMPOSE_FILE}\" logs --tail=80 db" >&2
  echo "     3) docker compose -f \"${COMPOSE_FILE}\" logs --tail=80 devbox" >&2
  echo "     4) 对照 ${SCRIPT_DIR}/README.md 的「常见故障」一节" >&2
  exit "${code}"
}
trap on_error ERR

die() {
  echo "" >&2
  echo "❌ $*" >&2
  echo "" >&2
  exit 1
}

say_step() {
  echo ""
  echo "──── $* ────"
}

# -----------------------------------------------------------------------------
# 1. 读取配置（.env 不存在就从模板生成一份）
# -----------------------------------------------------------------------------
say_step "1/6 读取配置"

[ -f "${COMPOSE_FILE}" ] || die "找不到 compose 文件：${COMPOSE_FILE}
   本脚本要和 docker-compose.yml 放在同一个目录里。"

ENV_CREATED=0
if [ ! -f "${ENV_FILE}" ]; then
  [ -f "${ENV_EXAMPLE}" ] || die "找不到 ${ENV_EXAMPLE}，仓库文件不完整，请重新 git clone / git pull。"
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  ENV_CREATED=1
else
  echo "  · 已存在 .env，沿用现有配置"
fi

if grep -q $'\r' "${ENV_FILE}" 2>/dev/null; then
  die "${ENV_FILE} 里有 CRLF 换行（多半是在 Windows 记事本里编辑过），
   这会让端口号变成 \"19080\\r\" 之类的东西，docker 会报一堆莫名其妙的错。修复：
     sed -i 's/\\r\$//' \"${ENV_FILE}\""
fi

# 载入 .env（set -a 让变量自动 export 给子进程）
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

DEV_SRC="${DEV_SRC:-/vol2/1000/xuri/src}"
DEV_WEB_PORT="${DEV_WEB_PORT:-19080}"
DEV_BACKEND_PORT="${DEV_BACKEND_PORT:-17007}"
DEV_DB_PORT="${DEV_DB_PORT:-13306}"
DEV_DB_NAME="${DEV_DB_NAME:-surveyking}"
DEV_DB_PASSWORD="${DEV_DB_PASSWORD:-dev-only-change-me}"

if [ "${ENV_CREATED}" = "1" ]; then
  echo "  · 已用 .env.example 生成 .env（当前生效：源码 ${DEV_SRC}，端口 前端 ${DEV_WEB_PORT} / 后端 ${DEV_BACKEND_PORT} / MySQL ${DEV_DB_PORT}）"
fi

case "${DEV_SRC}" in
  /*) ;;
  *) die "DEV_SRC 必须是绝对路径（现在写的是 \"${DEV_SRC}\"）。
   改 ${ENV_FILE} 里的 DEV_SRC，例如 /vol2/1000/xuri/src" ;;
esac

is_port() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

for _p in "${DEV_WEB_PORT}" "${DEV_BACKEND_PORT}" "${DEV_DB_PORT}"; do
  is_port "${_p}" || die "端口 \"${_p}\" 不合法：必须是 1-65535 的整数。
   检查 ${ENV_FILE} 里的 DEV_WEB_PORT / DEV_BACKEND_PORT / DEV_DB_PORT。"
done

if [ "${DEV_WEB_PORT}" = "80" ] || [ "${DEV_BACKEND_PORT}" = "80" ] || [ "${DEV_DB_PORT}" = "80" ]; then
  die "80 端口是飞牛 Web 管理界面占用的，绝对不能用。
   前端默认用 19080，改回 1xxxx 段的四位数端口。"
fi

DEV_ROOT="$(dirname -- "${DEV_SRC}")"
BACKUP_DIR="${DEV_ROOT}/backup"
INIT_SQL="${DEV_SRC}/server/rdbms/src/main/resources/scripts/init-mysql.sql"

CURRENT_UID="$(id -u)"
if [ "${CURRENT_UID}" != "1000" ]; then
  echo "  ⚠️  当前用户 uid=${CURRENT_UID}，不是 1000。"
  echo "     容器内的 dev 用户固定 uid=1000（与飞牛登录用户对齐），"
  echo "     不是 1000 的话，容器里生成的文件在宿主机上可能改不动。"
fi

echo "  · 源码目录：${DEV_SRC}"
echo "  · 备份目录：${BACKUP_DIR}"
echo "  · 端口：前端 ${DEV_WEB_PORT} → 容器 80；后端 ${DEV_BACKEND_PORT} → 容器 7007；MySQL ${DEV_DB_PORT} → 容器 3306"

# -----------------------------------------------------------------------------
# 2. 检查 docker / compose / 权限
# -----------------------------------------------------------------------------
say_step "2/6 检查 Docker 与 Compose"

command -v docker >/dev/null 2>&1 || die "找不到 docker 命令。
   飞牛：应用中心 → 安装「Docker」（不是只装客户端）。装完重新登录一次 SSH。"

if ! docker info >/dev/null 2>&1; then
  die "docker 守护进程不可用。最常见的原因是当前用户不在 docker 组：
     sudo usermod -aG docker \"\${USER}\"
   （docker 是系统服务，飞牛升级不影响它）
   然后**退出 SSH 重新登录**（组权限只在新会话生效），再跑本脚本。
   临时应急：sudo bash ${BASH_SOURCE[0]}（不推荐长期这样）"
fi

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
  echo "  · $(docker compose version --short 2>/dev/null || docker compose version)"
elif command -v docker-compose >/dev/null 2>&1; then
  die "只找到 docker-compose v1，它已停止维护，不支持本文件的 name: / mem_limit 等写法。
   需要 Compose v2（命令是 \`docker compose\`，中间是空格）。
   飞牛一般是自带的；若确实没有，装插件包：sudo apt-get install docker-compose-plugin"
else
  die "没有可用的 Docker Compose（docker compose / docker-compose 都找不到）。
   需要 Compose v2：sudo apt-get install docker-compose-plugin"
fi

# 统一的调用形式：docker compose --env-file <env> -f <compose> <子命令...>
COMPOSE=("${DC[@]}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

# compose 文件语法/变量插值预检：先在这里失败，比 build 到一半失败好定位
"${COMPOSE[@]}" config -q 2>/dev/null \
  || die "compose 文件语法检查没通过（docker compose config -q 失败）。
   常见原因：.env 里某个值带了引号/空格，或者代码被改坏了。
   直接跑下面这条看完整报错：
     ${COMPOSE[*]} config"
echo "  · compose 文件语法检查通过"

# -----------------------------------------------------------------------------
# 3. 准备宿主机目录 + 检查源码
# -----------------------------------------------------------------------------
say_step "3/6 准备目录与源码"

mkdir -p -- "${DEV_SRC}" "${BACKUP_DIR}"
[ -w "${DEV_SRC}" ] || die "${DEV_SRC} 不可写（当前用户 uid=${CURRENT_UID}）。
   用 ls -ld ${DEV_SRC} 看属主，必要时 sudo chown -R 1000:1000 ${DEV_ROOT}"
echo "  · 目录就绪：${DEV_SRC} / ${BACKUP_DIR}"

if [ ! -f "${INIT_SQL}" ]; then
  die "源码还没就绪：找不到
     ${INIT_SQL}
   说明仓库还没克隆到 ${DEV_SRC}。先执行：
     git clone <你的仓库地址> ${DEV_SRC}
   （compose 把这份 SQL 以 bind 方式挂给 MySQL 做首次初始化；
     文件不存在时 compose 会直接拒绝启动，这是故意的，免得你拿到一个空库）"
fi
echo "  · 初始化脚本存在：server/rdbms/src/main/resources/scripts/init-mysql.sql"

# -----------------------------------------------------------------------------
# 4. 端口检查
# -----------------------------------------------------------------------------
say_step "4/6 检查端口占用"

port_listening() {
  local port="$1" addrs=""
  if command -v ss >/dev/null 2>&1; then
    addrs="$(ss -ltnH 2>/dev/null | awk '{print $4}')" || addrs=""
  elif command -v netstat >/dev/null 2>&1; then
    addrs="$(netstat -ltn 2>/dev/null | awk 'NR>2 {print $4}')" || addrs=""
  else
    return 2   # 没有工具，无法判断
  fi
  [ -n "${addrs}" ] || return 1
  printf '%s\n' "${addrs}" | grep -qE "[:.]${port}\$"
}

# 端口是不是被本项目自己的容器占着（重复执行 bootstrap 时的正常情况）
port_owned_by_project() {
  local port="$1"
  docker ps --filter "label=com.docker.compose.project=xuri-dev" \
            --format '{{.Ports}}' 2>/dev/null | grep -q ":${port}->"
}

require_free_port() {
  local port="$1" usage="$2" st=0
  port_listening "${port}" || st=$?
  case "${st}" in
    0)
      if port_owned_by_project "${port}"; then
        echo "  · ${port}（${usage}）已被本项目容器占用 —— 重复执行引导的正常现象，继续"
      else
        die "宿主机端口 ${port}（${usage}）被别的程序占用了。
   查占用者：sudo ss -ltnp 'sport = :${port}'
   换端口：改 ${ENV_FILE} 里对应的变量，然后重跑本脚本。"
      fi
      ;;
    1)
      echo "  · ${port}（${usage}）空闲"
      ;;
    *)
      echo "  ⚠️  没有 ss/netstat，跳过 ${port}（${usage}）的检查，请自行确认"
      ;;
  esac
}

# 80：只报告，不作为错误。飞牛 Web 管理界面占着 80，这是环境既定事实。
_st=0
port_listening 80 || _st=$?
if [ "${_st}" = "0" ]; then
  echo "  · 80 已被占用（飞牛 Web 管理界面，正常）—— 本开发环境不使用宿主机 80"
else
  echo "  · 80 空闲（本开发环境同样不使用宿主机 80）"
fi

require_free_port "${DEV_WEB_PORT}" "前端 Vite"
require_free_port "${DEV_BACKEND_PORT}" "后端 Spring Boot"
require_free_port "${DEV_DB_PORT}" "开发 MySQL"

# -----------------------------------------------------------------------------
# 5. 构建镜像 + 预置命名卷属主
# -----------------------------------------------------------------------------
say_step "5/6 构建 devbox 镜像（首次约 5-15 分钟，取决于网络）"

"${COMPOSE[@]}" build devbox

# 命名卷由 Docker 创建时属主是 root。容器里的 dev 用户（uid=1000）需要能写
# /workspace/client/node_modules 才能 npm ci，所以先以 root 身份跑一次性容器改属主。
# 已经改过就跳过（避免每次 bootstrap 都递归 chown 几十万个文件）。
echo "  · 预置命名卷属主（uid:gid 1000:1000）"
if ! "${COMPOSE[@]}" run --rm --no-deps -T \
      -u "0:0" --entrypoint sh devbox -c '
        for d in /home/dev/.gradle /workspace/client/node_modules; do
          mkdir -p "$d"
          if [ "$(stat -c %u "$d")" != "1000" ]; then
            chown -R 1000:1000 "$d"
          fi
        done
      '; then
  echo "  ⚠️  命名卷属主预置失败（不影响启动，但容器里 npm ci 可能报 EACCES）。"
  echo "     手动修复： ${DC[*]} -f \"${COMPOSE_FILE}\" exec -u 0:0 devbox chown -R 1000:1000 /workspace/client/node_modules"
fi

# -----------------------------------------------------------------------------
# 6. 启动
# -----------------------------------------------------------------------------
say_step "6/6 启动容器"

"${COMPOSE[@]}" up -d --build

"${COMPOSE[@]}" ps

# 自检：容器内非 root（dev, uid 1000）能不能绑 80 —— Vite 起在 80 上就靠这一条 sysctl。
# 拿不到（runtime 不支持 / exec 失败）就只提示，不让脚本失败。
PORT_START="$("${COMPOSE[@]}" exec -T devbox cat /proc/sys/net/ipv4/ip_unprivileged_port_start 2>/dev/null | tr -d '\r\n ' )" || true
case "${PORT_START}" in
  ''|*[!0-9]*)
    echo "  ⚠️  读不到容器内的 ip_unprivileged_port_start，跳过「非 root 绑 80」自检"
    ;;
  *)
    if [ "${PORT_START}" -le 80 ]; then
      echo "  · 容器内 ip_unprivileged_port_start=${PORT_START}：非 root 可以绑 80 ✓"
    else
      echo "  ⚠️  容器内 ip_unprivileged_port_start=${PORT_START} > 80，非 root 绑不了 80，"
      echo "     Vite 启动会报 EACCES。对照 README「常见故障 → Vite 起不来」里的情况 B 处置。"
    fi
    ;;
esac

# 本机局域网地址（拿不到就退化成一个占位符，不让脚本因为取不到 IP 而失败）
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')" || LAN_IP=""
[ -n "${LAN_IP}" ] || LAN_IP="<NAS的IP>"

cat <<EOF

================================================================================
✅ 开发环境已启动
================================================================================
  访问地址（同一局域网内的电脑/手机直接打开）：
    前端页面      http://${LAN_IP}:${DEV_WEB_PORT}
    后端接口      http://${LAN_IP}:${DEV_BACKEND_PORT}/api/system
    MySQL         ${LAN_IP}:${DEV_DB_PORT}  （库 ${DEV_DB_NAME}，用户 root）

  容器：xuri-devbox（开发）/ xuri-dev-db（MySQL）
  数据卷：xuri-dev-node-modules / xuri-dev-gradle-cache / xuri-dev-db-data
  网络：xuri-dev-net（与生产容器不在同一网络，互相解析不到）

--------------------------------------------------------------------------------
接下来怎么进去写代码
--------------------------------------------------------------------------------
  方式 A（最快，先验证环境）：直接在 SSH 里进容器
      ${DC[*]} -f ${COMPOSE_FILE} exec devbox bash

  方式 B（推荐的日常开发方式，VS Code）：
      1. 先在飞牛「系统设置 → SSH」确认 SSH 服务已开启（默认端口 22）
      2. Windows 上装 VS Code，装两个扩展：
           「Remote - SSH」和「Dev Containers」（旧名 Remote - Containers）
      3. 左下角绿色按钮 → Connect to Host… → 填 your_user@${LAN_IP}
         第一次连接要输 NAS 登录密码
      4. 连上后在 VS Code 里打开目录：${DEV_SRC}
      5. 左下角绿色按钮 → "Attach to Running Container…" → 选 xuri-devbox
      6. 在容器窗口里打开文件夹 /workspace（容器内路径，不是宿主机的 ${DEV_SRC}）

  进去之后（容器内）：
      后端：cd server && gradle :api:bootJar -x test
            java -jar api/build/libs/xuri-classroom-v1.13.0.jar
      前端：cd client && npm ci && npm run dev

  注意：前端容器内固定监听 80，所以宿主机只能通过 ${DEV_WEB_PORT} 访问，
        改端口请改 .env 的 DEV_WEB_PORT，不要去改 client/vite.config.ts。

  停止：${DC[*]} -f ${COMPOSE_FILE} down
  清空开发库（会丢数据）：${DC[*]} -f ${COMPOSE_FILE} down -v

  详细说明与故障排查：${SCRIPT_DIR}/README.md
================================================================================
EOF
