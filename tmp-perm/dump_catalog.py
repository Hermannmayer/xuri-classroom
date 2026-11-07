import base64, json, sys, urllib.request

BASE = 'http://192.168.0.2:201'

def http(url, data=None, cookie=None):
    h = {'Content-Type': 'application/json'}
    if cookie:
        h['Cookie'] = cookie
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=h, method='POST' if data is not None else 'GET')
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode()), r.headers.get('Set-Cookie', '')

sysinfo, _ = http(BASE + '/api/system')
pub = sysinfo['data']['publicKey']

from cryptography.hazmat.primitives.serialization import load_der_public_key
from cryptography.hazmat.primitives.asymmetric import padding
key = load_der_public_key(base64.b64decode(pub))
enc = base64.b64encode(key.encrypt(b'123456', padding.PKCS1v15())).decode()
_, cookie = http(BASE + '/api/public/login', {'username': 'admin', 'password': enc})
cookie = cookie.split(';')[0]

catalog, _ = http(BASE + '/api/system/permission/list', cookie=cookie)
groups = catalog.get('data') or []
print(f'分组数: {len(groups)}\n')
for g in groups:
    perms = g.get('permissions') or []
    print(f'【{g.get("group")}】 {len(perms)} 个')
    for p in perms:
        print(f'   {p.get("code"):<28} {p.get("name")}')
    print()
