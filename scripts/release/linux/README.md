# 旭日云课堂 · Linux 安装包

> 一台 x86_64 Linux 服务器 + MySQL 5.7/8.0，用一个 jar 跑起整套系统（后端 API + 前端 SPA）。
> 本文件位于安装包根目录，由发布流水线从 **scripts/release/linux/README.md** 复制生成。

## 1. 包内容

| 文件 | 说明 |
|---|---|
| **VERSION** | 版本号，例如 2.0.0 |
| **app/xuri-classroom-<版本>.jar** | 可执行 jar，发布版已内置前端静态资源 |
| **app/init-mysql.sql** | 空库初始化脚本。**含 25 处 DROP TABLE，只能对空库执行** |
| **install.sh** | 安装器（建用户/目录、生成配置、可选建库、注册 systemd） |
| **uninstall.sh** | 卸载器（默认保留安装目录与数据） |
| **app.env.example** | 运行配置模板；安装器会复制为 **app.env** |
| **README.md** | 本文件 |

安装包**不再内置 JRE**（包体积约 55MB）。默认使用系统 java；机器没有 java 时，加 **--download-jre** 从国内镜像（清华 TUNA，失败回退南京大学）下载 Temurin JRE 8（约 39.9MB）到 **<安装目录>/runtime/jre8**，并校验官方 SHA256。

## 2. 前置条件

- x86_64 Linux（CentOS / Rocky / Ubuntu / Debian / 麒麟等均可），bash 4.x+
- root 或 sudo 权限
- MySQL 5.7 或 8.0（本机或远程都可）
- 使用 **--init-db** 时，本机需要 **mysql** 客户端
- 服务端口可被访问（默认 8080）；小于 1024 的端口会自动加 CAP_NET_BIND_SERVICE
- Java：JRE 8（推荐）；更高版本通常可用但未做完整验证
- 使用 **--download-jre** 时需要 curl 或 wget，以及 sha256sum（coreutils）或 openssl 用于校验；解压后约 110MB 磁盘空间

## 3. 快速开始

### 3.1 全新安装（本机 MySQL，自动建库并导入初始数据）

~~~bash
tar -xzf xuri-classroom-<version>-linux-x64.tar.gz
cd xuri-classroom-<version>-linux-x64
sudo bash install.sh --db-password '你的强密码' --init-db
~~~

机器上没有 java 时（自动下载 JRE 8）：

~~~bash
sudo bash install.sh --db-password '你的强密码' --init-db --download-jre
~~~

安装完成后访问 **http://<服务器IP>:8080**，初始账号 **admin / 123456**（由 init-mysql.sql 导入），登录后请立即修改密码。

### 3.2 连接已有数据库（不建库、不导入）

~~~bash
sudo bash install.sh \
  --db-host 10.0.0.5 --db-port 3306 \
  --db-name surveyking --db-user surveyking \
  --db-password '你的强密码' --yes
~~~

### 3.3 不注册 systemd（容器 / 测试 / 自己写守护进程）

~~~bash
sudo bash install.sh --no-systemd --install-dir /tmp/xuri --db-password '你的强密码'
~~~

安装器会准备好目录和 **app.env**，并打印可直接复制执行的手动启动命令。

## 4. 安装参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| **--port <端口>** | 8080 | 对外服务端口 |
| **--install-dir <目录>** | /opt/xuri-classroom | 安装目录，必须是绝对路径 |
| **--user <用户名>** | xuri | 运行用户；不存在时创建系统用户 |
| **--db-host <主机>** | 127.0.0.1 | 数据库地址 |
| **--db-port <端口>** | 3306 | 数据库端口 |
| **--db-name <库名>** | surveyking | 数据库名 |
| **--db-user <用户>** | surveyking | 数据库用户 |
| **--db-password <密码>** | 无（必填） | 数据库密码；也可用环境变量 XURI_DB_PASSWORD |
| **--db-admin-user <用户>** | root | 仅 --init-db：用于建库/建用户的管理员账号 |
| **--db-admin-password <密码>** | 无 | 仅 --init-db：管理员密码；也可用环境变量 MYSQL_ROOT_PASSWORD |
| **--init-db** | 关闭 | 建库、建用户、授权并导入 app/init-mysql.sql |
| **--download-jre** | 关闭 | 从国内镜像下载 Temurin JRE 8 到安装目录并使用 |
| **--no-jre** | 关闭 | 强制使用系统 java（不下载，也不用安装目录内的 JRE） |
| **--no-systemd** | 关闭 | 只准备文件，不注册/启动 systemd 服务 |
| **--yes, -y** | 关闭 | 不询问确认，适合自动化 |
| **--help, -h** | — | 显示帮助 |

