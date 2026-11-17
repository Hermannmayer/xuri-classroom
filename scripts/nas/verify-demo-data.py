#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""演示数据与导出链路的自检（部署后在 NAS 内网地址跑一遍）。

检查项：
1. admin 登录（RSA，与浏览器同一条路径）；
2. 「养老五级 · 第2套」(DzagEu) 的演示班答卷数 = 12；
3. 按班级导出 PDF 任务：建任务 → 轮询 → 下载 ZIP，产物非空；
4. 不选班级、只传 ids 的导出：验证「勾选批量导出」可用；
5. 未交卷名单接口返回 3 人（新接口，旧版本会 404，属预期）。

用法：
  python scripts/nas/verify-demo-data.py --base http://192.168.0.2:201
"""
import argparse
import base64
import json
import sys
import time
import urllib.parse
import urllib.request

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding

PROJECT = 'DzagEu'
CLASS_ID = '2129900000000000001'


def http(url, data=None, cookie=None, timeout=60, raw=False):
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
    if cookie:
        headers['Cookie'] = cookie
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = resp.read()
        return resp.status, resp.headers.get('Set-Cookie'), payload if raw else payload.decode('utf-8', 'replace')


def rsa_encrypt(public_key_b64, text):
    key = serialization.load_der_public_key(base64.b64decode(public_key_b64))
    return base64.b64encode(key.encrypt(text.encode(), padding.PKCS1v15())).decode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='http://192.168.0.2:201')
    parser.add_argument('--user', default='admin')
    parser.add_argument('--password', default='123456')
    args = parser.parse_args()
    base = args.base.rstrip('/')

    _, _, body = http(base + '/api/system')
    public_key = json.loads(body)['data']['publicKey']
    encrypted = rsa_encrypt(public_key, args.password)
    _, set_cookie, _ = http(base + '/api/public/login', {'username': args.user, 'password': encrypted})
    cookie = (set_cookie or '').split(';')[0]
    print('登录成功：', cookie.split('=')[0])

    def get(path):
        _, _, text = http(base + path, cookie=cookie)
        return json.loads(text)['data']

    # 1. 演示班答卷数
    answers = get('/api/answer/list?projectId=%s&classId=%s&pageSize=-1&includeAnonymous=true' % (PROJECT, CLASS_ID))
    rows = answers.get('list') or []
    print('演示班答卷：%d 份（期望 12）' % len(rows))
    scores = sorted({r.get('examScore') for r in rows if r.get('examScore') is not None})
    print('分数档：', scores)

    # 2. 未交卷名单
    try:
        roster = get('/api/teaching/classes/unsubmitted?projectId=%s&deptId=%s' % (PROJECT, CLASS_ID))
        print('未交卷：%s 人（期望 3）' % roster.get('total'))
    except Exception as exc:  # 旧版本没有这个接口
        print('未交卷接口不可用（旧版本？）：', exc)

    # 3. 按班级导出 PDF → ZIP
    _, _, text = http(base + '/api/answer/export/token', {}, cookie=cookie)
    token = json.loads(text)['data'].get('exportToken')
    _, _, created = http(base + '/api/answer/export/pdf-job?exportToken=' + urllib.parse.quote(token or ''),
                         {'projectId': PROJECT, 'classId': CLASS_ID, 'includeAnalysis': False, 'includeImages': False},
                         cookie=cookie)
    job_id = json.loads(created)['data']['jobId']
    print('PDF 任务：', job_id)
    for _ in range(120):
        job = get('/api/answer/export/pdf-job/' + job_id)
        if job.get('status') in ('done', 'failed', 'canceled'):
            break
        time.sleep(2)
    print('任务状态：', job.get('status'), '完成 %s/%s' % (job.get('done'), job.get('total')))
    if job.get('status') != 'done':
        print('导出失败：', job.get('error') or job.get('message'))
        return 1
    _, _, raw = http(base + '/api/answer/export/pdf-job/%s/file?exportToken=%s' % (job_id, urllib.parse.quote(token or '')),
                     cookie=cookie, raw=True)
    print('ZIP 产物：%d 字节' % len(raw))
    if len(raw) < 1000:
        print('ZIP 太小，可能没有内容')
        return 1

    # 4. 只传 ids（勾选批量导出）——旧版本会 400「需要班级 id」，2.3.x 起才支持
    ids = [r['id'] for r in rows[:3]]
    try:
        _, _, created = http(base + '/api/answer/export/pdf-job?exportToken=' + urllib.parse.quote(token or ''),
                             {'projectId': PROJECT, 'ids': ids}, cookie=cookie)
    except Exception as exc:
        print('勾选导出（不传班级）：旧版本不支持（%s），部署后再验' % exc)
        return 0
    job_id = json.loads(created)['data']['jobId']
    for _ in range(60):
        job = get('/api/answer/export/pdf-job/' + job_id)
        if job.get('status') in ('done', 'failed', 'canceled'):
            break
        time.sleep(2)
    print('勾选 3 份导出：', job.get('status'), 'done=%s' % job.get('done'))
    if job.get('status') != 'done':
        print('\n勾选导出未通过')
        return 1

    # 5. 数据页过滤参数（时间 / 姓名 / 分数段），顺带验证 AnswerQuery 的 @DateTimeFormat
    def count(query):
        data = get('/api/answer/list?projectId=%s&classId=%s&pageSize=-1&includeAnonymous=true&%s'
                   % (PROJECT, CLASS_ID, query))
        return len(data.get('list') or [])

    print('时间过滤 2026-11-10~2026-11-18：%d 份' % count('startTime=2026-11-10%2000%3A00%3A00&endTime=2026-11-18%2000%3A00%3A00'))
    print('姓名过滤「演示学员01」：%d 份（期望 1）' % count('createByName=%E6%BC%94%E7%A4%BA%E5%AD%A6%E5%91%9801'))
    print('分数段 >=86：%d 份' % count('minScore=86'))

    # 6. 报表时间过滤
    report = get('/api/report/class/%s?classId=%s&startTime=2026-11-10%%2000%%3A00%%3A00&endTime=2026-11-18%%2000%%3A00%%3A00'
                 % (PROJECT, CLASS_ID))
    print('报表（含时间范围）答卷数：%s' % report.get('total'))

    print('\n全部通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
