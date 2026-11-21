---
title: "检查与测试"
description: "前端类型检查、构建、关键不变量测试、后端编译与线上冒烟"
---

# 检查与测试

> 只保留权限、Schema 迁移、数据范围、审计等关键不变量测试；不要新增测试。

## 改动前

~~~bash
npm run docs:where -- "关键词"
npm run docs:impact
~~~

## 前端

~~~bash
cd client
npm run check        # 类型检查，提交前必须过
npm run build        # 生产构建
~~~

## 后端

~~~bash
cd server
./gradlew :api:compileJava
./gradlew :shared:test :rdbms:test :api:test
./gradlew :api:bootJar -x test
~~~

本机 JDK 在 `%LOCALAPPDATA%\jdk25`；如果 `java` 不在 PATH，按 `AGENTS.md` 0.5 显式设置 `JAVA_HOME`。不要跳过编译直接发布。

## 文档

~~~bash
npm run docs:gen -- --check
npm run docs:check
npm run docs:build
~~~

## 线上冒烟

~~~bash
python scripts/nas/smoke-test.py
python scripts/nas/smoke-test.py --base https://<public-host>
~~~

冒烟覆盖：前端首页、静态资源、系统信息、admin 登录、试卷列表。

## 验收顺序

1. 改动的模块页已更新（last_verified / verified_against）。
2. docs:gen -- --check、docs:check、docs:build 通过。
3. 前端 npm run check、后端编译通过。
4. 发布后冒烟通过；涉及权限/数据的改动，用对应角色实际点一遍。
