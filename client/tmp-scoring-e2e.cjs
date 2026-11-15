
const JSEncrypt=require('jsencrypt');const BASE='http://192.168.0.2:201';
async function req(p,o={}){const r=await fetch(BASE+p,o);const t=await r.text();let j;try{j=JSON.parse(t)}catch{};return{status:r.status,headers:r.headers,text:t,json:j}}
function rsa(pub,t){const pem='-----BEGIN PUBLIC KEY-----\n'+pub.match(/.{1,64}/g).join('\n')+'\n-----END PUBLIC KEY-----';const e=new JSEncrypt();e.setPublicKey(pem);return e.encrypt(t)}
(async()=>{for(let i=0;i<30;i++){const s=await req('/api/system');if(s.status===200)break;await new Promise(r=>setTimeout(r,1000));}
const s=await req('/api/system');const a=await req('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:rsa(s.json.data.publicKey,'123456')})});const AH={'Content-Type':'application/json',Cookie:(a.headers.get('set-cookie')||'').split(';')[0]};
const make=(name,scoring)=>({name,mode:'survey',setting:{status:1,examSetting:{scoringEnabled:scoring},answerSetting:{loginRequired:false}},survey:{id:'s',title:name,type:'Survey',attribute:{},children:[{id:'q1',title:'单选',type:'Radio',attribute:{examScore:10,examCorrectAnswer:'o1'},children:[{id:'o1',title:'A',type:'Option',attribute:{examCorrectAnswer:'1'}},{id:'o2',title:'B',type:'Option',attribute:{}}]}]}});
for(const [name,scoring] of [['计分问卷-'+Date.now(),true],['不计分问卷-'+Date.now(),false]]){
 const cp=await req('/api/project/create',{method:'POST',headers:AH,body:JSON.stringify(make(name,scoring))});const pid=cp.json?.data?.id;console.log(name,pid,cp.status);
 const ans=await req('/api/public/saveAnswer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid,survey:{id:'s',title:name,type:'Survey',attribute:{},children:[{id:'q1',title:'单选',type:'Radio',attribute:{examScore:10,examCorrectAnswer:'o1'},children:[{id:'o1',title:'A',type:'Option',attribute:{examCorrectAnswer:'1'}},{id:'o2',title:'B',type:'Option',attribute:{}}]}]},answer:{q1:{o1:true}},tempSave:1})});console.log('score response',ans.status,ans.json?.data?.examScore);
 await req('/api/project/delete',{method:'POST',headers:AH,body:JSON.stringify({id:pid})});
}
})();