参数同时支持 **--key value** 与 **--key=value** 两种写法。

## 5. --init-db 做了什么（以及危险在哪里）

1. 用管理员账号连接 MySQL（默认 root@127.0.0.1:3306）
2. 创建数据库（如果不存在），字符集 utf8mb4
3. 创建 **--db-user** 并授权（本机库会同时授权 '%'、'localhost'、'127.0.0.1'）
4. **检查目标库表数量**：非空库直接中止，不会导入
5. 导入 **app/init-mysql.sql**（含 25 处 DROP TABLE，只有空库才安全）

> ⚠️ 绝对不要对已有数据的库执行 **--init-db**。
> 安装器有“表数量”闸门，但请自己也确认库名/主机没有填错。
> 已有数据要升级结构时，走仓库里的迁移脚本，不要用 init-mysql.sql。

## 6. 安装器做了什么

1. 校验 root、参数、安装包完整性（jar 文件头、init 脚本）
2. 创建系统用户（默认 xuri）与安装目录（默认 /opt/xuri-classroom）
3. 解析 Java：系统 java 优先 → 安装目录内已有 JRE → （--download-jre 时）下载 JRE
4. 复制 jar 为 **<安装目录>/app.jar**
5. 生成 **<安装目录>/app.env**（0600，属主为运行用户）；首次安装自动生成 **SK_JWT_SECRET**
6. 需要时初始化数据库（--init-db）
7. 写 **/etc/systemd/system/xuri-classroom.service** 并 enable + start
8. 等待 **/api/system** 就绪，打印访问地址、配置路径与日志命令

重复执行是幂等的：已有的 **app.env** 和 **SK_JWT_SECRET** 会保留，只更新命令行显式给出的值，并重启服务。

## 7. 配置文件 app.env

路径：**<安装目录>/app.env**（默认 **/opt/xuri-classroom/app.env**），权限 0600。

| 变量 | 说明 |
|---|---|
| **DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD** | 数据库连接 |
| **SERVER_PORT** | 服务端口 |
| **SK_JWT_SECRET** | JWT 签名密钥；安装器用 openssl rand -base64 48 生成 |
| **SK_WEB_SPA_ENABLED** | true：由后端托管前端 SPA；前端独立部署时可改 false |
| **FILE_STORAGE_LOCAL_ROOT_PATH** | 上传文件目录，默认 <安装目录>/files |
| **SPRING_DATASOURCE_URL / USERNAME / PASSWORD** | pro 配置包的 jar 使用的数据源，安装器按 DB_* 自动同步 |
| **JAVA_TOOL_OPTIONS** | JVM 参数，默认 -Xmx768m（4GB 机器够用；8GB 可调 1536m） |
| **TZ** | 时区，默认 Asia/Shanghai |

修改后重启服务：

~~~bash
sudo systemctl restart xuri-classroom
~~~

> 注意：**app.env 与 SK_JWT_SECRET 必须纳入备份**。丢失 SK_JWT_SECRET 会让所有用户重新登录；多实例部署必须共用同一个值。

安装目录结构：

