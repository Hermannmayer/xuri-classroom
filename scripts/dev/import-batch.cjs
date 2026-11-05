const fs=require('fs'),path=require('path');
const JSEncrypt=require(path.join(__dirname,'../../client/node_modules/jsencrypt'));
const BASE='http://127.0.0.1';
const DIR=process.argv[2];
(async()=>{
  const sys=await (await fetch(BASE+'/api/system')).json();
  const enc=new JSEncrypt(); enc.setPublicKey(sys.data.publicKey);
  const res=await fetch(BASE+'/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:enc.encrypt('123456')})});
  const raw=res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  const cookie=(raw[0]||'').split(';')[0];

  const listRes=await (await fetch(BASE+'/api/repo/list?current=1&pageSize=200',{headers:{cookie}})).json();
  const repos=(listRes.data?.list||[]).map(r=>({id:String(r.id),name:r.name}));
  console.log('题库总数:', repos.length);

  for(const file of fs.readdirSync(DIR).filter(f=>f.toLowerCase().endsWith('.xlsx')).sort()){
    const base=path.basename(file,path.extname(file));
    const PROF={保育:'保育员',养老:'养老护理员',育婴:'育婴员'};
    const LEVEL={3:'三级',4:'四级',5:'五级'};
    const name=(PROF[base.slice(0,2)]||base.slice(0,2))+(LEVEL[base.slice(2)]||base.slice(2))+'复习题';
    const hit=repos.find(r=>r.name===name);
    if(!hit){ console.log('✗ 没找到题库:', name); continue; }
    const buf=fs.readFileSync(path.join(DIR,file));
    const form=new FormData();
    form.append('repoId', hit.id);
    form.append('file', new Blob([buf]), file);
    const imp=await fetch(BASE+'/api/repo/import',{method:'POST',headers:{cookie},body:form});
    const text=await imp.text();
    let ok=false; try{ ok=JSON.parse(text).code===200; }catch{}
    console.log((ok?'✓ ':'✗ ')+name+'  ← '+file+'  ('+hit.id+') '+(ok?'':' '+text.slice(0,160)));
  }
})();
