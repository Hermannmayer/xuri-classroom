#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""旭日云课堂版本与发版脚本（零依赖，Python 3.8+）。

版本规则（语义化版本 2.0.0）：
  - feat                  -> MINOR
  - fix / perf            -> PATCH
  - BREAKING CHANGE / !   -> MAJOR
  - 其余提交              -> 不发版

版本唯一真源是仓库根目录的 VERSION 文件；本脚本负责：
  - 校验 VERSION / CHANGELOG / client/package.json / server/pom.xml 一致
  - 按 conventional commits 计算下一个版本
  - 写入 VERSION、CHANGELOG、package.json、pom.xml
  - 提交版本文件并打 vX.Y.Z tag（不 push）

真正的安装包由 GitHub Actions 在 tag 上构建，本脚本不本地打包。

用法：
  python scripts/release/release.py plan --bump auto
  python scripts/release/release.py check --tag
  python scripts/release/release.py bump --version 2.0.0
  python scripts/release/release.py tag --version 2.0.0
  python scripts/release/release.py notes --version 2.0.0 --out RELEASE_NOTES.md
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[2]
VERSION_FILE = ROOT / "VERSION"
CHANGELOG_FILE = ROOT / "CHANGELOG.md"
PACKAGE_JSON = ROOT / "client" / "package.json"
POM_FILE = ROOT / "server" / "pom.xml"
APPLICATION_YML = ROOT / "server" / "api" / "src" / "main" / "resources" / "application.yml"
MARKER = "<!-- version list -->"

# 这个仓库从 2.0.0 起启用语义化发版；更早的 v0.x tag 是上游 2021 年的历史，不参与计算。
MIN_TAG_VERSION = (2, 0, 0)

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")
TAG_RE = re.compile(r"^v(\d+\.\d+\.\d+)$")
HEADER_RE = re.compile(
    r"^(?P<type>[A-Za-z]+)(?:\((?P<scope>[^)]+)\))?(?P<breaking>!)?:\s*(?P<subject>.+)$"
)

GROUPS: List[Tuple[str, str]] = [
    ("feat", "新功能"),
    ("fix", "修复"),
    ("perf", "性能"),
    ("refactor", "重构"),
    ("docs", "文档"),
    ("build", "构建"),
    ("ci", "持续集成"),
    ("test", "测试"),
    ("style", "样式"),
    ("chore", "其他"),
    ("revert", "回滚"),
]


class ReleaseError(SystemExit):
    pass


def fail(message: str) -> None:
    print("错误：" + message, file=sys.stderr)
    raise ReleaseError(1)


