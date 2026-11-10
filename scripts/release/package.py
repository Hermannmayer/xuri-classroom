#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把构建好的 jar 组装成三端发布产物（GitHub Actions 和本地调试共用）。

产物：
  xuri-classroom-<version>-windows-x64.zip
  xuri-classroom-<version>-linux-x64.tar.gz
  xuri-classroom-<version>-docker.tar.gz
  xuri-classroom-<version>.jar
  SHA256SUMS

Windows/Linux 包不内置 JRE 和 MySQL：JRE/MySQL 由首次启动向导从国内镜像下载。
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
import tarfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_JAR = ROOT / "server" / "api" / "build" / "libs"
INIT_SQL = ROOT / "server" / "rdbms" / "src" / "main" / "resources" / "scripts" / "init-mysql.sql"
WINDOWS_TEMPLATE = ROOT / "scripts" / "release" / "windows"
LINUX_TEMPLATE = ROOT / "scripts" / "release" / "linux"
DOCKER_TEMPLATE = ROOT / "docker"


def configure_stdout() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass


def fail(message: str) -> None:
    print("错误：" + message, file=sys.stderr)
    raise SystemExit(1)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        fail("模板目录不存在：" + str(src))
    for item in src.rglob("*"):
        if item.is_dir():
            continue
        # 打包模板里的维护者文件不进用户包
        if item.name in (".gitattributes", ".gitkeep", "PACKAGING.md"):
            continue
        target = dst / item.relative_to(src)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, target)


def validate_jar(jar: Path, version: str) -> None:
    if not jar.exists():
        fail("jar 不存在：" + str(jar))
    with zipfile.ZipFile(jar) as archive:
        names = set(archive.namelist())
        if "BOOT-INF/classes/static/index.html" not in names:
            fail("jar 里没有 BOOT-INF/classes/static/index.html，构建时是否漏了 -PwithSpa？")
        application = archive.read("BOOT-INF/classes/application.yml").decode("utf-8", "replace")
        if "version: " + version not in application:
            fail("jar 的 application.yml 版本不是 " + version + "，检查 VERSION / Gradle 过滤")
        if "version: @projectVersion@" in application:
            fail("jar 的 application.yml 仍是 @projectVersion@ 占位符，processResources 没有替换")


def write_zip(src_dir: Path, output: Path) -> None:
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for item in sorted(src_dir.rglob("*")):
            if item.is_file():
                archive.write(item, item.relative_to(src_dir.parent).as_posix())


def write_tar(src_dir: Path, output: Path) -> None:
    with tarfile.open(output, "w:gz") as archive:
        for item in sorted(src_dir.rglob("*")):
            arcname = item.relative_to(src_dir.parent).as_posix()
            info = archive.gettarinfo(str(item), arcname=arcname)
            if item.is_file():
                if item.suffix == ".sh":
                    info.mode = 0o755
                else:
                    info.mode = 0o644
                with item.open("rb") as handle:
                    archive.addfile(info, handle)
            else:
                archive.addfile(info)


def build_windows(version: str, jar: Path, out: Path) -> Path:
    launcher = WINDOWS_TEMPLATE / "lib" / "launcher.ps1"
    if not launcher.exists():
        fail("Windows 模板缺少 lib/launcher.ps1")
    if launcher.read_bytes()[:3] != b"\xef\xbb\xbf":
        fail("lib/launcher.ps1 缺少 UTF-8 BOM；PowerShell 5.1 会把中文按 GBK 读成乱码并解析失败")

    name = "xuri-classroom-" + version + "-windows-x64"
    staging = out / "staging" / name
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    copy_tree(WINDOWS_TEMPLATE, staging)
    (staging / "VERSION").write_text(version + "\n", encoding="utf-8", newline="\n")
    (staging / "app").mkdir(parents=True, exist_ok=True)
    shutil.copy2(jar, staging / "app" / ("xuri-classroom-" + version + ".jar"))
    shutil.copy2(INIT_SQL, staging / "app" / "init-mysql.sql")

    for required in ["start.cmd", "setup.cmd", "doctor.cmd", "lib/launcher.ps1"]:
        if not (staging / required).exists():
            fail("Windows 模板缺少 " + required)

    output = out / (name + ".zip")
    if output.exists():
        output.unlink()
    write_zip(staging, output)
    return output


