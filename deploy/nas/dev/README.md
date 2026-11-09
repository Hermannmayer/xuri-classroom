# 旭日云课堂 · 飞牛 NAS 开发环境

在飞牛 fnOS（主机 `<nas-host>`）上用 **容器** 跑一套完整的开发环境：JDK 8 + Node 20 + Gradle 7.6 全部装在镜像里，**宿主机上一件东西都不用装**。

这样做的目的只有一个：**飞牛系统升级/重装不会破坏任何开发工具链**，同时**生产考试系统不受任何影响**。

> 生产环境（容器 `surveyking`，宿主机 `201` 端口，H2 库，数据在 `<legacy-data-root>/`）与本目录**完全隔离**：不同容器名、不同项目名、不同网络、不同数据卷、不同端口段。本目录不含任何往生产目录写数据的逻辑。

---

## TL;DR：三条命令

```bash
# 1) 仓库已经在 <data-root>/src（没有就 git clone 过去）
cd <data-root>/src
bash deploy/nas/dev/bootstrap.sh          # 首次约 5-15 分钟（拉镜像、装工具链）
# 2) 进容器
docker compose -f deploy/nas/dev/docker-compose.yml exec devbox bash
# 3) 浏览器打开 http://<nas-host>:19080
```

在 NAS 上执行 `./bootstrap.sh` 若报 `Permission denied`（Windows 下 clone 过来的文件没有执行位），用 `bash bootstrap.sh`，或者 `chmod +x bootstrap.sh` 一次即可。

---

## 目录里有什么

| 文件 | 作用 |
| --- | --- |
| `Dockerfile` | devbox 镜像：`eclipse-temurin:8-jdk-jammy` + Node 20（从 `node:20-bookworm-slim` 多阶段 COPY）+ Gradle 7.6，非 root 用户 `dev`（uid/gid **1000**，对齐 NAS 登录用户），`CMD sleep infinity` 供 VS Code attach |
| `docker-compose.yml` | Compose 项目 `xuri-dev`：`devbox`（开发容器）+ `db`（MySQL 8.0）；全部 `restart: unless-stopped`、日志滚动 10m×3 |
| `bootstrap.sh` | NAS 上一键引导（**幂等**）：建目录 → 检查 docker/compose → 检查端口 → 构建 → 预置卷属主 → `up -d` → 打印 VS Code 步骤 |
| `gradle-init.gradle` | 可选：Gradle 依赖走阿里云镜像（默认不生效，见「国内网络加速」） |
| `npmrc.example` | 可选：npm 走 npmmirror 镜像的几种做法（默认不写进仓库） |
| `.env.example` | 端口 / 源码路径 / 开发库密码模板；`bootstrap.sh` 会自动复制成 `.env`（`.env` 已被 `.gitignore` 忽略） |
| `.dockerignore` | 构建上下文里排除 `.env`（含密码）等无关文件 |

---

## 端口与路径约定

**这张表就是 `docker-compose.yml` 的取值，改端口只改 `.env`，不要改代码。**

| 项 | 宿主机（NAS） | 容器内 | 说明 |
| --- | --- | --- | --- |
| 前端 dev server | `19080`（`DEV_WEB_PORT`） | **`80`** | Vite 在 `client/vite.config.ts` 里固定 `port: 80` + `strictPort: true`，容器内改不了，只能改宿主机这一侧 |
| 后端 Spring Boot | `17007`（`DEV_BACKEND_PORT`） | **`7007`** | 只用于 curl/Postman 直连；浏览器走 Vite 同源代理，不需要它 |
| 开发 MySQL | `13306`（`DEV_DB_PORT`） | **`3306`** | 库名 `surveyking`，用户 `root`，密码见 `.env` |
| 源码目录 | `<data-root>/src`（`DEV_SRC`） | `/workspace` | bind mount，两边实时同步 |
| 备份目录 | `<data-root>/backup` | — | `bootstrap.sh` 会创建；本目录不写入（留给你手工备份用） |

