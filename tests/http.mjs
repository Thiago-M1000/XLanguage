import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

// Este serviço é exclusivamente local. Não lê credenciais nem acessa o Supabase real.
const user={id:'00000000-0000-4000-8000-000000000001',email:'study@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
const profile={user_id:user.id,nome:'Estudante',meta_diaria:20,timezone:'America/Sao_Paulo',idioma_ativo:'en-US',idiomas:['en-US','es-ES']};
const deck={id:'00000000-0000-4000-8000-000000000002',nome:'Trabalho',descricao:'Vocabulário profissional',idioma:'en-US',cartoes:1,pendentes:1,aprendidas:0};
const word={id:'00000000-0000-4000-8000-000000000003',idioma:'en-US',texto:'deadline',traducao:'prazo',classe:'expressão',exemplo:'The deadline is Monday.',etiquetas:['trabalho'],baralhos:[deck.id],due_at:new Date().toISOString(),repeticoes:0,intervalo_dias:0,facilidade:2.5,versao:0};
const mock=createServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk;
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Content-Type','application/json');
 let result;
 if(path==='/auth/v1/user')result=user;
 else if(path==='/auth/v1/token'){res.statusCode=400;result={error:'invalid_grant',error_description:'Invalid login credentials'};}
 else if(path==='/rest/v1/xl_perfis')result=req.method==='GET'?profile:null;
 else if(path==='/rest/v1/rpc/xl_painel')result={total:1,pendentes:1,aprendidas:0,hoje:0,sequencia:0,proxima:null,semana:Array.from({length:7},(_,i)=>({data:`2026-11-0${i+1}`,cartoes:0}))};
 else if(path==='/rest/v1/rpc/xl_baralhos_resumo')result=[deck];
 else if(path==='/rest/v1/rpc/xl_buscar')result={itens:[word],total:1};
 else if(path==='/rest/v1/rpc/xl_fila')result=[word];
 else if(path==='/rest/v1/rpc/xl_salvar_palavra')result=word.id;
 else if(path==='/rest/v1/rpc/xl_importar')result={inseridas:1,duplicadas:0};
 else if(path==='/rest/v1/rpc/xl_avaliar')result={due_at:new Date(Date.now()+86400000).toISOString(),intervalo_dias:1};
 else {res.statusCode=404;result={message:`Unexpected mock request: ${path}`};}
 res.end(JSON.stringify(result));
});
mock.listen(0,'127.0.0.1');await once(mock,'listening');
const supabaseUrl=`http://127.0.0.1:${mock.address().port}`;
// Reserva uma porta disponível para o servidor da aplicação.
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const origin=`http://127.0.0.1:${port}`;
const env={...process.env,PUBLIC_SUPABASE_URL:supabaseUrl,PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-public-key',PUBLIC_SITE_URL:origin,HOST:'127.0.0.1',PORT:String(port)};
const run=(command,args)=>new Promise((resolve,reject)=>{const p=spawn(command,args,{env,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));});
let app;
try{
 await run('npm',['run','build']);
 app=spawn(process.execPath,['dist/server/entry.mjs'],{env,stdio:'inherit'});
 let ready=false;
 for(let i=0;i<100;i++){try{await fetch(`${origin}/login`);ready=true;break;}catch{await delay(100);}}
 assert.ok(ready,'O servidor deve iniciar');
 const request=(path,options={})=>fetch(origin+path,{redirect:'manual',...options});
 let response=await request('/');assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/login');
 response=await request('/login');assert.equal(response.status,200);assert.match(await response.text(),/Entrar em sua conta/);
 response=await request('/api/xlanguage/palavra',{method:'POST',headers:{Origin:origin},body:'{}'});assert.equal(response.status,401);
 response=await request('/api/xlanguage/palavra',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'});assert.equal(response.status,403);
 response=await request('/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'email=a%40example.test&senha=wrong'});assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/login?erro=1');
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.test`;
 const session={access_token:jwt,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
 const cookie=`sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
 const authHeaders={Cookie:cookie,Origin:origin,'Content-Type':'application/json'};
 for(const [path,marker] of [['/','Visão geral'],['/dicionario','deadline'],['/baralhos','Trabalho'],['/revisao','Mostrar resposta'],['/configuracoes','Perfil e estudo'],['/redefinir-senha','senha']]){
  response=await request(path,{headers:authHeaders});assert.equal(response.status,200,path);assert.match(await response.text(),new RegExp(marker),path);assert.match(response.headers.get('cache-control'),/no-store/);
 }
 for(const [action,body,status] of [
  ['idioma',{idioma:'es-ES'},200],['idioma',{idioma:'invalid'},400],
  ['palavra',{idioma:'en-US',texto:'hello',traducao:'olá'},200],
  ['importar',{idioma:'en-US',entradas:'hello\tolá'},200],
  ['avaliar',{id:word.id,nota:3,versao:0,request_id:crypto.randomUUID()},200],
  ['avaliar',{id:word.id,nota:9,versao:0},400],['inexistente',{},404]
 ]){response=await request(`/api/xlanguage/${action}`,{method:'POST',headers:authHeaders,body:JSON.stringify(body)});assert.equal(response.status,status,action);}
 console.log('PASS: SSR de todas as telas, login inválido, sessão, cache privado, proteção de origem, APIs de idioma/palavra/importação/avaliação e validações.');
}finally{
 if(app&&app.exitCode===null){app.kill();await once(app,'exit');}
 await new Promise(resolve=>mock.close(resolve));
}
