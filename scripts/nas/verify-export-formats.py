#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验收「答卷导出多格式」：一次任务产出成绩单 / 答题卷 / 长图 / 确认单。

用法：
  python scripts/nas/verify-export-formats.py --base http://192.168.0.2:201

检查：
1. admin 登录；
2. 取演示班前 2 份答卷；
3. POST /api/answer/export/pdf-job，outputs 传四种；
4. 轮询到 done，下载 ZIP，列出子目录与文件大小；
5. 断言四个子目录都存在、文件数 = 2、无 0 字节文件。
"""
import argparse
import base64
import io
import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import zipfile

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding

PROJECT = 'DzagEu'
CLASS_ID = '2129900000000000001'


def http(url, data=None, cookie=None, timeout=180):
    body = json.dumps(data).encode() if data is not None else None
    headers = {'Content-Type': 'application/json'} if body else {}
    if cookie:
        headers['Cookie'] = cookie
    with urllib.request.urlopen(urllib.request.Request(url, data=body, headers=headers), timeout=timeout) as resp:
        return resp.headers.get('Set-Cookie'), resp.read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='http://192.168.0.2:201')
    parser.add_argument('--user', default='admin')
    parser.add_argument('--password', default='123456')
    parser.add_argument('--out', default=os.path.join(tempfile.gettempdir(), 'answer-export-check.zip'))
    args = parser.parse_args()
    base = args.base.rstrip('/')

    _, body = http(base + '/api/system')
    public_key = json.loads(body)['data']['publicKey']
    key = serialization.load_der_public_key(base64.b64decode(public_key))
    encrypted = base64.b64encode(key.encrypt(args.password.encode(), padding.PKCS1v15())).decode()
    _, raw = http(base + '/api/public/login', {'username': args.user, 'password': encrypted})
    cookie = None
    # 登录响应不带 Set-Cookie 时需要单独取：urllib 不暴露；这里用第二次请求的 header 兜底
    with urllib.request.urlopen(urllib.request.Request(
            base + '/api/public/login',
            data=json.dumps({'username': args.user, 'password': encrypted}).encode(),
            headers={'Content-Type': 'application/json'}), timeout=30) as resp:
        cookie = (resp.headers.get('Set-Cookie') or '').split(';')[0]
    print('登录：', 'OK' if cookie else 'FAILED')

    def get(path):
        _, payload = http(base + path, cookie=cookie)
        return json.loads(payload)['data']

    answers = get('/api/answer/list?projectId=%s&classId=%s&pageSize=-1&includeAnonymous=true'
                  % (PROJECT, CLASS_ID)).get('list') or []
    ids = [row['id'] for row in answers[:2]]
    print('取到答卷：%d 份，抽 %d 份做多格式导出' % (len(answers), len(ids)))

    _, token_raw = http(base + '/api/answer/export/token', {}, cookie=cookie)
    token = json.loads(token_raw)['data'].get('exportToken')
    _, created = http(base + '/api/answer/export/pdf-job?exportToken=' + urllib.parse.quote(token or ''),
                      {'projectId': PROJECT, 'ids': ids,
                       'outputs': ['answerPdf', 'answerSheetPdf', 'answerImage', 'confirmSheetPdf']},
                      cookie=cookie)
    job_id = json.loads(created)['data']['jobId']
    print('任务：', job_id)

    job = {}
    for _ in range(180):
        job = get('/api/answer/export/pdf-job/' + job_id)
        if job.get('status') in ('done', 'failed', 'canceled'):
            break
        time.sleep(2)
    print('状态：%s 完成 %s/%s 失败 %s' % (job.get('status'), job.get('done'), job.get('total'), job.get('failed')))
    if job.get('status') != 'done':
        print('失败原因：', job.get('error') or job.get('message'))
        return 1

    _, zipped = http(base + '/api/answer/export/pdf-job/%s/file?exportToken=%s'
                     % (job_id, urllib.parse.quote(token or '')), cookie=cookie)
    open(args.out, 'wb').write(zipped)
    print('ZIP：%d 字节 → %s' % (len(zipped), args.out))

    ok = True
    with zipfile.ZipFile(io.BytesIO(zipped)) as zf:
        names = [n for n in zf.namelist() if not n.endswith('/')]
        groups = {}
        for name in names:
            top = name.split('/')[0] if '/' in name else '(根)'
            groups.setdefault(top, []).append(name)
        for top in sorted(groups):
            print('  目录 %-8s %d 个文件' % (top, len(groups[top])))
            for name in sorted(groups[top]):
                size = zf.getinfo(name).file_size
                print('    %-40s %8d 字节' % (name.split('/')[-1], size))
                if size <= 0:
                    ok = False
        missing = [d for d in ('成绩单', '答题卷', '长图', '确认单') if d not in groups]
        if missing:
            print('缺少目录：', '、'.join(missing))
            ok = False
        if any(len(v) != len(ids) for v in groups.values()):
            print('文件数与答卷数不一致')
            ok = False
    print('\n' + ('全部通过' if ok else '未通过'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
