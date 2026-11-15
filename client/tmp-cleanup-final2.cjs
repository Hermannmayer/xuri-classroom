
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';const PRIMARY='2120008858699354114';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{const s=await req('/api/system');const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(s.json.data.publicKey,'123456')})});const H={'Content-Type':'application/json',Cookie:(a.headers.get('set-cookie')||'').split(';')[0]};
 for(const phone of ['13900004444']){const m=await req('/api/teaching/classes/members?deptId='+PRIMARY,{headers:H});const row=(m.json?.data||[]).find(x=>x.phone===phone||x.username===phone);if(row){const d=await req('/api/teaching/classes/member/delete',{method:'POST',headers:H,body:JSON.stringify({deptId:PRIMARY,id:row.id})});console.log('delete',phone,d.status,d.text);}}
 const dp=await req('/api/project/delete',{method:'POST',headers:H,body:JSON.stringify({id:'Kbagoo'})});console.log('delete editor project',dp.status,dp.text);
})();
