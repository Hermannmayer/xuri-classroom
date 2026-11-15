
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';const CLASS='2120008858699354114';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{
 const s=await req('/api/system');const pub=s.json.data.publicKey;
 const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(pub,'123456')})});const AH={'Content-Type':'application/json',Cookie:(a.headers.get('set-cookie')||'').split(';')[0]};
 const stats=await req('/api/project/class-anonymous-stats?projectId=cHtS1e',{headers:AH}); console.log('class stats',stats.status,stats.text);
 const cls=await req('/api/teaching/classes/answers?projectId=cHtS1e&deptId='+CLASS+'&current=1&pageSize=20',{headers:AH}); console.log('class answers total',cls.json?.data?.total, 'anonymous', cls.json?.data?.list?.[0]?.isAnonymous);
 const survey={id:'s',title:'公开匿名无班级验收',type:'Survey',attribute:{},children:[{id:'q1',title:'测试题',type:'Radio',attribute:{},children:[{id:'o1',title:'A',type:'Option',attribute:{},dataSource:[]} ]}]};
 const cp=await req('/api/project/create',{method:'POST',headers:AH,body:JSON.stringify({name:'公开匿名无班级验收-'+Date.now(),mode:'exam',setting:{status:1,answerSetting:{loginRequired:false}},survey})}); const pid2=cp.json?.data?.id; console.log('p2',pid2);
 const ans=await req('/api/public/saveAnswer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid2,survey,answer:{q1:{o1:true}},tempSave:1})}); console.log('general save',ans.status,ans.json?.data?.answerId);
 const st2=await req('/api/project/class-anonymous-stats?projectId='+pid2,{headers:AH}); console.log('general stats',st2.status,st2.text);
 console.log('cleanup',pid2);
})();