**宿主机 `80` 端口是飞牛 Web 管理界面在用的，绝对不要映射。** `bootstrap.sh` 会显式检查并直接拒绝 `DEV_WEB_PORT=80`。

> **关于「容器内 80」这一点值得单独说一句**：容器里的进程以 `dev`（uid 1000，**非 root**）身份运行，而 Linux 传统上不允许非 root 绑定 `<1024` 的端口。compose 里因此显式写了
> ```yaml
> sysctls:
>   - net.ipv4.ip_unprivileged_port_start=80
> ```
> Docker 20.10+ 其实默认就把这个值设成 0（等于谁都能绑），这行是显式兜底 + 自文档：换老版本 Docker 或受限运行时也不会突然 EACCES。`bootstrap.sh` 起来后会读一次容器内的真实值并打印出来自检。

> **`.env` 从哪里读**：Compose v2 按 compose 文件所在目录读 `.env`，所以从仓库根目录用 `-f deploy/nas/dev/docker-compose.yml` 调用也能拿到正确配置。`bootstrap.sh` 更进一步，所有 `docker compose` 调用都显式带 `--env-file`。如果你用的 Compose 版本比较老、发现 `.env` 没生效（改了端口却还是默认值），手动命令补一句 `--env-file deploy/nas/dev/.env` 即可。

容器 / 卷 / 网络名（全部带 `xuri-dev` 前缀，避免误伤生产）：

```
容器：xuri-devbox        （devbox，开发）
      xuri-dev-db        （MySQL 8.0）
卷：  xuri-dev-db-data / xuri-dev-gradle-cache / xuri-dev-node-modules
网络：xuri-dev-net       （bridge，非 external；和生产容器互相解析不到）
项目名：xuri-dev
```

---

## 首次启动

前提：Docker 已经装好、当前 SSH 用户在 `docker` 组里（`docker info` 能正常输出）。

```bash
# 0) 仓库放到数据盘（不要放 128GB 系统盘）
sudo mkdir -p <data-root>
sudo chown -R 1000:1000 <data-root>
git clone <仓库地址> <data-root>/src

# 1) （可选）改端口/密码
cd <data-root>/src/deploy/nas/dev
cp .env.example .env && vi .env      # 不改也行，默认值能直接跑

# 2) 一键引导（幂等，可重复执行）
bash bootstrap.sh
```

`bootstrap.sh` 会依次做这些事，任何一步失败都打印**中文原因**：

1. 没有 `.env` 就从 `.env.example` 生成；校验端口是整数、源码路径是绝对路径、CRLF 换行
2. `docker info` / `docker compose version`（要求 **Compose v2**：`docker compose`，中间是空格）
3. `docker compose config -q` 预检 compose 语法
4. 创建 `<data-root>/src`、`<data-root>/backup`；确认 `server/rdbms/src/main/resources/scripts/init-mysql.sql` 存在
5. 检查 `19080` / `17007` / `13306` 是否空闲（`80` 只报告、不当错误；被本项目自己容器占着也算正常）
6. `docker compose build devbox` → 以 root 跑一次性容器把两个命名卷的属主改成 `1000:1000` → `docker compose up -d --build`

---

## 日常开发：进容器之后怎么跑

### 进入容器

```bash
# 在 NAS 上，任意目录
docker compose -f <data-root>/src/deploy/nas/dev/docker-compose.yml exec devbox bash
```

或者按 VS Code 的方式（`bootstrap.sh` 结束时也会打印）：

1. 飞牛「系统设置 → SSH」确认 SSH 服务已开启
2. Windows 装 VS Code，扩展装 **Remote - SSH** + **Dev Containers**
3. 左下角绿色按钮 → Connect to Host → `你的用户名@<nas-host>`
4. 打开宿主机目录 `<data-root>/src`
5. 左下角绿色按钮 → **Attach to Running Container** → 选 `xuri-devbox`
6. 在容器窗口里打开文件夹 **`/workspace`**（容器内路径，不是宿主机的 `<data-root>/src`）

