#!/usr/bin/env python3
"""生成 update.json：客户端自动升级用的机器可读清单。

为什么需要它：release 里的资产名字带版本号，客户端没法猜；SHA256SUMS 是给人看的文本。
这个文件把「哪个平台、下载地址、多大、sha256 多少」一次性说清，三端升级脚本只读它。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path


PLATFORM_RULES = [
    (re.compile(r"-windows-x64\.zip$"), "windows"),
    (re.compile(r"-docker\.tar\.gz$"), "docker"),
    (re.compile(r"-linux-x64\.tar\.gz$"), "linux"),
    (re.compile(r"\.jar$"), "jar"),
]


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def platform_of(name: str) -> str | None:
    for pattern, key in PLATFORM_RULES:
        if pattern.search(name):
            return key
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--notes", default="")
    parser.add_argument("--out", required=True)
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "Hermannmayer/xuri-classroom"))
    parser.add_argument("--channel", default="stable")
    args = parser.parse_args()

    dist = Path(args.dist)
    if not dist.is_dir():
        raise SystemExit(f"dist 目录不存在：{dist}")

    notes = ""
    if args.notes and Path(args.notes).exists():
        notes = Path(args.notes).read_text(encoding="utf-8", errors="replace")[:4000]

    assets: dict[str, dict] = {}
    for item in sorted(dist.iterdir()):
        if not item.is_file():
            continue
        key = platform_of(item.name)
        if key is None:
            continue
        assets[key] = {
            "file": item.name,
            "url": f"https://github.com/{args.repo}/releases/download/v{args.version}/{item.name}",
            "size": item.stat().st_size,
            "sha256": sha256_of(item),
        }

    if not assets:
        raise SystemExit("dist 里没有可识别的发布资产（zip / tar.gz / jar）")

    manifest = {
        "version": args.version,
        "channel": args.channel,
        "publishedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "notes": notes,
        "assets": assets,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"update.json 已生成：{out}（{len(assets)} 个平台资产）")
    for key in assets:
        print(f"  {key}: {assets[key]['file']} ({assets[key]['size']} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())