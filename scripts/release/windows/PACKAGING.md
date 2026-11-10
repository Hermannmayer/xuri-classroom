# 打包说明（给 package.py / 发版脚本，不随发布包下发）

本目录 **镜像发布包的根目录结构**，可以按下面的映射直接拷贝：

| 仓库里的路径                              | 发布包里的路径              |
| ----------------------------------------- | --------------------------- |
| `start.cmd` / `stop.cmd` / `status.cmd` / `setup.cmd` / `doctor.cmd` | 根目录同名文件              |
| `README.txt`                            | `README.txt`              |
| `lib/launcher.ps1`                      | `lib/launcher.ps1`        |
| `config/app.env.example`                | `config/app.env.example`  |
| `config/runtime.env.example`            | `config/runtime.env.example` |

另外由打包脚本放入：

- `VERSION`（仓库根目录的 VERSION）
- `app/xuri-classroom-<version>.jar`（带 `-PwithSpa` 构建的内嵌前端 jar）
- `app/init-mysql.sql`（来自 `server/rdbms/src/main/resources/scripts/init-mysql.sql`）

**不要**打进发布包：

- `PACKAGING.md`（本文件）
- `runtime/`、`mysql/`、`data/`、`logs/`、`run/`、`cache/`、`config/*.env`（这些是运行时生成物）
- 任何 `.git*` 文件

打包检查清单：

1. `.cmd` 是 CRLF、无 BOM；`.ps1`/`.txt` 是 UTF-8 BOM + CRLF。
   本目录的 `.gitattributes` 已强制检出为 CRLF；BOM 直接存在文件里。
2. 压缩包里 `app/` 只有一份 jar 和 init-mysql.sql。
3. 发布包根目录能看到五个 .cmd、README.txt、VERSION、lib/、config/、app/。
4. 解压到含空格的英文路径也能跑（launcher 已处理引号）；含中文的路径 MySQL 起不来，
   见第 6 条。
5. 预期大小：jar 约 78MB，Windows 整包约 78–80MB（JRE/MySQL 首次运行下载）。
6. 发布说明和下载页要写明：**必须解压到纯英文路径**（不能含中文/非 ASCII
   字符），否则 MySQL 8 在 Windows 上起不来；空格可以。
7. 可选：解压后跑 `setup.cmd --whatif`（只预演，不联网）确认脚本能启动。
