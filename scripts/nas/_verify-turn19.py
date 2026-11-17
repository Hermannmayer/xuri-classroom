import base64, io, json, os, urllib.request, uuid
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding

BASE='http://192.168.0.2:201'
def http(url, data=None, cookie=None, timeout=120, raw=None, ctype=None):
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    h={}
    if body is not None:
        h['Content-Type'] = ctype or 'application/json'
    if cookie: h['Cookie']=cookie
    with urllib.request.urlopen(urllib.request.Request(url,data=body,headers=h),timeout=timeout) as r:
        return r.headers.get('Set-Cookie'), r.read()

_, b = http(BASE+'/api/system')
info=json.loads(b)['data']
pk=info['publicKey']
key=serialization.load_der_public_key(base64.b64decode(pk))
enc=base64.b64encode(key.encrypt(b'123456',padding.PKCS1v15())).decode()
_, _ = http(BASE+'/api/public/login', {'username':'admin','password':enc})
with urllib.request.urlopen(urllib.request.Request(BASE+'/api/public/login',
        data=json.dumps({'username':'admin','password':enc}).encode(),
        headers={'Content-Type':'application/json'}), timeout=30) as r:
    cookie=(r.headers.get('Set-Cookie') or '').split(';')[0]

def get(path):
    _, payload = http(BASE+path, cookie=cookie)
    return json.loads(payload)['data']

print('== 首页统计 ==')
ov = get('/api/dashboard/overview')
print('users:', ov['users'])
print('classes:', ov['classes'])
print('projects:', ov['projects'])
print('answers:', ov['answers'])
print('scores:', ov['scores'])
tr = get('/api/dashboard/trend?days=7')
print('trend days:', tr['days'], 'answers:', tr['answers'], 'avg:', tr['avgScores'])
th = get('/api/dashboard/teacher')
print('teacher:', {k: th.get(k) for k in ('classes','students','projects','answers','pendingGrading','graded7d','avgScore')})
st = get('/api/dashboard/student')
print('student:', {k: st.get(k) for k in ('answers','avgScore','bestScore','practiceCount','practiceQuestions','todoExams')})

print('\n== Excel 导入（含图片 / 新题型 / JSON 兜底） ==')
sample = os.path.join(os.environ.get('TEMP','.'), 'import-sample.xlsx')
blob = open(sample,'rb').read()
boundary = '----dsh' + uuid.uuid4().hex
def part(name, value, filename=None, ctype=None):
    head = '--%s\r\nContent-Disposition: form-data; name="%s"' % (boundary, name)
    if filename:
        head += '; filename="%s"' % filename
    head += '\r\n'
    if ctype:
        head += 'Content-Type: %s\r\n' % ctype
    head += '\r\n'
    return head.encode() + (value if isinstance(value, bytes) else str(value).encode()) + b'\r\n'
body = b''
body += part('kind', 'excel')
body += part('file', blob, 'import-sample.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
body += ('--%s--\r\n' % boundary).encode()
_, resp = http(BASE+'/api/import/parse', cookie=cookie, raw=body, ctype='multipart/form-data; boundary='+boundary)
preview = json.loads(resp)['data']
print('题型统计:', preview['stats']['byType'], '题数:', preview['stats']['total'])
print('warnings:', [w.get('code') for w in preview.get('warnings') or []])
flat = preview['flat']
for q in flat:
    print(' -', q['type'], '|', (q.get('title') or '')[:40], '| 图片' if '<img' in (q.get('title') or '') else '')
imgs = sum(1 for q in flat if '<img' in (q.get('title') or ''))
print('带图题目数:', imgs)

print('\n== 文本导入：矩阵标记 ==')
text = "一、矩阵\n【矩阵单选】请评价以下项目\n行：服务态度\n行：响应速度\n列：满意\n列：一般\n答案：A|B\n1. 【下拉题】选择一项\nA. 甲\nB. 乙\n答案：B"
_, resp2 = http(BASE+'/api/import/parse', {'kind':'text','text':text}, cookie=cookie)
p2 = json.loads(resp2)['data']
print('文本题型:', p2['stats']['byType'])
for q in p2['flat']:
    print(' -', q['type'], '|', (q.get('title') or '')[:30], '| row=', len(q.get('row') or []), '| dataSource=', len(q.get('dataSource') or []))
