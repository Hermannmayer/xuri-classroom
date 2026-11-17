import base64, io, json, os, time, urllib.parse, urllib.request, uuid, zipfile
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
BASE='http://192.168.0.2:201'
def http(url, data=None, cookie=None, raw=None, ctype=None, timeout=180):
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    h={}
    if body is not None: h['Content-Type']=ctype or 'application/json'
    if cookie: h['Cookie']=cookie
    with urllib.request.urlopen(urllib.request.Request(url,data=body,headers=h),timeout=timeout) as r:
        return r.headers.get('Set-Cookie'), r.read()
_, b = http(BASE+'/api/system')
pk=json.loads(b)['data']['publicKey']
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

def parse_text(text):
    boundary='----dsh'+uuid.uuid4().hex
    def part(name, value):
        return ('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n' % (boundary, name)).encode() + value.encode() + b'\r\n'
    body = part('kind','text') + part('text', text) + ('--%s--\r\n' % boundary).encode()
    _, resp = http(BASE+'/api/import/parse', cookie=cookie, raw=body, ctype='multipart/form-data; boundary='+boundary)
    data=json.loads(resp)['data']
    print('  →', data['stats']['byType'], 'flat=', len(data['flat']))
    for q in data['flat']:
        print('    ', q['type'], '|', (q.get('title') or '')[:26], '| row=', len(q.get('row') or []), '| ds=', len(q.get('dataSource') or []))

print('A. 矩阵单选')
parse_text("1. 【矩阵单选】请评价以下项目\n行：服务态度\n行：响应速度\n列：满意\n列：一般\n答案：A|B")
print('B. 下拉题')
parse_text("1. 【下拉题】请选择一项\nA. 甲\nB. 乙\n答案：B")
print('C. 矩阵填空')
parse_text("1. 【矩阵填空】请填写\n行：姓名\n行：电话\n列：填写\n答案：张三|138")
print('D. 上传题')
parse_text("1. 【上传题】请上传现场照片\n答案：正面照")

print('\n== 成绩确认单（整班一张表） ==')
_, tr = http(BASE+'/api/answer/export/token', {}, cookie=cookie)
token=json.loads(tr)['data']['exportToken']
_, created = http(BASE+'/api/answer/export/pdf-job?exportToken='+urllib.parse.quote(token),
    {'projectId':'DzagEu','classId':'2129900000000000001','outputs':['confirmSheetPdf']}, cookie=cookie)
job_id=json.loads(created)['data']['jobId']
job={}
for _ in range(180):
    job=get('/api/answer/export/pdf-job/'+job_id)
    if job.get('status') in ('done','failed','canceled'): break
    time.sleep(2)
print('状态:', job.get('status'), 'done=', job.get('done'), 'failed=', job.get('failed'), 'fileName=', job.get('fileName'))
if job.get('status')=='done':
    _, zipped = http(BASE+'/api/answer/export/pdf-job/%s/file?exportToken=%s'%(job_id, urllib.parse.quote(token)), cookie=cookie)
    with zipfile.ZipFile(io.BytesIO(zipped)) as zf:
        names=[n for n in zf.namelist() if not n.endswith('/')]
        print('ZIP', len(zipped), '字节，文件：', names)
        name = names[0]
        open(os.path.join(os.environ.get('TEMP','.'), 'roster.pdf'),'wb').write(zf.read(name))
        print('已保存到 %TEMP%\\roster.pdf')