镜像里的 `dev` 用户 uid=1000，所以容器里新建的文件在 NAS 上仍然是你自己的，不会变成 `root` 所有。

### 后端（容器内）

```bash
cd /workspace/server
gradle :api:bootJar -x test          # 用镜像里的 Gradle 7.6，与生产 Dockerfile 一致
java -jar api/build/libs/xuri-classroom-v1.13.0.jar
```

- 端口由 `server/application.properties` 固定为 `7007`，**不要**在这台机器上改成 `80`
- 数据库连接走 compose 注入的环境变量（`DB_HOST=db` 等），对应 `server/rdbms/src/main/resources/config/application-dev.yml`
- 默认 profile 是 `dev`（`-Ppro` 才会切成 `pro` 并排除 `application-dev.yml`）
- 也可以换成本仓库自带的 wrapper：`./gradlew :api:bootJar -x test`（会下载 Gradle 7.1，见下一节）
- 第一次构建要下几百 MB 依赖，NAS 上大概 5-15 分钟；之后靠 `xuri-dev-gradle-cache` 卷缓存，热启动几十秒
- 构建完想省内存可以 `gradle --stop` 关掉常驻 daemon

### 前端（容器内）

```bash
cd /workspace/client
npm ci                               # 严格按 package-lock.json 装；首次 2-5 分钟
npm run dev                          # Vite 监听容器内 80
```

`client/vite.config.ts` 里 `/api`、`/captcha`、`/files` 都代理到 `http://127.0.0.1:7007`，
后端和前端在**同一个容器**里，所以 `127.0.0.1` 天然指向后端，不用配 CORS，**不要**设置 `VITE_API_TARGET`。

两个进程怎么并存：直接开两个终端（或两个 VS Code 终端 tab）即可，互不干扰。

### 访问地址（同一局域网内）

| 用途 | 地址 |
| --- | --- |
| 前端页面 | `http://<nas-host>:19080` |
| 后端接口直连 | `http://<nas-host>:17007/api/system` |
| MySQL | `<nas-host>:13306`，库 `surveyking`，用户 `root`，密码见 `.env` |

手机连同一个 Wi-Fi 也能直接打开前端页面（Vite 的 `host: true`）。

---

## 与仓库根目录 `Dockerfile` 的差异（必读）

根目录 `Dockerfile` 是**生产**用的多阶段构建，本目录是**开发**用的常驻容器。版本全部对齐，但有两个有意为之的差别：

| 项 | 生产 `Dockerfile` | 本目录 `Dockerfile` | 为什么 |
| --- | --- | --- | --- |
| JDK | `eclipse-temurin:8-jre-alpine`（只要 JRE） | `eclipse-temurin:8-jdk-jammy`（JDK + glibc） | 开发要编译（javac），还要跑 VS Code server；glibc 比 musl 少踩坑 |
| Node | `node:20-alpine` | `node:20-bookworm-slim`（多阶段 COPY 二进制） | 同为 20.x；运行环境是 glibc，不把 musl 的 node 混进来 |
| Gradle | `gradle:7.6-jdk8` | 手装 **7.6** 发行包 | 与生产同一个版本 |
| 入口 | 由 nginx / `java -jar` 驱动 | `CMD ["sleep","infinity"]` | 容器只负责「活着」，等 VS Code attach |

### Gradle 7.1 vs 7.6 —— 这个差异要知道

- 仓库里的 wrapper 是 **7.1**：`server/gradle/wrapper/gradle-wrapper.properties` 里 `gradle-7.1-bin.zip`
- 生产 `Dockerfile` 用的是 **7.6**（`gradle:7.6-jdk8`），本镜像也对齐 7.6
- 所以：
  - `gradle :api:bootJar -x test` → 用镜像里的 **7.6**，不用下载，**和 CI / 生产一致**（推荐）
  - `./gradlew :api:bootJar -x test` → 用 wrapper，会在 `~/.gradle/wrapper`（即 `xuri-dev-gradle-cache` 卷）里下载 **7.1**，第一次慢，之后复用

