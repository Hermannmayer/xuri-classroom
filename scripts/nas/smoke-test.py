#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
旭日云课堂 · 线上冒烟测试（从开发机跑，打 NAS 上的 live 环境）

检查 5 件事，全过才算"这次改动没把线上搞坏"：
  1. 前端首页 200 且 <title> 是「考试与学习平台」
  2. 首页引用的 JS 产物能取到（说明 web-watch 构建产物已就位）
  3. /api/system 200，且返回的站点名不是空的
  4. admin 能登录（密码走 RSA 加密，和浏览器完全同一条路径）
  5. 登录后能列出试卷，且至少有一份能打开（说明数据可读、JSON 没坏）

退出码：0 全过 / 1 有失败项

用法：
  python scripts/nas/smoke-test.py
  python scripts/nas/smoke-test.py --base http://192.168.0.2:201
  python scripts/nas/smoke-test.py --base https://<public-host>   # 连公网一起验
  python scripts/nas/smoke-test.py --user admin --password 123456 --expect-name 旭日
"""
import argparse
import base64
import json
import re
import sys
import urllib.error
import urllib.request

# Windows 控制台默认 GBK，打印 ✅/❌ 会 UnicodeEncodeError。强制 UTF-8（失败就算了）。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:  # noqa: BLE001
        pass


def http(url, data=None, cookie=None, timeout=15):
    headers = {'Content-Type': 'application/json'}
    if cookie:
        headers['Cookie'] = cookie
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers,
                                 method='POST' if data is not None else 'GET')
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
        return r.status, dict(r.headers), raw


def rsa_encrypt(public_key_b64, text):
    from cryptography.hazmat.primitives.serialization import load_der_public_key
    from cryptography.hazmat.primitives.asymmetric import padding
    key = load_der_public_key(base64.b64decode(public_key_b64))
    return base64.b64encode(key.encrypt(text.encode(), padding.PKCS1v15())).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='http://192.168.0.2:201')
    ap.add_argument('--user', default='admin')
    ap.add_argument('--password', default='123456')
    ap.add_argument('--expect-name', default='旭日',
                    help='站点名里应包含的关键字（默认「旭日」）')
    ap.add_argument('--min-projects', type=int, default=1)
    args = ap.parse_args()

    base = args.base.rstrip('/')
    results = []

    def check(name, fn):
        try:
            detail = fn()
            results.append((True, name, detail or ''))
        except Exception as e:  # noqa: BLE001
            results.append((False, name, f'{type(e).__name__}: {e}'))

    # 1. 首页
    def c1():
        status, _, body = http(base + '/')
        assert status == 200, f'HTTP {status}'
        title = re.search(r'<title>([^<]*)</title>', body.decode('utf-8', 'replace'))
        assert title, '没有 <title>'
        assert '考试与学习平台' in title.group(1), f'标题是 {title.group(1)!r}'
        return f'title={title.group(1)}'
    check('前端首页', c1)

    # 2. 静态资源
    def c2():
        _, _, body = http(base + '/')
        m = re.search(rb'/assets/index-[A-Za-z0-9_-]+\.js', body)
        assert m, '首页里没有 /assets/index-*.js'
        status, _, js = http(base + m.group().decode())
        assert status == 200 and len(js) > 100000, f'HTTP {status}, {len(js)} bytes'
        return f'{m.group().decode()} → {len(js)//1024} KB'
    check('前端产物', c2)

    # 3. 系统信息
    state = {}

    def c3():
        status, _, body = http(base + '/api/system')
        assert status == 200, f'HTTP {status}'
        data = json.loads(body.decode())['data']
        assert data.get('name'), '站点名为空'
        assert args.expect_name in data['name'], f'站点名是 {data["name"]!r}，不含 {args.expect_name!r}'
        state['publicKey'] = data['publicKey']
        return f'{data["name"]} / v{data.get("version")}'
    check('系统信息', c3)

    # 4. 登录（RSA，与浏览器同路径）
    def c4():
        enc = rsa_encrypt(state['publicKey'], args.password)
        status, headers, _ = http(base + '/api/public/login',
                                  data={'username': args.user, 'password': enc})
        assert status == 200, f'HTTP {status}'
        cookie = headers.get('Set-Cookie', '')
        assert cookie.startswith('sk-token'), f'没拿到 sk-token：{cookie[:40]}'
        state['cookie'] = cookie.split(';')[0]
        return f'{args.user} 登录 OK'
    check('登录', c4)

    # 5. 试卷数据
    def c5():
        _, _, body = http(base + '/api/project/list?page=1&size=100', cookie=state['cookie'])
        data = json.loads(body.decode())
        assert data.get('code') == 200, f'接口返回 {data.get("code")}: {data.get("message")}'
        rows = data['data'].get('list') or []
        assert len(rows) >= args.min_projects, f'只列出 {len(rows)} 份'
        first = rows[0]
        _, _, one = http(base + f'/api/project?id={first["id"]}', cookie=state['cookie'])
        d = json.loads(one.decode()).get('data') or {}
        assert d.get('name'), '打开第一份试卷失败'
        return f'{len(rows)} 份，首份「{d["name"]}」'
    check('试卷数据', c5)

    print(f'\n冒烟测试 → {base}\n' + '-' * 60)
    ok = True
    for passed, name, detail in results:
        print(f'  {"✅" if passed else "❌"}  {name:<10} {detail}')
        ok = ok and passed
    print('-' * 60)
    print('全部通过' if ok else '有失败项，先别继续')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
