
const fs=require('fs');const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{
 const sys=await req('/api/system');const pub=sys.json.data.publicKey;
 const admin=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(pub,'123456')})});
 const ac=(admin.headers.get('set-cookie')||'').split(';')[0];const H={'Content-Type':'application/json',Cookie:ac};
 const suffix=Date.now().toString(36);
 const repoName='富文本测试-'+suffix;
 const cr=await req('/api/repo/create',{method:'POST',headers:H,body:JSON.stringify({name:repoName,category:'测试',mode:'exam'})});
 console.log('create repo',cr.status,cr.text);
 const list=await req('/api/repo/list?current=1&pageSize=20&name='+encodeURIComponent(repoName),{headers:H});
 const repo=(list.json?.data?.list||[]).find(x=>x.name===repoName)||(list.json?.data?.data||[]).find(x=>x.name===repoName);
 console.log('repo',repo&&repo.id);
 if(!repo) throw new Error('repo not found');
 const qid='q_'+suffix;
 const template={id:qid,title:'测试题',type:'Radio',attribute:{},children:[{id:'o1',title:'A',type:'Option',attribute:{}},{id:'o2',title:'B',type:'Option',attribute:{}}],dataSource:[{label:'A',value:'o1'},{label:'B',value:'o2'}]};
 const ct=await req('/api/template/create',{method:'POST',headers:H,body:JSON.stringify({repoId:repo.id,name:'测试题',questionType:'Radio',mode:'exam',template})});
 console.log('create template',ct.status,ct.text);
 const tl=await req('/api/template/list?repoId='+repo.id+'&current=1&pageSize=20',{headers:H});
 const trow=(tl.json?.data?.list||tl.json?.data?.data||[]).find(x=>x.name==='测试题');
 console.log('template row',trow&&trow.id);
 if(!trow) throw new Error('template not found');
 // upload image
 const fd=new FormData();fd.append('file',new Blob([fs.readFileSync('C:/Users/Nightwatchman/Downloads/captcha-login-final.png')],{type:'image/png'}),'rich-test.png');fd.append('publicRead','true');fd.append('ownerType','repo');fd.append('ownerId',repo.id);fd.append('questionId',trow.id);
 const up=await req('/api/file/create',{method:'POST',headers:{Cookie:ac},body:fd});
 console.log('upload',up.status,up.text.slice(0,300));
 const fileId=up.json?.data?.id;
 if(!fileId) throw new Error('upload missing id');
 // update template with script + image
 const bad='<script>alert(1)</script><p>图片描述</p><img src="/api/public/preview/'+fileId+'" onerror="alert(2)"><a href="javascript:alert(3)">坏链接</a>';
 const t2={...trow.template,description:bad};
 const upd=await req('/api/template/update',{method:'POST',headers:H,body:JSON.stringify({id:trow.id,repoId:repo.id,name:'测试题',questionType:'Radio',mode:'exam',template:t2})});
 console.log('update template',upd.status,upd.text);
 const tl2=await req('/api/template/list?repoId='+repo.id+'&current=1&pageSize=20',{headers:H});
 const row2=(tl2.json?.data?.list||tl2.json?.data?.data||[]).find(x=>x.id===trow.id);
 console.log('sanitized desc',row2&&row2.template?.description);
 console.log('JSON',JSON.stringify({repoId:repo.id,repoName,templateId:trow.id,fileId}));
})();
