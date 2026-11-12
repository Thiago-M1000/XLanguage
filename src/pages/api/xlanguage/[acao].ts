import type {APIRoute} from 'astro';
import {idiomaValido} from '../../../lib/idiomas';
import {lerEntradas} from '../../../lib/importar';
import {uuid,rpc} from '../../../lib/estudo';
const texto=(v:unknown,max:number,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('Confira os campos do formulário.');return v.normalize('NFC').trim()};
const id=(v:unknown)=>{if(!uuid(v))throw new Error('Identificador inválido.');return v};
export const POST:APIRoute=async({params,request,locals})=>{
 if(!locals.user)return Response.json({erro:'Entre novamente.'},{status:401});
 const db=locals.supabase;const userId=locals.user.id;
 try{
  const raw=await request.text();if(raw.length>500000)return Response.json({erro:'Envie um lote menor.'},{status:413});
  let b:Record<string,unknown>;try{b=JSON.parse(raw)}catch{throw new Error('Dados inválidos.')}
  if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('Dados inválidos.');
  const action=params.acao;
  const lang=()=>{if(!idiomaValido(b.idioma))throw new Error('Escolha um idioma válido.');return b.idioma};
  const check=async(q:PromiseLike<{data:unknown;error:unknown}>)=>{const r=await q;if(r.error)throw r.error;return r.data};
  if(action==='idioma'){
   const selected=lang();const profile=await check(db.from('xl_perfis').select('idiomas').eq('user_id',userId).single()) as {idiomas:string[]};
   if(!profile.idiomas.includes(selected))throw new Error('Adicione esse idioma nas configurações.');
   await check(db.from('xl_perfis').update({idioma_ativo:selected}).eq('user_id',userId));return Response.json({ok:true});
  }
  if(action==='palavra'){
   const decks=Array.isArray(b.baralhos)?b.baralhos.map(id):[];if(decks.length>100)throw new Error('Selecione até 100 baralhos.');
   const tags=texto(b.etiquetas??'',1000).split(',').map(t=>t.trim()).filter(Boolean);if(tags.length>20||tags.some(t=>t.length>50))throw new Error('Use até 20 etiquetas de até 50 caracteres.');
   const saved=await rpc(db,'xl_salvar_palavra',{p_id:b.id?id(b.id):null,p_idioma:lang(),p_texto:texto(b.texto,500,true),p_traducao:texto(b.traducao,1000,true),p_classe:texto(b.classe??'expressão',50),p_exemplo:texto(b.exemplo??'',2000),p_etiquetas:tags,p_baralhos:decks});return Response.json({ok:true,id:saved});
  }
  if(action==='excluir-palavra'){
   const removed=await rpc(db,'xl_excluir_palavra',{p_id:id(b.id)});if(!removed)return Response.json({erro:'Entrada não encontrada.'},{status:404});return Response.json({ok:true});
  }
  if(action==='importar'){
   const entradas = lerEntradas(b.entradas);
   const classificada = entradas.some(entrada => entrada.classe !== undefined);
   try {
    const result = await rpc(db, classificada ? 'xl_importar_classificado' : 'xl_importar', {
     p_idioma: lang(),
     p_entradas: entradas,
     p_baralho: b.baralho ? id(b.baralho) : null,
    });
    return Response.json({ok: true, ...result as object});
   } catch (error) {
    const {code} = error as {code?: string};
    if (classificada && (code === 'PGRST202' || code === '42883')) {
     return Response.json({erro: 'A importação com tipo de palavra precisa da atualização 003 no Supabase.'}, {status: 503});
    }
    throw error;
   }
  }
  if(action==='baralho'){
   const values={nome:texto(b.nome,100,true),descricao:texto(b.descricao??'',500),idioma:lang()};
   const q=b.id?db.from('xl_baralhos').update(values).eq('id',id(b.id)).eq('user_id',userId):db.from('xl_baralhos').insert({...values,user_id:userId});
   const saved=await check(q.select('id').single());return Response.json({ok:true,...saved as object});
  }
  if(action==='excluir-baralho'){
   await check(db.from('xl_baralhos').delete().eq('id',id(b.id)).eq('user_id',userId).select('id').single());return Response.json({ok:true});
  }
  if(action==='avaliar'){
   const grade=Number(b.nota),version=Number(b.versao);if(![1,2,3,4].includes(grade)||!Number.isSafeInteger(version)||version<0)throw new Error('Avaliação inválida.');
   const result=await rpc(db,'xl_avaliar',{p_palavra:id(b.id),p_nota:grade,p_versao:version,p_request:id(b.request_id)});return Response.json({ok:true,...result as object});
  }
  if(action==='preferencias'){
   const idiomas=Array.isArray(b.idiomas)?[...new Set(b.idiomas)]:[];if(!idiomas.length||!idiomas.every(idiomaValido))throw new Error('Selecione pelo menos um idioma.');
   const goal=Number(b.meta_diaria);if(!Number.isInteger(goal)||goal<1||goal>1000)throw new Error('A meta deve ficar entre 1 e 1000 cartões.');
   const tz=texto(b.timezone,100,true);try{new Intl.DateTimeFormat('pt-BR',{timeZone:tz}).format()}catch{throw new Error('Fuso horário inválido.')}
   const {data:old}=await db.from('xl_perfis').select('idioma_ativo').eq('user_id',userId).single();
   await check(db.from('xl_perfis').upsert({user_id:userId,nome:texto(b.nome??'',80),meta_diaria:goal,timezone:tz,idiomas,idioma_ativo:old&&idiomas.includes(old.idioma_ativo)?old.idioma_ativo:idiomas[0]}));return Response.json({ok:true});
  }
  return Response.json({erro:'Operação não encontrada.'},{status:404});
 }catch(error){
  const e=error as {code?:string;message?:string};
  if(e.code==='23505')return Response.json({erro:'Já existe uma entrada com esse nome neste idioma.'},{status:409});
  if(e.message==='CONFLITO'||e.message==='AINDA_NAO_VENCEU')return Response.json({erro:'Este cartão já foi alterado ou revisado. Atualize a sessão.',conflito:true},{status:409});
  const known:Record<string,string>={BARALHO_INVALIDO:'O baralho deve ser seu e pertencer ao mesmo idioma.',NAO_ENCONTRADO:'Registro não encontrado.',DADOS_INVALIDOS:'Confira as entradas antes de salvar.',REQUEST_REUTILIZADO:'Requisição já utilizada.'};
  if(e.message&&known[e.message])return Response.json({erro:known[e.message]},{status:400});
  if(error instanceof Error&&!e.code)return Response.json({erro:error.message},{status:400});
  console.error('XLanguage API:',e.code??'erro');
  return Response.json({erro:'Não foi possível salvar. Confira a atualização do banco e tente novamente.'},{status:500});
 }
};
