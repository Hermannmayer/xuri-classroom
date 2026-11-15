
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';const CLASS='2120008858699354114';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{
 const s=await req('/api/system');const pub=s.json.data.publicKey;
 const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(pub,'123456')})});const AH={'Content-Type':'application/json',Cookie:(a.headers.get('set-cookie')||'').split(';')[0]};
 const survey={id:'s',title:'班级匿名链接验收',type:'Survey',attribute:{},children:[{id:'q1',title:'测试题',type:'Radio',attribute:{},children:[{id:'o1',title:'A',type:'Option',attribute:{}},{id:'o2',title:'B',type:'Option',attribute:{}}],dataSource:[{label:'A',value:'o1'},{label:'B',value:'o2'}]}]};
 const cp=await req('/api/project/create',{method:'POST',headers:AH,body:JSON.stringify({name:'班级匿名链接验收-'+Date.now(),mode:'exam',setting:{status:1,answerSetting:{loginRequired:false,progressBar:true,autoSave:true},examSetting:{favoriteEnabled:true}},survey})});
 const pid=cp.json?.data?.id; console.log('project',pid,cp.status);
 if(!pid) throw new Error(cp.text);
 const as=await req('/api/teaching/classes/resources/assign',{method:'POST',headers:AH,body:JSON.stringify({classId:CLASS,resourceType:'project',resourceIds:[pid],status:1})});
 console.log('assign',as.status,as.text);
 const lk=await req('/api/teaching/classes/resources/link',{method:'POST',headers:AH,body:JSON.stringify({classId:CLASS,resourceId:pid})});
 console.log('link',lk.status,lk.text.slice(0,200)); const token=lk.json?.data?.token;
 if(!token) throw new Error('no token');
 const outline=await req('/api/public/projectOutline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,classToken:token})});
 console.log('outline classId',outline.json?.data?.classId);
 const ans=await req('/api/public/saveAnswer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid,classToken:token,survey,answer:{q1:{o1:true}},tempSave:1})});
 console.log('save class',ans.status,ans.text.slice(0,150));
 const ans2=await req('/api/public/saveAnswer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid,survey,answer:{q1:{o1:true}},tempSave:1})});
 console.log('save general',ans2.status,ans2.text.slice(0,150));
 const stats=await req('/api/project/class-anonymous-stats?projectId='+pid,{headers:AH}); console.log('stats',stats.status,stats.text);
 const cls=await req('/api/teaching/classes/answers?projectId='+pid+'&deptId='+CLASS+'&current=1&pageSize=20',{headers:AH}); console.log('class answers',cls.status,cls.text.slice(0,400));
 const bad=await req('/api/public/projectOutline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,classToken:'INVALID'})}); console.log('invalid token',bad.status,bad.text);
 console.log('IDS',JSON.stringify({pid,token}));
})();
