#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 docker/compose-online.yaml：把 init-mysql.sql 内联进 compose，得到可 curl 管道直接 up 的单文件编排。

用法：python3 scripts/deploy/gen-compose-online.py
改动 init-mysql.sql、端口或镜像默认值后重跑一次；文档引用生成出来的文件。
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INIT_SQL = ROOT / "server" / "rdbms" / "src" / "main" / "resources" / "scripts" / "init-mysql.sql"
TARGET = ROOT / "docker" / "compose-online.yaml"
DOLLAR = chr(36)

HEADER = """# 旭日云课堂 · 在线单文件编排（GHCR 镜像 + mysql:8.0，内联空库初始化 SQL）
#
# 与 docker/docker-compose.release.yml 等价，区别是 init-mysql.sql 内联在文件末尾的
# configs.init_sql.content 里，所以除了 .env 之外不需要在机器上准备任何文件：
#
#   mkdir -p /opt/xuri-classroom && cd /opt/xuri-classroom
#   umask 077
#   { echo \"DB_PASSWORD=$(openssl rand -hex 16)\"; echo \"JWT_SECRET=$(openssl rand -base64 48)\"; } > .env
#   curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/docker/compose-online.yaml \\
#     | docker compose --env-file .env -f - up -d
#
# 注意：
#   · Compose 不支持直接读 HTTP URL（-f https://... 会被当成相对路径），只能走管道
#   · 本文件由 scripts/deploy/gen-compose-online.py 生成，不要手改
#   · 内联 SQL 含 25 处 DROP TABLE，只在数据卷为空时执行一次
"""

BODY = """name: xuri-classroom

services:

  db:
    image: mysql:8.0
    restart: unless-stopped
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --innodb-buffer-pool-size=256M
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:?请在 .env 里设置 DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME:-surveyking}
      MYSQL_USER: ${DB_USER:-xuri}
      MYSQL_PASSWORD: ${DB_PASSWORD:?请在 .env 里设置 DB_PASSWORD}
      TZ: Asia/Shanghai
    volumes:
      - db-data:/var/lib/mysql
    configs:
      - source: init_sql
        target: /docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ['CMD-SHELL', 'mysqladmin ping -h 127.0.0.1 -uroot -p"$${MYSQL_ROOT_PASSWORD}" --silent']
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 30s
    stop_grace_period: 30s
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'

  app:
    image: ${XURI_IMAGE:-ghcr.io/hermannmayer/xuri-classroom}:${VERSION:-latest}
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "${APP_PORT:-8080}:8080"
    environment:
      DB_HOST: db
      DB_PORT: '3306'
      DB_NAME: ${DB_NAME:-surveyking}
      DB_USER: ${DB_USER:-xuri}
      DB_PASSWORD: ${DB_PASSWORD:?请在 .env 里设置 DB_PASSWORD}
      SPRING_DATASOURCE_URL: "jdbc:mysql://db:3306/${DB_NAME:-surveyking}?rewriteBatchedStatements=true&useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai"
      SPRING_DATASOURCE_USERNAME: ${DB_USER:-xuri}
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD:?请在 .env 里设置 DB_PASSWORD}
      SK_JWT_SECRET: ${JWT_SECRET:?请在 .env 里设置 JWT_SECRET}
      SK_WEB_SPA_ENABLED: 'true'
      FILE_STORAGE_LOCAL_ROOT_PATH: /app/files
      JAVA_TOOL_OPTIONS: ${JAVA_OPTS:--Xmx768m}
      TZ: Asia/Shanghai
    volumes:
      - app-files:/app/files
    stop_grace_period: 30s
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'

volumes:

  db-data:
    name: xuri-classroom-db-data
  app-files:
    name: xuri-classroom-app-files

configs:

  init_sql:
    content: |
"""


def build() -> str:
    if not INIT_SQL.exists():
        raise SystemExit("找不到初始化脚本：" + str(INIT_SQL))
    sql = INIT_SQL.read_text(encoding="utf-8").replace("\r\n", "\n")
    body = []
    for line in sql.splitlines():
        if not line.strip():
            body.append("")
            continue
        body.append("      " + line.replace(DOLLAR, DOLLAR + DOLLAR))
    return HEADER + "\n" + BODY + "\n".join(body) + "\n"


def main() -> int:
    text = build()
    TARGET.write_text(text, encoding="utf-8", newline="\n")
    print("已生成 " + str(TARGET.relative_to(ROOT)) + "（" + str(len(text)) + " 字节）")
    return 0


if __name__ == "__main__":
    sys.exit(main())