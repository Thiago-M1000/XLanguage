import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

import {mockSupabase,user,word,requests,unexpected} from './fixtures.mjs';
const mock=createServer(mockSupabase);
mock.listen(0,'127.0.0.1');await once(mock,'listening');
const supabaseUrl=`http://127.0.0.1:${mock.address().port}`;
// Reserva uma porta disponível para o servidor da aplicação.
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const origin=`http://127.0.0.1:${port}`;
const env={...process.env,ASTRO_TELEMETRY_DISABLED:'1',PUBLIC_SUPABASE_URL:supabaseUrl,PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-public-key',PUBLIC_SITE_URL:origin,HOST:'127.0.0.1',PORT:String(port)};
const run=(command,args,runEnv=env)=>new Promise((resolve,reject)=>{const p=spawn(command,args,{env:runEnv,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));});
let app;
try{
 // Confirma que a configuração pode ser adicionada só no runtime, depois do build.
 await run(process.execPath,['node_modules/astro/bin/astro.mjs','build'],{...env,PUBLIC_SUPABASE_URL:'',PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',PUBLIC_SITE_URL:''});
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
 // Os cookies precisam vir do formulário real de login, não de uma sessão injetada.
 for(const [email,code] of [['key@example.test','configuracao'],['confirm@example.test','confirmar'],['limit@example.test','limite']]){
  response=await request('/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email,senha:'wrong'})});
  assert.equal(response.status,303);assert.equal(response.headers.get('location'),`/login?erro=${code}`);
 }
 response=await request('/login?erro=configuracao');assert.match(await response.text(),/configuração de acesso/);
 response=await request('/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:user.email,senha:'correct-password'})});
 assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/');
 const cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 assert.match(cookie,/auth-token/,'O login deve gravar a sessão em cookies');
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
 response=await request('/api/redefinir-senha',{method:'POST',headers:{...authHeaders,'Content-Type':'application/x-www-form-urlencoded'},body:'senha=short&confirmar=short'});assert.equal(response.headers.get('location'),'/redefinir-senha?erro=1');
 response=await request('/api/redefinir-senha',{method:'POST',headers:{...authHeaders,'Content-Type':'application/x-www-form-urlencoded'},body:'senha=updated-password&confirmar=updated-password'});assert.equal(response.headers.get('location'),'/configuracoes?senha=1');
 response=await request('/api/recuperar',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:user.email})});assert.equal(response.headers.get('location'),'/recuperar-senha?enviado=1');
 assert.equal(requests.find(r=>r.path==='/auth/v1/recover').redirectTo,`${origin}/auth/callback`);
 response=await request('/auth/callback');assert.equal(response.headers.get('location'),'/recuperar-senha?erro=1');
 response=await request('/api/sair',{method:'POST',headers:authHeaders});assert.equal(response.headers.get('location'),'/login');assert.match(response.headers.getSetCookie().join(';'),/Max-Age=0/i);
 if(process.argv.includes('--browser'))await (await import('./browser.mjs')).testBrowser(origin);
 assert.deepEqual(unexpected,[],'Todas as chamadas devem ser atendidas pelo simulador local');
 console.log('PASS: SSR de todas as telas, login inválido, sessão, cache privado, proteção de origem, APIs de idioma/palavra/importação/avaliação e validações.');
}finally{
 if(app&&app.exitCode===null){app.kill();await once(app,'exit');}
 await new Promise(resolve=>mock.close(resolve));
}
