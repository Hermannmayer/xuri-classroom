================================================================
  旭日云课堂 · Windows 便携版
  版本：见同目录 VERSION 文件
================================================================

一、这是什么
----------------------------------------------------------------
· 解压即用：不用装 Java、MySQL、Tomcat、nginx，也不写注册表、不装服务。
· 包里只有程序本体（jar 约 78MB）。第一次启动会自动下载 JRE 8（约 38MB）
  和 MySQL 8（约 212MB），之后完全离线可用。
· 前端已经打进 jar，一个进程同时提供页面和接口。
· 首次运行会自动生成随机数据库密码和登录密钥，写在 config\app.env 里。

二、系统要求
----------------------------------------------------------------
· Windows 10 / 11，64 位（不支持 Win7/Win8/32 位）。
· 磁盘：安装后约 320MB（JRE 约 97MB + MySQL 约 138MB + jar 约 78MB）；
  安装过程还要约 600MB 放下载的压缩包（cache 目录），建议预留 2GB。
· 内存：2GB 以上。默认 JVM 上限 1024MB，小内存机器可改 config\app.env
  里的 JAVA_OPTS=-Xmx768m。
· 不需要管理员权限。只有“自动添加防火墙规则”那一步会弹一次 UAC，
  拒绝也不影响本机使用（只是局域网别的电脑可能打不开）。
· 路径必须是纯英文：不能含中文或其他非 ASCII 字符 —— MySQL 8 在 Windows
  上会截断这种路径并报 datadir 不存在。空格可以，但建议直接用 C:\xuri 这类
  短路径。不要放在 Program Files、共享盘、OneDrive/坚果云等同步目录里
  （会锁文件、权限也不对）。

三、第一次使用
----------------------------------------------------------------
1) 把压缩包解压到一个可写的目录（例如 C:\xuri）。
2) 双击 start.cmd。如果还没安装，会自动进入引导安装（和 setup.cmd 一样）。
3) 向导按 4 步执行，每一步都有进度和中文提示：
     1/4 环境检查：系统版本、位数、磁盘、8080/3307 端口、写权限
     2/4 JRE：下载 OpenJDK 8（优先清华 TUNA，失败自动换南京大学）
     3/4 MySQL：下载 8.0.28（华为/阿里镜像，约 212MB），解压、裁剪、
           初始化 data\mysql、启动 127.0.0.1:3307、建库 surveyking、
           建用户 xuri、导入 app\init-mysql.sql，最后核对 t_user
     4/4 应用：启动 jar，轮询 /api/system，验证首页和深链接，打开浏览器
4) 看到“访问地址”后，浏览器会自动打开 http://127.0.0.1:8080
5) 默认管理员：admin / 123456 —— 登录后请立刻改密码。

只想先装好、以后再启动：直接双击 setup.cmd。
下载很慢或没网：看第十节“下载失败怎么办”。

四、日常使用
----------------------------------------------------------------
· start.cmd    启动（已安装过就直接起，不再进向导）
· stop.cmd     停止（先停应用，再让 MySQL 正常 shutdown）
· status.cmd   查看端口、PID、访问地址、数据库表数

关机前请用 stop.cmd 正常停止，不要直接断电/强制结束 mysqld，
否则 MySQL 下次启动可能要做崩溃恢复（虽然也能恢复，但会慢很多）。

五、命令与参数
----------------------------------------------------------------
setup.cmd   引导安装（可重复执行，已完成的步骤会秒过）
start.cmd   启动
stop.cmd    停止
status.cmd  状态
doctor.cmd  体检；--fix 尝试自动修复（重启 MySQL、重建数据库账号、补防火墙等）

通用参数（写在命令后面）：
  --step <env|jre|mysql|db|app>
                 只执行某一步，可逗号分隔，例如 --step db
  --offline      只用 cache 目录里已下载的压缩包，不联网
  --force        忽略“已完成”状态强制重做（会重新下载/解压）
  --whatif       预演：只打印将要做的事，不写文件、不下载、不启动
  --no-browser   启动后不自动打开浏览器
  --no-firewall  不创建防火墙规则
  --timeout <秒> 等待应用就绪的最长秒数（默认 240）
  --fix          仅 doctor：尝试自动修复
  --help         显示帮助

