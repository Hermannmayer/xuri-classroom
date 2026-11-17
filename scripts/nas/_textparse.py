import base64, json, urllib.request, urllib.error
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
BASE='http://192.168.0.2:201'
def http(url, data=None, cookie=None):
    body=json.dumps(data).encode() if data is not None else None
    h={'Content-Type':'application/json'} if body else {}
    if cookie: h['Cookie']=cookie
    with urllib.request.urlopen(urllib.request.Request(url,data=body,headers=h),timeout=60) as r:
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

def parse(text):
    try:
        _, resp = http(BASE+'/api/import/parse', {'kind':'text','text':text}, cookie=cookie)
        data = json.loads(resp)['data']
        print('  →', data['stats']['byType'], 'flat=', len(data['flat']))
        for q in data['flat']:
            print('    ', q['type'], '|', (q.get('title') or '')[:30], '| row=', len(q.get('row') or []), '| ds=', len(q.get('dataSource') or []))
    except urllib.error.HTTPError as e:
        print('  → HTTP', e.code, e.read().decode('utf-8','replace')[:300])

print('A. 带编号的矩阵标记')
parse("1. 【矩阵单选】请评价以下项目\n行：服务态度\n行：响应速度\n列：满意\n列：一般\n答案：A|B")
print('B. 下拉题')
parse("1. 【下拉题】请选择一项\nA. 甲\nB. 乙\n答案：B")
print('C. 矩阵填空')
parse("1. 【矩阵填空】请填写\n行：姓名\n行：电话\n列：填写\n答案：张三|138")
print('D. 上传题')
parse("1. 【上传题】请上传现场照片\n答案：正面照")