def configure_stdout() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    proc = subprocess.run(
        ["git", *args],
        cwd=str(ROOT),
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    if check and proc.returncode != 0:
        fail("git " + " ".join(args) + " 失败：\n" + (proc.stderr or proc.stdout).strip())
    return proc


def read_version() -> str:
    if not VERSION_FILE.exists():
        fail("缺少 " + str(VERSION_FILE))
    raw = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not SEMVER_RE.fullmatch(raw):
        fail("VERSION 内容不是 x.y.z：" + repr(raw))
    return raw


def parse_version(value: str) -> Tuple[int, int, int]:
    match = SEMVER_RE.fullmatch(value.strip())
    if not match:
        fail("版本号不是 x.y.z：" + repr(value))
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def format_version(parts: Tuple[int, int, int]) -> str:
    return "{}.{}.{}".format(parts[0], parts[1], parts[2])


def last_tag(current: Optional[str] = None) -> Optional[str]:
    current_version = parse_version(current or read_version())
    proc = git("tag", "--list", "v*", "--sort=-version:refname", check=False)
    if proc.returncode != 0:
        return None
    for line in proc.stdout.splitlines():
        tag = line.strip()
        match = TAG_RE.fullmatch(tag)
        if not match:
            continue
        parts = parse_version(match.group(1))
        if parts < MIN_TAG_VERSION:
            continue
        if parts <= current_version:
            return tag
    return None


def commits_since(tag: Optional[str]) -> List[Dict[str, Any]]:
    log_range = (tag + "..HEAD") if tag else "HEAD"
    proc = git(
        "log",
        "--no-merges",
        "--pretty=format:%H%x1f%s%x1f%b%x1e",
        log_range,
        check=False,
    )
    if proc.returncode != 0:
        fail("git log 失败：" + (proc.stderr or proc.stdout).strip())
    commits: List[Dict[str, Any]] = []
    for record in proc.stdout.split("\x1e"):
        record = record.strip("\n")
        if not record.strip():
            continue
        fields = record.split("\x1f")
        if len(fields) < 2:
            continue
        full_hash = fields[0].strip()
        subject = fields[1].strip()
        body = fields[2] if len(fields) > 2 else ""
        parsed = HEADER_RE.match(subject)
        if not parsed:
            continue
        commit_type = parsed.group("type").lower()
        scope = (parsed.group("scope") or "").strip()
        text = parsed.group("subject").strip()
        breaking = bool(parsed.group("breaking")) or bool(
            re.search(r"BREAKING[ -]CHANGE:", body, re.IGNORECASE)
        )
        commits.append(
            {
                "hash": full_hash,
                "type": commit_type,
                "scope": scope,
                "subject": text,
                "breaking": breaking,
            }
        )
    return commits


def bump_from_commits(commits: List[Dict[str, Any]]) -> str:
    level = 0
    for commit in commits:
        if commit["breaking"]:
            return "major"
        if commit["type"] == "feat":
            level = max(level, 2)
        elif commit["type"] in ("fix", "perf"):
            level = max(level, 1)
    if level == 2:
        return "minor"
    if level == 1:
        return "patch"
    return "none"


def next_version(current: str, bump: str) -> str:
    major, minor, patch = parse_version(current)
    if bump == "major":
        return format_version((major + 1, 0, 0))
    if bump == "minor":
        return format_version((major, minor + 1, 0))
    if bump == "patch":
        return format_version((major, minor, patch + 1))
    return current


def latest_changelog_version() -> str:
    if not CHANGELOG_FILE.exists():
        fail("缺少 CHANGELOG.md")
    text = CHANGELOG_FILE.read_text(encoding="utf-8")
    match = re.search(r"^## v(\d+\.\d+\.\d+)\b", text, re.MULTILINE)
    if not match:
        fail("CHANGELOG.md 里找不到 ## vX.Y.Z 版本段")
    return match.group(1)


def package_json_version() -> str:
    if not PACKAGE_JSON.exists():
        fail("缺少 client/package.json")
    data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    return str(data.get("version", ""))


def pom_version() -> str:
    if not POM_FILE.exists():
        fail("缺少 server/pom.xml")
    text = POM_FILE.read_text(encoding="utf-8")
    match = re.search(r"<revision>\s*v?([^<]+?)\s*</revision>", text)
    if not match:
        fail("server/pom.xml 里找不到 <revision>")
    return match.group(1).strip()


def application_version_token() -> str:
    if not APPLICATION_YML.exists():
        fail("缺少 server/api/src/main/resources/application.yml")
    text = APPLICATION_YML.read_text(encoding="utf-8")
    match = re.search(r"^version:\s*(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def update_version_file(version: str) -> None:
    VERSION_FILE.write_text(version + "\n", encoding="utf-8", newline="\n")


def update_package_json(version: str) -> None:
    text = PACKAGE_JSON.read_text(encoding="utf-8")
    new_text, count = re.subn(
        r'("version"\s*:\s*")[^"]+(")',
        r"\g<1>" + version + r"\g<2>",
        text,
        count=1,
    )
    if count != 1:
        fail("client/package.json 里找不到 version 字段")
    PACKAGE_JSON.write_text(new_text, encoding="utf-8", newline="\n")


def update_pom(version: str) -> None:
    text = POM_FILE.read_text(encoding="utf-8")
    new_text, count = re.subn(
        r"<revision>\s*v?[^<]+?\s*</revision>",
        "<revision>" + version + "</revision>",
        text,
        count=1,
    )
    if count != 1:
        fail("server/pom.xml 里找不到 <revision>")
    POM_FILE.write_text(new_text, encoding="utf-8", newline="\n")


def build_changelog_section(version: str, commits: List[Dict[str, Any]], notes: Optional[str]) -> str:
    today = date.today().isoformat()
    lines: List[str] = ["## v{} ({})".format(version, today), ""]
    if notes:
        lines.append(notes.strip())
        lines.append("")
        return "\n".join(lines).rstrip() + "\n"

    breaking = [c for c in commits if c["breaking"]]
    if breaking:
        lines.append("### 破坏性变更")
        lines.append("")
        for commit in breaking:
            scope = "**" + commit["scope"] + "**: " if commit["scope"] else ""
            lines.append("- " + scope + commit["subject"] + " (`" + commit["hash"][:7] + "`)")
        lines.append("")

    for commit_type, title in GROUPS:
        items = [c for c in commits if c["type"] == commit_type and not c["breaking"]]
        if commit_type == "chore":
            items = [
                c
                for c in items
                if not c["subject"].lower().startswith("release:")
                and not c["subject"].lower().startswith("版本")
            ]
        if not items:
            continue
        lines.append("### " + title)
        lines.append("")
        for commit in items:
            scope = "**" + commit["scope"] + "**: " if commit["scope"] else ""
            lines.append("- " + scope + commit["subject"] + " (`" + commit["hash"][:7] + "`)")
        lines.append("")

    if len(lines) == 2:
        lines.append("### 其他")
        lines.append("")
        lines.append("- 维护性更新（本次没有 feat/fix/perf 类型的提交）")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def insert_changelog_section(version: str, section: str) -> None:
    text = CHANGELOG_FILE.read_text(encoding="utf-8")
    if MARKER not in text:
        fail("CHANGELOG.md 缺少标记：" + MARKER)
    pattern = re.compile(r"^## v" + re.escape(version) + r"\b.*?(?=^## v|\Z)", re.MULTILINE | re.DOTALL)
    text = pattern.sub("", text)
    head, sep, tail = text.partition(MARKER)
    new_text = head + sep + "\n\n" + section.strip() + "\n" + tail.lstrip("\n")
    CHANGELOG_FILE.write_text(new_text, encoding="utf-8", newline="\n")


def extract_changelog_section(version: str) -> str:
    text = CHANGELOG_FILE.read_text(encoding="utf-8")
    pattern = re.compile(r"^## v" + re.escape(version) + r"\b.*?(?=^## v|\Z)", re.MULTILINE | re.DOTALL)
    match = pattern.search(text)
    if not match:
        fail("CHANGELOG.md 里找不到 v" + version + " 段")
    return match.group(0).rstrip() + "\n"


def cmd_plan(args: argparse.Namespace) -> int:
    current = read_version()
    tag = last_tag(current)
    commits = commits_since(tag) if tag else []
    bump = args.bump
    if bump == "auto":
        bump = bump_from_commits(commits) if commits else "none"
    suggested = next_version(current, bump)
    payload = {
        "current": current,
        "lastTag": tag,
        "commitCount": len(commits),
        "bump": bump,
        "next": suggested,
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    elif args.print_version:
        print(suggested)
    else:
        print("当前版本：" + current)
        print("最近 tag：" + (tag or "（无；首个 2.x 版本请用 --version 指定）"))
        print("提交数量：" + str(len(commits)))
        print("建议递增：" + bump)
        print("下一个版本：" + suggested)
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    version = read_version()
    errors: List[str] = []

    changelog_version = latest_changelog_version()
    if changelog_version != version:
        errors.append("VERSION = {} 但 CHANGELOG 最新段 = {}".format(version, changelog_version))

    package_version = package_json_version()
    if package_version != version:
        errors.append("VERSION = {} 但 client/package.json = {}".format(version, package_version))

    pom = pom_version()
    if pom != version:
        errors.append("VERSION = {} 但 server/pom.xml revision = {}".format(version, pom))

    token = application_version_token()
    if token != "@projectVersion@":
        errors.append("application.yml 的 version 必须是 @projectVersion@，当前是 " + repr(token))

    if args.tag:
        proc = git("describe", "--tags", "--exact-match", "HEAD", check=False)
        if proc.returncode != 0:
            errors.append("HEAD 没有 vX.Y.Z tag")
        else:
            tag = proc.stdout.strip()
            if tag != "v" + version:
                errors.append("HEAD tag = {} 但 VERSION = {}".format(tag, version))

    if errors:
        print("版本一致性校验失败：", file=sys.stderr)
        for error in errors:
            print("  - " + error, file=sys.stderr)
        return 1

    print("版本一致性校验通过：" + version)
    return 0


def cmd_bump(args: argparse.Namespace) -> int:
    current = read_version()
    if args.version:
        version = args.version
    else:
        tag = last_tag(current)
        commits = commits_since(tag) if tag else []
        bump = args.bump
        if bump == "auto":
            bump = bump_from_commits(commits) if commits else "none"
        version = next_version(current, bump)

    parse_version(version)
    if parse_version(version) < parse_version(current):
        fail("新版本 " + version + " 不能小于当前版本 " + current)

    notes = None
    if args.notes:
        notes_path = Path(args.notes)
        if not notes_path.exists():
            fail("notes 文件不存在：" + str(notes_path))
        notes = notes_path.read_text(encoding="utf-8")

    tag = last_tag(current)
    commits = commits_since(tag) if tag else []
    if not notes and not commits:
        notes = "维护性更新。"

    section = build_changelog_section(version, commits, notes)
    update_version_file(version)
    update_package_json(version)
    update_pom(version)
    insert_changelog_section(version, section)
    print("已写入版本：" + version)
    print("  - VERSION")
    print("  - CHANGELOG.md")
    print("  - client/package.json")
    print("  - server/pom.xml")
    return 0


def cmd_tag(args: argparse.Namespace) -> int:
    version = args.version or read_version()
    parse_version(version)

    files = ["VERSION", "CHANGELOG.md", "client/package.json", "server/pom.xml"]
    existing = [f for f in files if (ROOT / f).exists()]
    git("add", *existing, check=True)

    status = git("status", "--porcelain", check=False).stdout.strip()
    if status:
        git("commit", "-m", "chore(release): v" + version)
        print("已提交：chore(release): v" + version)
    else:
        print("版本文件没有变化，跳过提交")

    tag_name = "v" + version
    exists = git("tag", "--list", tag_name, check=False).stdout.strip()
    if exists:
        fail("tag 已存在：" + tag_name)
    git("tag", "-a", tag_name, "-m", tag_name)
    print("已打 tag：" + tag_name)
    print("下一步：git push origin main --tags（或 .\\scripts\\release\\Release.ps1 -Push）")
    return 0


def cmd_notes(args: argparse.Namespace) -> int:
    version = args.version or read_version()
    section = extract_changelog_section(version)
    if args.out:
        Path(args.out).write_text(section, encoding="utf-8", newline="\n")
        print("已写入 " + args.out)
    else:
        print(section)
    return 0


def cmd_commits(args: argparse.Namespace) -> int:
    tag = args.since or last_tag()
    commits = commits_since(tag)
    for commit in commits:
        print(
            "{}  {}{}: {}".format(
                commit["hash"][:7],
                commit["type"],
                "(" + commit["scope"] + ")" if commit["scope"] else "",
                commit["subject"],
            )
        )
    print("共 " + str(len(commits)) + " 条（自 " + (tag or "HEAD") + "）")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="旭日云课堂版本与发版脚本")
    sub = parser.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan", help="计算下一个版本（不改文件）")
    plan.add_argument("--bump", default="auto", choices=["auto", "major", "minor", "patch", "none"])
    plan.add_argument("--json", action="store_true")
    plan.add_argument("--print-version", action="store_true")
    plan.set_defaults(func=cmd_plan)

    check = sub.add_parser("check", help="校验版本一致性")
    check.add_argument("--tag", action="store_true", help="同时校验 HEAD 的 tag")
    check.set_defaults(func=cmd_check)

    bump = sub.add_parser("bump", help="写入新版本与 CHANGELOG")
    bump.add_argument("--version")
    bump.add_argument("--bump", default="auto", choices=["auto", "major", "minor", "patch", "none"])
    bump.add_argument("--notes", help="用文件内容作为本版本说明")
    bump.set_defaults(func=cmd_bump)

    tag = sub.add_parser("tag", help="提交版本文件并打 tag（不 push）")
    tag.add_argument("--version")
    tag.set_defaults(func=cmd_tag)

    notes = sub.add_parser("notes", help="抽取 CHANGELOG 版本段")
    notes.add_argument("--version")
    notes.add_argument("--out")
    notes.set_defaults(func=cmd_notes)

    commits = sub.add_parser("commits", help="列出上次 tag 以来的 conventional commits")
    commits.add_argument("--since")
    commits.set_defaults(func=cmd_commits)

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    configure_stdout()
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
