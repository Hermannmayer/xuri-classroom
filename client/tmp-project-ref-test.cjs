
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{
 const sys=await req('/api/system');const pub=sys.json.data.publicKey;
 const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(pub,'123456')})});
 const c=(a.headers.get('set-cookie')||'').split(';')[0];const H={'Content-Type':'application/json',Cookie:c};
 const repoId='2121951202341797889', templateId='2121951204560584706', fileId='h09ZXMRr8dqzQXkZiYYXz';
 const qid='qproj'+Date.now().toString(36);
 const survey={id:'proj-survey',title:'富文本项目',type:'Survey',attribute:{},children:[{id:qid,title:'题目',type:'Radio',description:'<p>项目图片</p><img src="/api/public/preview/'+fileId+'">',attribute:{},children:[{id:'o1',title:'A',type:'Option',attribute:{}},{id:'o2',title:'B',type:'Option',attribute:{}}],dataSource:[{label:'A',value:'o1'},{label:'B',value:'o2'}]},{id:'remark1',title:'说明',type:'Remark',attribute:{content:'<p>说明图片</p><img src="/api/public/preview/'+fileId+'">'}}]};
 const cp=await req('/api/project/create',{method:'POST',headers:H,body:JSON.stringify({name:'富文本项目-'+Date.now(),mode:'exam',setting:{status:1,answerSetting:{progressBar:true,autoSave:true},examSetting:{favoriteEnabled:true}},survey})});
 console.log('create project',cp.status,cp.text);
 const pid=cp.json?.data?.id; if(!pid) throw new Error('no project id');
 // check refs via DB done separately
 const delRepo=await req('/api/repo/delete',{method:'POST',headers:H,body:JSON.stringify({id:repoId})});
 console.log('delete repo',delRepo.status,delRepo.text);
 const delProj=await req('/api/project/delete',{method:'POST',headers:H,body:JSON.stringify({id:pid})});
 console.log('delete project',delProj.status,delProj.text);
 console.log('PROJECT',pid);
})();
