#!/usr/bin/env bash
# =============================================================================
# 第 1 步：备份 + 把 H2 库导出成 SQL（在飞牛 NAS 上执行，用 sudo）
#
# 为什么要停一下容器：H2 是单文件库，运行时文件被 JVM 独占锁着，
# 直接在运行中 cp 有可能拷到写了一半的坏文件。停 5~15 秒拷 46MB 就够。
#
# 产物（都在 /vol2/1000/xuri/work/）：
#   db-copy/            H2 库的工作副本（后面所有解析都只碰副本）
#   files-copy/         附件副本
#   dump.sql            H2 导出的 schema + 数据
#   surveyking.jar      从镜像里取出来的包（用来读 h2 jar 和配置）
#   jarx/.../h2-*.jar   H2 工具 jar
#
# 用法：
#   sudo bash scripts/nas/migrate/01-dump.sh
# =============================================================================
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
SRC_DIR="${SRC_DIR:-/vol2/1000/surveyking}"
WORK="${WORK:-/vol2/1000/xuri/work}"
BACKUP="${BACKUP:-/vol2/1000/xuri/backup}"
CONTAINER="${CONTAINER:-surveyking}"
IMAGE="${IMAGE:-surveyking/surveyking:latest}"

DOCKER="docker"
docker info >/dev/null 2>&1 || DOCKER="sudo docker"

say() { printf '\n──── %s ────\n' "$*"; }
die() { printf '\n❌ %s\n\n' "$*" >&2; exit 1; }

[ -d "${SRC_DIR}/db" ] || die "找不到 ${SRC_DIR}/db"
mkdir -p "${WORK}" "${BACKUP}"
cd "${WORK}"

say "1/5 从镜像里取出 jar（不用停容器）"
$DOCKER cp "${CONTAINER}:/app/surveyking.jar" ./surveyking.jar
unzip -l surveyking.jar | grep -E "BOOT-INF/lib/h2-" || die "镜像里没找到 h2 jar"
unzip -o -q surveyking.jar "BOOT-INF/lib/h2-*.jar" -d ./jarx
H2_JAR="$(ls -1 ./jarx/BOOT-INF/lib/h2-*.jar | head -1)"
echo "  · H2 工具：${H2_JAR}"

say "2/5 停容器 ${CONTAINER}（约 5~15 秒）"
$DOCKER stop "${CONTAINER}" >/dev/null
trap 'echo "!! 出错，立刻把 ${CONTAINER} 拉起来"; $DOCKER start "${CONTAINER}" >/dev/null 2>&1 || true' ERR

say "3/5 备份原始数据"
BK="${BACKUP}/surveyking-pre-migration-${STAMP}.tar.gz"
tar czf "${BK}" -C "$(dirname "${SRC_DIR}")" "$(basename "${SRC_DIR}")"
sha256sum "${BK}" | tee "${BK}.sha256"
echo "  · $(du -h "${BK}" | cut -f1)  ${BK}"

say "4/5 复制工作副本"
rm -rf db-copy files-copy
cp -a "${SRC_DIR}/db" ./db-copy
cp -a "${SRC_DIR}/files" ./files-copy
ls -la db-copy

say "5/5 拉起原容器，然后在副本上导出 H2"
$DOCKER start "${CONTAINER}" >/dev/null
trap - ERR
sleep 2
$DOCKER ps --filter "name=${CONTAINER}" --format '  · {{.Names}} {{.Status}}'

rm -f dump.sql
$DOCKER run --rm --entrypoint java \
  -v "${WORK}":/work -w /work \
  "${IMAGE}" \
  -cp "/work/${H2_JAR#./}" org.h2.tools.Script \
  -url "jdbc:h2:/work/db-copy/surveyking" \
  -user sa -password "" \
  -script /work/dump.sql || die "导出失败（H2 用户名/密码或库名不对，看上面的报错）"

ls -lh /work/dump.sql
echo "  · 表数量：$(grep -c '^CREATE TABLE' /work/dump.sql || true)"
echo "  · INSERT 行数：$(grep -c '^INSERT INTO' /work/dump.sql || true)"
echo "  · 前 5 张表："; grep '^CREATE TABLE' /work/dump.sql | head -5

say "完成"
echo "SQL：${WORK}/dump.sql"
echo "备份：${BK}"
