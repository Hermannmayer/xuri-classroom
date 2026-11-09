---
title: "检查与测试"
description: "前端类型检查、构建、规则测试、后端编译与线上冒烟"
---

# 检查与测试

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
npm run test:rules   # schema 规则引擎
npm run test:tree    # 树操作
~~~

## 后端

~~~bash
cd server
./gradlew :api:compileJava
./gradlew :api:bootJar -x test
~~~

没有本地 JDK 时使用 NAS 构建；不要跳过编译直接发布。

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