def build_linux(version: str, jar: Path, out: Path) -> Path:
    name = "xuri-classroom-" + version + "-linux-x64"
    staging = out / "staging" / name
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    copy_tree(LINUX_TEMPLATE, staging)
    (staging / "VERSION").write_text(version + "\n", encoding="utf-8", newline="\n")
    (staging / "app").mkdir(parents=True, exist_ok=True)
    shutil.copy2(jar, staging / "app" / ("xuri-classroom-" + version + ".jar"))
    shutil.copy2(INIT_SQL, staging / "app" / "init-mysql.sql")

    for required in ["install.sh", "uninstall.sh", "app.env.example"]:
        if not (staging / required).exists():
            fail("Linux 模板缺少 " + required)

    output = out / (name + ".tar.gz")
    if output.exists():
        output.unlink()
    write_tar(staging, output)
    return output


def build_docker(version: str, jar: Path, out: Path) -> Path:
    name = "xuri-classroom-" + version + "-docker"
    staging = out / "staging" / name
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    if not DOCKER_TEMPLATE.exists():
        fail("Docker 模板目录不存在：" + str(DOCKER_TEMPLATE))
    for file_name in ["Dockerfile.runtime", "docker-compose.release.yml", ".env.example", "README.md"]:
        source = DOCKER_TEMPLATE / file_name
        if not source.exists():
            fail("Docker 模板缺少 " + file_name)
        shutil.copy2(source, staging / file_name)

    (staging / "VERSION").write_text(version + "\n", encoding="utf-8", newline="\n")
    shutil.copy2(jar, staging / "xuri-classroom.jar")
    shutil.copy2(INIT_SQL, staging / "init-mysql.sql")

    output = out / (name + ".tar.gz")
    if output.exists():
        output.unlink()
    write_tar(staging, output)
    return output


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="组装旭日云课堂三端发布产物")
    parser.add_argument("--version", required=True)
    parser.add_argument("--jar", help="已构建的 SPA jar；默认 server/api/build/libs/xuri-classroom-<version>.jar")
    parser.add_argument("--out", help="输出目录；默认 dist/v<version>")
    parser.add_argument("--target", default="all", choices=["windows", "linux", "docker", "all"])
    return parser


def main() -> int:
    configure_stdout()
    args = build_parser().parse_args()
    version = args.version.strip()
    jar = Path(args.jar) if args.jar else DEFAULT_JAR / ("xuri-classroom-" + version + ".jar")
    out = Path(args.out) if args.out else ROOT / "dist" / ("v" + version)
    out.mkdir(parents=True, exist_ok=True)

    validate_jar(jar, version)
    artifacts = []

    if args.target in ("windows", "all"):
        artifacts.append(build_windows(version, jar, out))
    if args.target in ("linux", "all"):
        artifacts.append(build_linux(version, jar, out))
    if args.target in ("docker", "all"):
        artifacts.append(build_docker(version, jar, out))
    if args.target == "all":
        plain_jar = out / ("xuri-classroom-" + version + ".jar")
        shutil.copy2(jar, plain_jar)
        artifacts.append(plain_jar)

    checksum_file = out / "SHA256SUMS"
    lines = []
    for artifact in artifacts:
        lines.append(sha256(artifact) + "  " + artifact.name)
    checksum_file.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    print("产物目录：" + str(out))
    for artifact in artifacts:
        size_mb = artifact.stat().st_size / (1024 * 1024)
        print("  - {:<52} {:>8.1f} MB".format(artifact.name, size_mb))
    print("  - SHA256SUMS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
