// Dados descartáveis. Este simulador não acessa nenhum serviço externo.
export const user={id:'00000000-0000-4000-8000-000000000001',email:'study@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
export const profile={user_id:user.id,nome:'Estudante',meta_diaria:20,timezone:'America/Sao_Paulo',idioma_ativo:'en-US',idiomas:['en-US','es-ES']};
export const deck={id:'00000000-0000-4000-8000-000000000002',nome:'Trabalho',descricao:'Vocabulário profissional',idioma:'en-US',cartoes:1,pendentes:1,aprendidas:0};
export const word={id:'00000000-0000-4000-8000-000000000003',idioma:'en-US',texto:'deadline',traducao:'prazo',classe:'expressão',exemplo:'The deadline is Monday.',etiquetas:['trabalho'],baralhos:[deck.id],due_at:new Date().toISOString(),repeticoes:0,intervalo_dias:0,facilidade:2.5,versao:0};
const token=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.test`;
export const session={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
export const requests=[];
export const unexpected=[];
const words=[structuredClone(word)],decks=[structuredClone(deck)],reviewed=new Set();
export async function mockSupabase(req,res){
 let raw='';for await(const chunk of req)raw+=chunk;
 const body=raw?JSON.parse(raw):{};
 const url=new URL(req.url,'http://localhost'),path=url.pathname;
 requests.push({path,method:req.method,body,redirectTo:url.searchParams.get('redirect_to')});
 res.setHeader('Content-Type','application/json');
 res.setHeader('X-Supabase-Api-Version','2024-01-01');
 let result;
 if(path==='/auth/v1/user')result=user;
 else if(path==='/auth/v1/token'){
  if(body.email===user.email&&body.password==='correct-password')result=session;
  else if(body.email==='key@example.test'){res.statusCode=401;result={message:'Invalid API key'};}
  else if(body.email==='confirm@example.test'){res.statusCode=400;result={code:'email_not_confirmed',message:'Email not confirmed'};}
  else if(body.email==='limit@example.test'){res.statusCode=429;result={code:'over_request_rate_limit',message:'Too many requests'};}
  else{res.statusCode=400;result={code:'invalid_credentials',message:'Invalid login credentials'};}
 }
 else if(path==='/auth/v1/recover')result={};
 else if(path==='/auth/v1/logout'){res.statusCode=204;res.end();return;}
 else if(path==='/rest/v1/xl_perfis'){
  if(req.method!=='GET')Object.assign(profile,body);
  result=req.method==='GET'?profile:null;
 }
 else if(path==='/rest/v1/xl_baralhos'){
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  if(req.method==='POST'){const d={...body,id:crypto.randomUUID(),cartoes:0,pendentes:0,aprendidas:0};decks.push(d);result={id:d.id};}
  else if(req.method==='PATCH'){Object.assign(decks.find(d=>d.id===id),body);result={id};}
  else if(req.method==='DELETE'){decks.splice(decks.findIndex(d=>d.id===id),1);result={id};}
 }
 else if(path==='/rest/v1/rpc/xl_painel')result={total:words.length,pendentes:words.filter(w=>!reviewed.has(w.id)).length,aprendidas:0,hoje:reviewed.size,sequencia:0,proxima:null,semana:Array.from({length:7},(_,i)=>({data:`2026-11-0${i+1}`,cartoes:0}))};
 else if(path==='/rest/v1/rpc/xl_baralhos_resumo')result=decks.filter(d=>d.idioma===body.p_idioma);
 else if(path==='/rest/v1/rpc/xl_buscar'){
  const itens=words.filter(w=>w.idioma===body.p_idioma&&(!body.p_busca||`${w.texto} ${w.traducao}`.includes(body.p_busca))&&(!body.p_baralho||w.baralhos.includes(body.p_baralho)));
  result={itens,total:itens.length};
 }
 else if(path==='/rest/v1/rpc/xl_fila')result=words.filter(w=>w.idioma===body.p_idioma&&!reviewed.has(w.id));
 else if(path==='/rest/v1/rpc/xl_salvar_palavra'){
  const saved={...word,id:body.p_id??crypto.randomUUID(),idioma:body.p_idioma,texto:body.p_texto,traducao:body.p_traducao,classe:body.p_classe,exemplo:body.p_exemplo,etiquetas:body.p_etiquetas,baralhos:body.p_baralhos};
  const index=words.findIndex(w=>w.id===saved.id);if(index<0)words.push(saved);else words[index]=saved;result=saved.id;
 }
 else if(path==='/rest/v1/rpc/xl_excluir_palavra'){const index=words.findIndex(w=>w.id===body.p_id);if(index>=0)words.splice(index,1);result=index>=0;}
 else if(path==='/rest/v1/rpc/xl_importar'){
  let inseridas=0,duplicadas=0;
  for(const row of body.p_entradas){if(words.some(w=>w.texto===row.texto&&w.idioma===body.p_idioma)){duplicadas++;continue;}words.push({...word,...row,id:crypto.randomUUID(),idioma:body.p_idioma,baralhos:body.p_baralho?[body.p_baralho]:[]});inseridas++;}
  result={inseridas,duplicadas};
 }
 else if(path==='/rest/v1/rpc/xl_avaliar'){reviewed.add(body.p_palavra);result={due_at:new Date(Date.now()+86400000).toISOString(),intervalo_dias:1};}
 else{unexpected.push(`${req.method} ${path}`);res.statusCode=404;result={message:'Unexpected mock request'};}
 res.end(JSON.stringify(result));
}