两个版本都能构建这个项目。要「和上线产物一模一样」就用 `gradle`；要「和本地 Windows 上的 wrapper 行为一致」就用 `./gradlew`。**别急着把 wrapper 升到 7.6**，那属于另一个改动，先单独验证。

---

## 国内网络加速（可选）

### Docker 拉基础镜像慢

在飞牛「Docker → 仓库/镜像加速」里配一个 registry mirror（各云厂商都有），或者在 Docker 守护进程的 `daemon.json` 里加 `registry-mirrors`。这一步是 NAS 全局设置，与仓库无关，改了不影响容器内环境。

### Gradle 依赖慢

`gradle-init.gradle` 把阿里云镜像插到仓库列表前面，**默认不启用**（不改仓库任何文件）：

```bash
# 方式 A：单次传参（最干净）
cd /workspace/server
gradle --init-script /workspace/deploy/nas/dev/gradle-init.gradle :api:bootJar -x test

# 方式 B：拷进用户目录（持久，落在 gradle-cache 卷上，重建容器不丢）
docker compose -f deploy/nas/dev/docker-compose.yml cp \
    deploy/nas/dev/gradle-init.gradle devbox:/home/dev/.gradle/init.gradle
```

Gradle 发行包本身也能换镜像（镜像字节一致，校验和不变）：

```bash
docker compose -f deploy/nas/dev/docker-compose.yml build \
  --build-arg GRADLE_URL=https://mirrors.cloud.tencent.com/gradle/gradle-7.6-bin.zip devbox
```

### npm 依赖慢

见 `npmrc.example`，最简单的是：

```bash
cd /workspace/client
npm ci --registry=https://registry.npmmirror.com
```

---

## 常见故障

### 1）`./bootstrap.sh: Permission denied` 或 `$'\r': command not found`

Windows 上 clone/编辑过，文件没有执行位或被改成了 CRLF。

```bash
chmod +x deploy/nas/dev/bootstrap.sh
sed -i 's/\r$//' deploy/nas/dev/bootstrap.sh deploy/nas/dev/docker-compose.yml deploy/nas/dev/.env
```

`bootstrap.sh` 自己会检测 CRLF 并给出这条命令；`.env` 里有 CRLF 时它也会直接拒绝执行（否则端口号会变成 `19080\r`，报错极难懂）。

### 2）Vite 起不来：`Port 80 is already in use` / `EACCES`

**情况 A —— `already in use`**：容器内 80 被上一次没退干净的 `vite` 进程占着（`strictPort: true` 表示宁可不启动也不换端口）。

```bash
# 容器内
pkill -f vite ; sleep 1 ; npm run dev
# 或者干脆重建容器
docker compose -f deploy/nas/dev/docker-compose.yml restart devbox
```

**情况 B —— `EACCES` / `permission denied`**：非 root 用户（`dev`, uid 1000）不允许绑 `<1024` 端口。compose 里已经有兜底配置：

```yaml
sysctls:
  - net.ipv4.ip_unprivileged_port_start=80
```

自查容器里的真实值：

```bash
docker compose -f deploy/nas/dev/docker-compose.yml exec devbox \
  cat /proc/sys/net/ipv4/ip_unprivileged_port_start     # 应该是 80 或 0
docker compose -f deploy/nas/dev/docker-compose.yml exec devbox id   # 应该 uid=1000(dev)
```

如果这个 sysctl 在受限运行时里被拒绝（`up` 时报 `sysctl ... is not allowed` / 被 OOM 之外的策略拦掉），走**方案 B**：容器内改用高端口，`client/vite.config.ts` 不动（`strictPort: true` 下命令行覆盖依然生效）：

```yaml
# docker-compose.yml 的 devbox
ports:
  - "${DEV_WEB_PORT:-19080}:5173"      # 把容器侧从 80 改成 5173
```
```bash
# 容器内启动前端时显式指定端口
cd /workspace/client && npm run dev -- --port 5173 --host
```

