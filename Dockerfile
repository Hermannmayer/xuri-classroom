# 前后端分离部署：
#   web  = nginx，对外 80，托管前端静态文件，并把 /api 反代给后端
#   app  = Java 后端，只在内网 7007，不对用户暴露
#
# 构建：docker compose build
# 运行：docker compose up -d
# 访问：http://<服务器地址>（前端 80，用户不需要知道后端端口）

# ---------- 1. 前端产物 ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- 2. 后端可执行 jar（前端不再打进 classpath） ----------
FROM gradle:7.6-jdk8 AS api
WORKDIR /src
COPY server/ ./
RUN gradle :api:bootJar -x test --no-daemon

# ---------- 3. 后端运行时：内部端口 7007 ----------
FROM eclipse-temurin:8-jre-alpine AS app
RUN apk add --no-cache tzdata curl \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
WORKDIR /app
COPY --from=api /src/api/build/libs/*.jar app.jar
ENV TZ=Asia/Shanghai
EXPOSE 7007
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fs http://localhost:7007/api/system >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=7007"]

# ---------- 4. 前端运行时：nginx 对外 80 ----------
FROM nginx:1.27-alpine AS web-final
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
