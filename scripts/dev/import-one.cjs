const fs=require('fs'),path=require('path');
const JSEncrypt=require(path.join(__dirname,'../../client/node_modules/jsencrypt'));
const BASE='http://127.0.0.1';
(async()=>{
  const sys=await (await fetch(BASE+'/api/system')).json();
  const enc=new JSEncrypt(); enc.setPublicKey(sys.data.publicKey);
  const res=await fetch(BASE+'/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:enc.encrypt('123456')})});
  const raw=res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  const cookie=(raw[0]||'').split(';')[0];
  const name='育婴员五级复习题';
  let list=await (await fetch(BASE+'/api/repo/list?current=1&pageSize=200',{headers:{cookie}})).json();
  let hit=(list.data?.list||[]).find(r=>r.name===name);
  if(!hit){
    await fetch(BASE+'/api/repo/create',{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify({name,category:'职业技能等级认定',mode:'exam',description:name})});
    list=await (await fetch(BASE+'/api/repo/list?current=1&pageSize=200',{headers:{cookie}})).json();
    hit=(list.data?.list||[]).find(r=>r.name===name);
  }
  if(!hit){ console.log('建题库失败'); return; }
  const buf=fs.readFileSync(process.argv[2]);
  const form=new FormData();
  form.append('repoId', String(hit.id));
  form.append('file', new Blob([buf]), '育婴5.xlsx');
  const imp=await fetch(BASE+'/api/repo/import',{method:'POST',headers:{cookie},body:form});
  console.log('导入结果:', (await imp.text()).slice(0,200));
})();