**不要**为了「避开端口冲突」去改 `client/vite.config.ts`，那是前后端约定的一部分；要换对外端口只改 `.env` 的 `DEV_WEB_PORT`。

### 3）浏览器打不开 `http://<nas-host>:19080`

按顺序查：

```bash
docker compose -f deploy/nas/dev/docker-compose.yml ps          # 19080->80 映射在不在
docker compose -f deploy/nas/dev/docker-compose.yml logs devbox # 容器里 npm run dev 起来没有
curl -I http://127.0.0.1:19080                                  # 在 NAS 本机自测
```

都没问题就查飞牛防火墙/安全组有没有放行 `19080`。注意 `http://` 不是 `https://` —— 开发环境没配证书。

### 4）Gradle / npm 下载卡住或超时

见上面「国内网络加速」。判定标准很清楚：卡在 `Downloading https://repo.maven.apache.org/...` 就是网络，卡在编译输出就是代码。

### 5）`npm ci` 报 `EACCES`，或者「宿主机 `client/node_modules` 不见了」

`node_modules` 挂的是**命名卷**（`xuri-dev-node-modules`），它会盖住宿主机 `client/node_modules` 目录 —— 这是故意的：容器里要 Linux 版二进制，而 Windows 上那份 `node_modules` 带进 Linux 容器会直接 `Cannot find module`。

代价是：宿主机上看不到容器里装的依赖，反过来容器里也看不到宿主机那份。想查看：

```bash
docker compose -f deploy/nas/dev/docker-compose.yml exec devbox ls /workspace/client/node_modules | head
```

命名卷首次创建时属主是 `root`，`bootstrap.sh` 已经帮你改成 `1000:1000`；如果你是手动 `docker compose up` 起的、`npm ci` 报 `EACCES`，补一条：

```bash
docker compose -f deploy/nas/dev/docker-compose.yml exec -u 0:0 devbox \
  chown -R 1000:1000 /workspace/client/node_modules
```

### 6）`docker compose up` 报 `bind source path does not exist`

`${DEV_SRC}/server/rdbms/src/main/resources/scripts/init-mysql.sql` 不存在 —— 说明源码还没克隆到 `DEV_SRC`，或者 `.env` 里的 `DEV_SRC` 写错了。

compose 用 `bind.create_host_path: false` 是刻意的：如果按短语法处理，Docker 会悄悄建一个**同名空目录**，MySQL 只会打一行警告然后跳过初始化，结果你拿到一个没有表的空库，排查半天。现在它会直接失败并告诉你哪个路径不存在。

### 7）数据库是空的 / 改了 SQL 没生效

`init-mysql.sql` 只在**数据卷为空**时执行一次（MySQL 镜像的 `docker-entrypoint-initdb.d` 语义）。想让改动生效：

```bash
# ⚠️ 会删掉开发库里的所有数据（只影响开发容器，不碰生产）
docker compose -f deploy/nas/dev/docker-compose.yml down -v
docker compose -f deploy/nas/dev/docker-compose.yml up -d
```

### 8）内存吃紧 / 容器被 OOM kill

这台机器只有 8GB（系统占用约 3.8GB，可用约 3.3GB），所以 compose 里做了硬限制：
`devbox` 2 核 **3g**、`db` 1 核 **512m**，合计上限约 **3.5g**，超了只会杀容器里的进程，不会拖垮 NAS 上的其他服务。

`db` 的 512m 能站住，靠的是两个配套启动参数（写在 compose 的 `command` 里，别单独删）：

```
--innodb-buffer-pool-size=256M   # MySQL 8 默认 128M，钉在 256M 好预测
--performance-schema=OFF         # 默认开着要多吃 100-200MB，开发环境用不上
```

```bash
free -h
docker stats --no-stream       # 看实际占用
```

