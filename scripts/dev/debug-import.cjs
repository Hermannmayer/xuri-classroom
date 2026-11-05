const fs=require('fs'),path=require('path');
const JSEncrypt=require(path.join(__dirname,'../../client/node_modules/jsencrypt'));
const BASE='http://127.0.0.1';
(async()=>{
  const sys=await (await fetch(BASE+'/api/system')).json();
  const enc=new JSEncrypt(); enc.setPublicKey(sys.data.publicKey);
  const res=await fetch(BASE+'/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:enc.encrypt('123456')})});
  const j=await res.json();
  const raw=res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  const cookie=(raw[0]||'').split(';')[0];
  console.log('login:', j.code, 'cookie:', cookie.slice(0,30));
  const list=await (await fetch(BASE+'/api/repo/list?current=1&pageSize=5',{headers:{cookie}})).json();
  console.log('list code:', list.code, 'rows:', list.data?.list?.length, 'first:', JSON.stringify(list.data?.list?.[0]?.id), list.data?.list?.[0]?.name);
  const id=list.data?.list?.[0]?.id;
  if(!id){console.log('no repo id');return;}
  const buf=fs.readFileSync(process.argv[2]);
  const form=new FormData();
  form.append('repoId', String(id));
  form.append('file', new Blob([buf]), 'test.xlsx');
  const imp=await fetch(BASE+'/api/repo/import',{method:'POST',headers:{cookie},body:form});
  console.log('import status:', imp.status, 'body:', (await imp.text()).slice(0,300));
})();
