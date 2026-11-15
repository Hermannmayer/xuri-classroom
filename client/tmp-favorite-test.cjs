
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';const PRIMARY='2120008858699354114';const PHONE='13900005555';const TPL='2118222506943381505';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{
 const sys=await req('/api/system');const pub=sys.json.data.publicKey;
 const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(pub,'123456')})});
 const ac=(a.headers.get('set-cookie')||'').split(';')[0];const AH={'Content-Type':'application/json',Cookie:ac};
 // project with favorite enabled
 const survey={id:'ps',title:'收藏测试项目',type:'Survey',attribute:{},children:[{id:'q1',title:'收藏题',type:'Radio',attribute:{},children:[{id:'o1',title:'A',type:'Option',attribute:{}},{id:'o2',title:'B',type:'Option',attribute:{}}],dataSource:[{label:'A',value:'o1'},{label:'B',value:'o2'}]}]};
 const cp=await req('/api/project/create',{method:'POST',headers:AH,body:JSON.stringify({name:'收藏测试-'+Date.now(),mode:'exam',setting:{status:1,answerSetting:{progressBar:true,autoSave:true},examSetting:{favoriteEnabled:true}},survey})});
 const pid=cp.json?.data?.id;console.log('project',pid,cp.status);if(!pid) throw new Error('no project');
 const as=await req('/api/teaching/classes/resources/assign',{method:'POST',headers:AH,body:JSON.stringify({classId:PRIMARY,resourceType:'project',resourceIds:[pid],status:1})});console.log('assign',as.status,as.text);
 const cs=await req('/api/teaching/classes/member/create',{method:'POST',headers:AH,body:JSON.stringify({deptId:PRIMARY,name:'收藏验收学员',phone:PHONE,password:'Test1234'})});console.log('student',cs.status,cs.text);
 const sl=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:PHONE,password:rsa(pub,'Test1234')})});const sc=(sl.headers.get('set-cookie')||'').split(';')[0];const SH={'Content-Type':'application/json',Cookie:sc};console.log('student login',sl.status);
 const f1=await req('/api/repo/book/favorite',{method:'POST',headers:SH,body:JSON.stringify({templateId:TPL,name:'题库收藏题'})});console.log('fav repo',f1.status,f1.text);
 const f2=await req('/api/repo/book/favorite',{method:'POST',headers:SH,body:JSON.stringify({templateId:'q1',projectId:pid,name:'考试收藏题'})});console.log('fav exam',f2.status,f2.text);
 const fl=await req('/api/repo/book/favorites',{headers:SH});console.log('favorites',fl.status,fl.text);
 const bl=await req('/api/repo/book/list?current=1&pageSize=50&type=2',{headers:SH});console.log('book list total',bl.json?.data?.total);
 // disable favorite on exam
 const up=await req('/api/project/update',{method:'POST',headers:AH,body:JSON.stringify({id:pid,setting:{status:1,answerSetting:{progressBar:true,autoSave:true},examSetting:{favoriteEnabled:false}}})});console.log('disable',up.status,up.text);
 const f3=await req('/api/repo/book/favorite',{method:'POST',headers:SH,body:JSON.stringify({templateId:'q1',projectId:pid,name:'考试收藏题'})});console.log('fav after disable',f3.status,f3.text);
 console.log('IDS',JSON.stringify({pid,phone:PHONE}));
})();
