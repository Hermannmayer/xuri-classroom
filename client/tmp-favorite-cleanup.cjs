
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';const PRIMARY='2120008858699354114';const PHONE='13900005555';const PID='huexS7';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{
 const sys=await req('/api/system');const pub=sys.json.data.publicKey;
 const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(pub,'123456')})});const ac=(a.headers.get('set-cookie')||'').split(';')[0];const AH={'Content-Type':'application/json',Cookie:ac};
 const members=await req('/api/teaching/classes/members?deptId='+PRIMARY,{headers:AH});const row=(members.json?.data||[]).find(x=>x.phone===PHONE||x.username===PHONE);console.log('member',row&&row.id);
 if(row){const d=await req('/api/teaching/classes/member/delete',{method:'POST',headers:AH,body:JSON.stringify({deptId:PRIMARY,id:row.id})});console.log('delete student',d.status,d.text);}
 const dp=await req('/api/project/delete',{method:'POST',headers:AH,body:JSON.stringify({id:PID})});console.log('delete project',dp.status,dp.text);
})();