例子：
  setup.cmd --step db                  # 只重建库/补导数据
  setup.cmd --offline --step mysql     # 用 cache 里的 zip 重新解压 MySQL
  setup.cmd --whatif                   # 先看看会做什么
  doctor.cmd --fix                     # 一键体检并修复常见问题

也可以直接调用 PowerShell 脚本（排错时有用）：
  powershell -NoProfile -ExecutionPolicy Bypass -File lib\launcher.ps1 status

退出码：0 成功；1 运行失败；2 参数错误。

六、目录说明
----------------------------------------------------------------
start.cmd / stop.cmd / status.cmd / setup.cmd / doctor.cmd   入口脚本
README.txt                本文件
VERSION                   版本号（唯一真源）
app\                      应用 jar 与 init-mysql.sql（建表脚本）
config\app.env            应用配置（端口、数据库账号、JWT 密钥）
config\runtime.env        运行时组件下载源与 SHA256
config\setup.done         安装完成标记（删掉它，start.cmd 会重新进入向导）
data\mysql\               MySQL 数据文件（备份就备这个）
data\files\               附件与导出文件（备份就备这个）
logs\                     所有日志
run\                      PID、my.ini、临时 SQL
cache\                    下载的 zip（可以删；删了下次要重新下载）
runtime\jre8\             内置 JRE（首次安装生成）
mysql\                    内置 MySQL（首次安装生成，已裁剪）
lib\launcher.ps1          启动器本体

七、配置文件
----------------------------------------------------------------
config\app.env（首次运行自动生成，随机密码，不要发群/上传）
  PORT=8080                 网站端口
  DB_HOST=127.0.0.1         数据库地址（内置就是本机）
  DB_PORT=3307              数据库端口（要和 runtime.env 的 MYSQL_PORT 一致）
  DB_NAME=surveyking
  DB_USER=xuri
  DB_PASSWORD=...           应用账号口令（随机）
  DB_ROOT_PASSWORD=...      MySQL root 口令（随机，只在本机用）
  SK_JWT_SECRET=...         登录令牌密钥（随机；换了以后所有人要重新登录）
  JAVA_OPTS=-Xmx1024m
  FILE_STORAGE_ROOT=data\files

config\runtime.env（下载源，换源只改这里）
  JRE_URLS / JRE_SHA256 / JRE_SIZE
  MYSQL_MIRRORS=地址|版本|SHA256|字节数   （可以写多行，按顺序尝试）
  MYSQL_PORT=3307

注意：
· 没有配置 SHA256 的下载源会被自动跳过（不下载未校验的文件）。
· 改端口要成对改：改网站端口只改 app.env 的 PORT；改数据库端口要同时
  改 app.env 的 DB_PORT 和 runtime.env 的 MYSQL_PORT。
· 不要手工改 run\my.ini，每次启动都会被覆盖。

八、端口、局域网与防火墙
----------------------------------------------------------------
· 网站：0.0.0.0:8080 —— 同一局域网的电脑/手机可以访问
· 数据库：127.0.0.1:3307 —— 只监听本机，不对局域网开放（安全默认值）
· 启动完成后会打印本机和局域网访问地址，例如：
      http://<本机IP>:8080
· 第一次启动会尝试创建防火墙规则 xuri-classroom-8080（仅专用/域网络）。
  非管理员时会弹一次 UAC；拒绝或超时会警告但继续启动。
· 如果学校网络有上网行为管理/防火墙，需要放行 TCP 8080。

九、数据备份、迁移与升级
----------------------------------------------------------------
· 备份：stop.cmd 之后，把整个 data 目录复制走即可
  （data\mysql 是数据库，data\files 是附件）。
· 迁移到新电脑：复制整个文件夹（含 config、data、runtime、mysql），
  在新机器上先 stop.cmd（如果旧机还在跑），再 start.cmd。
  目标路径同样必须纯英文（不能含中文/非 ASCII 字符）。
  cache 目录可以不复制。
· 升级：只替换 app\ 里的 jar 和根目录 VERSION，保留 config\ 和 data\；
  然后 stop.cmd → start.cmd。数据库结构由建表脚本管理，升级不会清库。
