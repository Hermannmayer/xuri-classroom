
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';const PHONE='13900004444';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{const s=await req('/api/system');const l=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:PHONE,password:rsa(s.json.data.publicKey,'Test1234')})});const H={'Content-Type':'application/json',Cookie:(l.headers.get('set-cookie')||'').split(';')[0]};const r=await req('/api/exercise/list?current=1&pageSize=20',{headers:H});console.log(r.status,r.text);})();