| 路径 | 说明 |
|---|---|
| **app.jar** | 应用（发布 jar，已内嵌前端 SPA） |
| **app.env** | 运行配置（0600，属主为运行用户） |
| **files/** | 上传附件（**要备份**） |
| **logs/** | 应用日志（logback 按天滚动；systemd 下也可用 journalctl 看控制台日志） |
| **runtime/jre8/** | 只有使用 --download-jre 时才存在 |

## 8. 日常运维

~~~bash
# 状态
systemctl status xuri-classroom --no-pager

# 实时日志
journalctl -u xuri-classroom -f

# 最近 100 行
journalctl -u xuri-classroom -n 100 --no-pager

# 重启 / 停止 / 启动
systemctl restart xuri-classroom
systemctl stop xuri-classroom
systemctl start xuri-classroom

# 健康检查
curl -fsS http://127.0.0.1:8080/api/system
~~~

## 9. 升级

推荐用新安装包里的 **install.sh** 再跑一次：它会替换 jar、保留 app.env 与 JWT 密钥、重启服务。

~~~bash
tar -xzf xuri-classroom-<version>-linux-x64.tar.gz
cd xuri-classroom-<version>-linux-x64
sudo bash install.sh --yes
~~~

只想手工换 jar 也可以：

~~~bash
sudo systemctl stop xuri-classroom
sudo install -m 0644 xuri-classroom-新版本.jar /opt/xuri-classroom/app.jar
sudo systemctl start xuri-classroom
~~~

> 升级前先备份数据库；涉及表结构变更的版本，按发布说明执行迁移脚本。

## 10. 备份与恢复

**备份（数据库 + 上传文件）**

~~~bash
# 数据库
mysqldump -h 127.0.0.1 -u surveyking -p \
  --single-transaction --quick --routines --triggers --no-tablespaces \
  surveyking | gzip > surveyking-$(date +%F).sql.gz

# 上传文件
tar czf files-$(date +%F).tar.gz -C /opt/xuri-classroom files

# 配置（含 JWT 密钥）
cp /opt/xuri-classroom/app.env app.env-$(date +%F).bak
~~~

**恢复**

~~~bash
sudo systemctl stop xuri-classroom

gunzip < surveyking-2026-01-01.sql.gz | \
  mysql -h 127.0.0.1 -u surveyking -p surveyking

tar xzf files-2026-01-01.tar.gz -C /opt/xuri-classroom
sudo chown -R xuri:xuri /opt/xuri-classroom/files

sudo systemctl start xuri-classroom
~~~

> 备份没有演练过等于没有备份：定期在测试机恢复一次并抽查数据。

## 11. 卸载

~~~bash
# 只卸载服务，保留安装目录、上传文件与 app.env
sudo bash uninstall.sh

# 连安装目录和运行用户一起删除（数据库不会被删除）
sudo bash uninstall.sh --purge

# 非交互环境
sudo bash uninstall.sh --purge --yes
~~~

数据库、数据库用户与备份文件不会被卸载脚本删除，请按需手动清理。

## 12. 故障排查

**找不到 java**

按提示安装 JRE 8（Debian/Ubuntu：apt install openjdk-8-jre-headless；RHEL/CentOS：dnf install java-1.8.0-openjdk-headless），或改用 **--download-jre**。

**JRE 下载失败 / 404**

--download-jre 会校验官方 SHA256；镜像不可用时也可手动下载（两个源任选）：

~~~bash
curl -fL -o /tmp/jre8.tar.gz \
  https://mirrors.tuna.tsinghua.edu.cn/Adoptium/8/jre/x64/linux/OpenJDK8U-jre_x64_linux_hotspot_8u512b09.tar.gz

# 备用源（清华失败时）：
# https://mirrors.nju.edu.cn/adoptium/8/jre/x64/linux/OpenJDK8U-jre_x64_linux_hotspot_8u512b09.tar.gz

# 校验 SHA256（官方值）
echo '57468dc8bfd71dd0578d9717e63a8c13b9efe0a2f2c85c2a13966d1c0f9b1e5f  /tmp/jre8.tar.gz' | sha256sum -c -

sudo mkdir -p /opt/xuri-classroom/runtime/jre8
sudo tar -xzf /tmp/jre8.tar.gz -C /opt/xuri-classroom/runtime/jre8 --strip-components=1
sudo chown -R xuri:xuri /opt/xuri-classroom/runtime
~~~

然后重新执行安装（脚本会复用已有的 runtime/jre8）。

**服务起不来**

~~~bash
journalctl -u xuri-classroom -n 200 --no-pager
~~~

优先看数据库连接与端口占用。缺库/密码错时启动会反复重启。

**数据库连不上**

- 确认 **app.env** 里的 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD 正确；
- 本机库确认 mysqld 已启动、端口在监听：**ss -ltnp | grep 3306**；
- 连接串里的 **useSSL=false** 是故意的：JDK8 的 MySQL connector 与 MySQL 8 的 TLS 握手会失败；
- 手工验证：**mysql -h 127.0.0.1 -u surveyking -p -e 'SELECT 1'**。

**端口被占用**

~~~bash
ss -ltnp | grep ':8080'
~~~

改用 **--port 其他端口** 重新安装，或修改 app.env 的 SERVER_PORT 后重启。

**页面 404 / 白屏**

发布包里的 jar 应已内置前端（**SK_WEB_SPA_ENABLED=true**）。如果你自行替换成了未打包前端的 jar，需要重新构建带前端产物的 jar，或用 nginx 单独托管前端。

**--init-db 报“目标库已有 N 张表”**

这是保护：init-mysql.sql 会 DROP 表。请换一个空库，或由 DBA 用迁移脚本升级现有库。

## 13. Docker 部署

如果更希望用容器：使用 GHCR 镜像 **ghcr.io/hermannmayer/xuri-classroom** + **mysql:8.0**，说明见仓库 **docker/README.md**。

一行命令部署（需要 root、docker、docker compose v2）：

~~~bash
curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo bash
~~~
