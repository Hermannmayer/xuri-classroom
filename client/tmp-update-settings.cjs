
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{for(let i=0;i<20;i++){const s=await req('/api/system');if(s.status===200)break;await new Promise(r=>setTimeout(r,1000));}
const s=await req('/api/system');const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(s.json.data.publicKey,'123456')})});const AH={'Content-Type':'application/json',Cookie:(a.headers.get('set-cookie')||'').split(';')[0]};
const sys=await req('/api/system',{headers:AH});console.log('setting keys',Object.keys(sys.json.data.setting||{}).filter(k=>k.includes('update')));
const upd=await req('/api/system/update',{method:'POST',headers:AH,body:JSON.stringify({setting:{updateCheckEnabled:true,updateCheckIntervalHours:24}})});console.log('save',upd.status,upd.text.slice(0,150));
const chk=await req('/api/system/update/check?force=true',{headers:AH});console.log('check',chk.status,chk.text.slice(0,500));
})();
