#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""结构契约与迁移脚本的一致性检查（CI 与本地共用）。

为什么需要它：数据库结构现在有两处描述——空库建库脚本 init-mysql.sql，和增量迁移
db/migration/*.sql。历史上就出现过"手工加列、脚本没同步 → 项目列表 500"。
这个脚本把"靠人记住"变成"跑一遍就红"。

检查项：
  1. VERSION 与 db/schema.json 的最高版本一致（发版必须登记结构契约）
  2. init-mysql.sql 里确实有最高版本要求的每个表 / 列 / 索引
  3. db/migration/*.sql 命名合法（V主.次.修订__描述.sql）、版本不超过 VERSION
  4. 迁移脚本里没有破坏性语句：
     DROP TABLE / DROP COLUMN / TRUNCATE / DELETE FROM / 没有 WHERE 的 UPDATE
     自动迁移只允许"加表、加列、加索引"，这样程序回滚时旧版本仍能跑。

用法：
  python scripts/release/check_schema.py
退出码：0 通过；1 有问题。任何一条失败都不要发版。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION_FILE = ROOT / "VERSION"
SCHEMA_FILE = ROOT / "server" / "rdbms" / "src" / "main" / "resources" / "db" / "schema.json"
MIGRATION_DIR = ROOT / "server" / "rdbms" / "src" / "main" / "resources" / "db" / "migration"
INIT_SQL = ROOT / "server" / "rdbms" / "src" / "main" / "resources" / "scripts" / "init-mysql.sql"

SCRIPT_RE = re.compile(r"^V(\d+\.\d+\.\d+)__(.+)\.sql$")
REQUIRE_RE = re.compile(r"^(table|column|index):([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?$")

DESTRUCTIVE = [
    (re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE), "DROP TABLE"),
    (re.compile(r"\bDROP\s+COLUMN\b", re.IGNORECASE), "DROP COLUMN"),
    (re.compile(r"\bTRUNCATE\b", re.IGNORECASE), "TRUNCATE"),
    (re.compile(r"\bDELETE\s+FROM\b", re.IGNORECASE), "DELETE FROM"),
]

failures: list[str] = []
notes: list[str] = []


def configure_stdout() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass


def fail(message: str) -> None:
    failures.append(message)


def parse_version(value: str) -> tuple[int, int, int]:
    parts = (value or "").strip().lstrip("vV").split(".")
    numbers = []
    for index in range(3):
        try:
            numbers.append(int(parts[index]))
        except (IndexError, ValueError):
            numbers.append(0)
    return numbers[0], numbers[1], numbers[2]


def strip_comments(sql: str) -> str:
    """去掉 -- 行注释和 /* */ 块注释，避免把说明文字当成语句。"""
    without_block = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return "\n".join(line for line in without_block.splitlines() if not line.strip().startswith("--"))


def parse_init_tables(sql: str) -> dict[str, set[str]]:
    """解析 init-mysql.sql 里每张表的列集合。"""
    tables: dict[str, set[str]] = {}
    for match in re.finditer(r"CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?\s*\((.*?)\n\)\s*ENGINE", sql, re.DOTALL):
        table = match.group(1)
        columns = set()
        for line in match.group(2).splitlines():
            column = re.match(r"\s*`(\w+)`\s", line)
            if column:
                columns.add(column.group(1))
        tables[table] = columns
    return tables


def check_version_matches_schema(version: str, schema: dict) -> None:
    versions = [str(item.get("version", "")) for item in schema.get("versions", [])]
    if not versions:
        fail("schema.json 里没有任何 versions")
        return
    highest = max(versions, key=parse_version)
    if parse_version(highest) != parse_version(version):
        fail(
            "VERSION(" + version + ") 与 db/schema.json 的最高版本(" + highest + ") 不一致："
            "发版时必须在 schema.json 里登记本版本的结构要求"
        )


def check_requires_format(schema: dict) -> None:
    for item in schema.get("versions", []):
        version = str(item.get("version", ""))
        for require in item.get("requires", []) or []:
            match = REQUIRE_RE.match(str(require))
            if not match:
                fail("schema.json 版本 " + version + " 的 requires 格式不对：" + str(require))
            elif match.group(1) != "table" and not match.group(3):
                fail("schema.json 版本 " + version + " 的 " + str(require) + " 缺少 .对象名")


def check_init_has_requires(sql: str, schema: dict) -> None:
    tables = parse_init_tables(sql)
    if not tables:
        fail("从 init-mysql.sql 里没解析出任何 CREATE TABLE，检查文件是否完整")
        return
    notes.append("init-mysql.sql 解析到 " + str(len(tables)) + " 张表")

    for item in schema.get("versions", []):
        version = str(item.get("version", ""))
        for require in item.get("requires", []) or []:
            match = REQUIRE_RE.match(str(require))
            if not match:
                continue
            kind, table, detail = match.group(1), match.group(2), match.group(3)
            if kind == "table":
                if table not in tables:
                    fail("schema.json 要求 " + version + " 有表 " + table + "，但 init-mysql.sql 里没有")
                continue
            if table not in tables:
                fail("schema.json 要求 " + table + "." + str(detail) + "，但 init-mysql.sql 里没有这张表")
                continue
            if kind == "column":
                if detail not in tables[table]:
                    fail("schema.json 要求列 " + table + "." + str(detail) + "，但 init-mysql.sql 的建表语句里没有")
            elif kind == "index":
                if not re.search(r"KEY\s+`?" + re.escape(str(detail)) + r"`?\b", sql):
                    fail("schema.json 要求索引 " + str(detail) + "，但 init-mysql.sql 里找不到")


def check_migrations(version: str) -> None:
    if not MIGRATION_DIR.exists():
        fail("迁移目录不存在：" + str(MIGRATION_DIR))
        return
    scripts = sorted(MIGRATION_DIR.glob("*.sql"))
    if not scripts:
        fail("db/migration 里没有 SQL 文件")
        return
    notes.append("迁移脚本 " + str(len(scripts)) + " 个")

    for script in scripts:
        match = SCRIPT_RE.match(script.name)
        if not match:
            fail("迁移脚本命名不合规（应为 V主.次.修订__描述.sql）：" + script.name)
            continue
        script_version = match.group(1)
        if parse_version(script_version) > parse_version(version):
            fail("迁移脚本 " + script.name + " 的版本高于 VERSION(" + version + ")")

        body = strip_comments(script.read_text(encoding="utf-8"))
        for pattern, label in DESTRUCTIVE:
            if pattern.search(body):
                fail("迁移脚本 " + script.name + " 含有破坏性语句 " + label + "：自动迁移只允许加表/加列/加索引")

        for update in re.finditer(r"\bUPDATE\s+\w+\s+SET\b(.*?);", body, re.IGNORECASE | re.DOTALL):
            if not re.search(r"\bWHERE\b", update.group(1), re.IGNORECASE):
                fail("迁移脚本 " + script.name + " 里有不带 WHERE 的 UPDATE：可能改到全表")


def main() -> int:
    configure_stdout()
    if not VERSION_FILE.exists():
        print("错误：缺少 VERSION")
        return 1
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        print("错误：VERSION 不是 x.y.z：" + repr(version))
        return 1

    if not SCHEMA_FILE.exists():
        print("错误：缺少 db/schema.json")
        return 1
    try:
        schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        print("错误：db/schema.json 不是合法 JSON：" + str(error))
        return 1

    check_version_matches_schema(version, schema)
    check_requires_format(schema)
    check_init_has_requires(INIT_SQL.read_text(encoding="utf-8"), schema)
    check_migrations(version)

    for note in notes:
        print("  · " + note)
    if failures:
        print("")
        print("结构检查未通过（" + str(len(failures)) + " 项）：")
        for item in failures:
            print("  ✗ " + item)
        return 1
    print("结构检查通过：VERSION " + version + " 与 init-mysql.sql、db/migration 一致")
    return 0


if __name__ == "__main__":
    sys.exit(main())