· 换路径不会影响数据：config\app.env 里的密码不变，路径相关的
  run\my.ini 每次启动自动重建。

十、下载失败怎么办
----------------------------------------------------------------
向导会自动换下一个镜像；全部失败时会打印手动指引。手动步骤如下：
1) 用浏览器打开日志里给出的地址，下载完整 zip；
2) 把文件放进 cache 目录。两种命名都认：
     · 保持原文件名，例如 OpenJDK8U-jre_x64_windows_hotspot_8u512b09.zip
     · 或改名为固定别名：JRE 用 jre8.zip，MySQL 用 mysql8.zip
3) 重新运行离线安装：
     setup.cmd --offline --step jre
     setup.cmd --offline --step mysql
4) 下载中断过也没关系：cache 里的 .part 会保留，重跑会断点续传。
5) 实在连不上：用手机热点，或改 config\runtime.env 换一个下载源。

十一、常见问题
----------------------------------------------------------------
Q1 双击 start.cmd 一闪而过 / 没反应
   在文件夹地址栏输入 cmd 回车，然后运行 start.cmd，就能看到具体错误。
   也可以直接运行 doctor.cmd 看体检报告。

Q2 提示端口被占用
   运行 status.cmd 看是谁占用；改 config\app.env 的 PORT（网站）或
   DB_PORT（数据库，同时改 runtime.env 的 MYSQL_PORT），再 start.cmd。

Q3 弹出 UAC / 学校电脑没有管理员权限
   点“否”也能用，只是局域网可能访问不了 8080。
   需要局域网访问时，让管理员放行 TCP 8080，或右键以管理员身份运行 setup.cmd。

Q4 路径有中文，或移动文件夹后 MySQL 起不来
   MySQL 8 在 Windows 上不支持含中文的路径（日志里是 "Failed to set datadir
   ... No such file or directory"）。把整个文件夹移动到纯英文路径（例如
   C:\xuri）即可，config 和 data 会一起搬走，不需要重装、也不需要改配置。

Q5 杀毒软件报毒 / 拦截
   这是本地 PowerShell 启动器 + Java 程序，不采集上传任何数据。
   把整个文件夹加入白名单，尤其是 lib\launcher.ps1 和 runtime\jre8。

Q6 忘记管理员密码
   需要用维护工具重置（数据库里的账号密码是加密存储的）。
   不要直接删 data\mysql——那会丢数据。

Q7 浏览器打开是白屏或 404
   确认访问的是 http://127.0.0.1:8080（不是旧系统的地址）；确认用的是发布包
   自带的 jar（内嵌前端）。仍然不行就看 logs 下最新 app-*.err.log。

Q8 提示数据库账号/口令不一致（比如手工改过 app.env）
   运行 doctor.cmd --fix，它会按 config\app.env 重新设置 xuri 账号口令。

Q9 改了数据库端口后启动失败
   DB_PORT 和 MYSQL_PORT 必须一致；并且 MySQL 要先启动成功。
   改完执行 stop.cmd 再 start.cmd。

Q10 提示“无法加载脚本 / 禁止运行脚本”
   请用 .cmd 入口（已带 -ExecutionPolicy Bypass）。如果公司组策略强制
   禁止脚本，需要找管理员放开，或改用 Linux 安装包。

十二、日志与诊断
----------------------------------------------------------------
logs\setup-<时间>.log        安装过程完整日志（失败时先看这个）
logs\doctor-<时间>.txt       体检报告
logs\app-<时间>.out.log      应用标准输出
logs\app-<时间>.err.log      应用错误输出（启动失败看这个的末尾）
logs\mysql-error.log         MySQL 错误日志
logs\start-<时间>.log        日常启动日志

出问题请按顺序：status.cmd → doctor.cmd → 看 logs → 仍然不行时把 logs
目录打包发给维护人员（日志里没有数据库明文密码）。

安全提示
----------------------------------------------------------------
· config\app.env 含数据库密码，不要发到群里或提交到代码仓库。
· 默认管理员 admin/123456 必须在第一次登录后修改。
· 不要把 3307 暴露到公网；需要外网访问请走反向代理 + HTTPS，并只暴露 8080。
