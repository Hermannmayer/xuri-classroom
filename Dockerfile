# 多阶段构建：前端 → 后端（含前端静态资源）→ 运行时
# 构建：docker build -t xuri-classroom .
# 运行：docker compose up -d

# ---------- 1. 前端 ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- 2. 后端（前端 dist 打进 classpath:/static） ----------
FROM gradle:7.6-jdk8 AS api
WORKDIR /src
COPY server/ ./
COPY --from=web /web/dist ./api/src/main/resources/static
RUN gradle :api:bootJar -x test --no-daemon

# ---------- 3. 运行时 ----------
FROM eclipse-temurin:8-jre-alpine
RUN apk add --no-cache tzdata curl \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
WORKDIR /app
COPY --from=api /src/api/build/libs/*.jar app.jar
ENV TZ=Asia/Shanghai
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fs http://localhost/api/system >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