如果 `db` 反复重启（`docker compose ps` 里状态一直变、日志被截断），基本就是撞了 512m 上限：
把 compose 里 `db.mem_limit` 调到 `768m` 或 `1g` 并同步改本节数字即可 —— 这是有意识的取舍，不是 bug。
真要省内存：构建完执行 `gradle --stop` 关掉 daemon；或者把 `devbox.mem_limit` 调到 `2g`（编译会更慢）。别去动生产容器的资源限制。

### 9）`git` 报 `detected dubious ownership`

镜像里已经执行过 `git config --system --add safe.directory '*'`。如果仍然报，说明你 attach 进来的不是 `xuri-devbox`（比如 attach 到了别的容器），确认一下容器名。

### 10）VS Code「Attach to Running Container」里看不到 `xuri-devbox`

- 容器必须是运行状态：`docker ps | grep xuri-devbox`
- VS Code 先要能通过 **Remote-SSH** 连上 NAS（同网段、SSH 开着、密码正确），attach 功能是在 SSH 之上工作的
- 还看不到就重启 VS Code 窗口（`Ctrl+Shift+P` → `Reload Window`）

---

## 停止 / 清理 / 备份

```bash
DC="docker compose -f <data-root>/src/deploy/nas/dev/docker-compose.yml"

$DC ps                 # 状态
$DC stop               # 停（保留容器和数据）
$DC down               # 删容器（保留卷：库和缓存都还在）
$DC down -v            # ⚠️ 连卷一起删：开发库数据、Gradle/npm 缓存全丢
$DC logs -f devbox     # 看日志
$DC build --no-cache devbox   # 镜像彻底重建（换工具链版本时用）
```

数据库备份（写到 `<data-root>/backup`，**不碰生产目录**）：

```bash
docker compose -f <data-root>/src/deploy/nas/dev/docker-compose.yml \
  exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases surveyking' \
  > <data-root>/backup/surveyking-dev-$(date +%F).sql
```

想换源码路径/端口：改 `.env` → `down` → `bootstrap.sh`。**改端口一定要重建容器**（`up -d` 会自动重建，因为端口映射变了）。

---

## 还没在真机上验证的部分（诚实声明）

写这份脚手架的环境是 Windows，**本机没有 Docker**，所以下面这些只能做到「静态检查通过 + 人工核对」，第一次在 NAS 上运行时请留意：

| 项 | 已验证到什么程度 |
| --- | --- |
| `docker-compose.yml` | ✅ YAML 语法可解析（PyYAML 6.0.3），⚠️ 未跑过 `docker compose config`（本机无 docker），首次请在 NAS 上跑一遍 `docker compose -f deploy/nas/dev/docker-compose.yml config` |
| 资源上限（devbox 3g / db 512m） | ⚠️ 只是静态配置，没在 8GB 机器上实测过 OOM 阈值；`db` 512m 靠 `buffer-pool 256M` + `performance-schema=OFF` 站住，见「常见故障 · 内存」 |
| `sysctls: ip_unprivileged_port_start=80` | ⚠️ 未在有 Docker 的机器上验证（Docker 20.10+ 默认已是 0）；`bootstrap.sh` 起来后会自检并打印真实值 |
| `bootstrap.sh` | ✅ `bash -n` 语法检查通过（bash 5.3.9），⚠️ 未在飞牛实机跑过（`ss`/`docker compose run` 的参数行为靠文档核对） |
| `Dockerfile` | ⚠️ 未 build 过。基础镜像 tag（`eclipse-temurin:8-jdk-jammy`、`node:20-bookworm-slim`）已确认存在，Gradle 7.6 的 sha256 取自官方 `gradle-7.6-bin.zip.sha256` |
| `gradle-init.gradle` | ⚠️ 未执行（无 gradle 环境），只做了结构核对 |
| VS Code Attach 流程 | ⚠️ 未实测（需要 NAS 上的 SSH + 扩展） |

首次构建如果失败，第一件事是看 `docker compose build devbox` 的原始输出，再对照 `README` 的「常见故障」；`bootstrap.sh` 也会把日志命令打印出来。
