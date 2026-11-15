
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{const s=await req('/api/system');const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(s.json.data.publicKey,'123456')})});const AH={'Content-Type':'application/json',Cookie:(a.headers.get('set-cookie')||'').split(';')[0]};
for(const id of ['cHtS1e','GFJogV']){const r=await req('/api/project/delete',{method:'POST',headers:AH,body:JSON.stringify({id})});console.log(id,r.status,r.text.slice(0,120));}
})();
