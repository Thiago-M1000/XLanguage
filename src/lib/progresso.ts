import type {SupabaseClient} from '@supabase/supabase-js';
import type {Palavra} from './estudo';
export type PalavraPraticada=Palavra&{tentativas:number;acertos:number;ultima_revisao:string|null};
export type RegistroRevisao={id:string;palavra_ref:string;nota:number;criado_em:string};
export function classificarDificuldades(palavras:PalavraPraticada[]){
 return palavras.map(p=>({...p,erros:Math.max(0,p.tentativas-p.acertos),taxaErro:p.tentativas?Math.max(0,p.tentativas-p.acertos)/p.tentativas:0}))
 .filter(p=>p.erros>0).sort((a,b)=>b.taxaErro-a.taxaErro||b.erros-a.erros||a.facilidade-b.facilidade||a.id.localeCompare(b.id));
}
// Limite explícito para evitar leituras sem fim; a interface avisa se houver corte.
export async function carregarDificuldades(db:SupabaseClient,userId:string,language:string){
 const rows:PalavraPraticada[]=[];let incompleto=false;
 for(let start=0;start<10000;start+=1000){
  const {data,error}=await db.from('xl_palavras').select('*').eq('user_id',userId).eq('idioma',language).gt('tentativas',0).order('id').range(start,start+999);
  if(error)throw error;rows.push(...(data??[]));if((data??[]).length<1000)break;if(start===9000)incompleto=true;
 }
 return {palavras:classificarDificuldades(rows),incompleto};
}
export function dataLocal(agora:Date,timezone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(agora);
 return ['year','month','day'].map(t=>parts.find(p=>p.type===t)!.value).join('-');
}
export function deslocarDia(dia:string,n:number){const d=new Date(dia+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function resumirPeriodo(registros:RegistroRevisao[],hoje:string,timezone:string,dias:number){
 const inicio=deslocarDia(hoje,1-dias),anterior=deslocarDia(inicio,-dias);
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
 const porDia=new Map<string,{palavras:Set<string>;avaliacoes:number;acertos:number}>();
 for(const r of registros){
  const parts=formatter.formatToParts(new Date(r.criado_em));const dia=['year','month','day'].map(t=>parts.find(p=>p.type===t)!.value).join('-');
  if(dia<anterior||dia>hoje)continue;
  const grupo=porDia.get(dia)??{palavras:new Set<string>(),avaliacoes:0,acertos:0};
  grupo.palavras.add(r.palavra_ref);grupo.avaliacoes++;if(r.nota>=3)grupo.acertos++;porDia.set(dia,grupo);
 }
 const agrupar=(de:string)=>{
  const palavras=new Set<string>();let avaliacoes=0,acertos=0,diasAtivos=0;
  const historico=Array.from({length:dias},(_,i)=>{
   const data=deslocarDia(de,i),grupo=porDia.get(data);
   if(grupo){grupo.palavras.forEach(p=>palavras.add(p));avaliacoes+=grupo.avaliacoes;acertos+=grupo.acertos;diasAtivos++;}
   return {data,palavras:grupo?.palavras.size??0,avaliacoes:grupo?.avaliacoes??0};
  });
  return {palavras:palavras.size,avaliacoes,acertos,diasAtivos,historico};
 };
 return {inicio,fim:hoje,atual:agrupar(inicio),anterior:agrupar(anterior)};
}
export async function carregarProgresso(db:SupabaseClient,userId:string,language:string,timezone:string,dias:number,agora=new Date()){
 const hoje=dataLocal(agora,timezone);const from=new Date(deslocarDia(hoje,1-dias*2)+'T00:00:00Z');from.setUTCHours(from.getUTCHours()-14);
 const rows:RegistroRevisao[]=[];let incompleto=false;
 for(let start=0;start<10000;start+=1000){
  const {data,error}=await db.from('xl_revisoes').select('id,palavra_ref,nota,criado_em').eq('user_id',userId).eq('idioma',language).gte('criado_em',from.toISOString()).order('criado_em').order('id').range(start,start+999);
  if(error)throw error;rows.push(...(data??[]));if((data??[]).length<1000)break;if(start===9000)incompleto=true;
 }
 return {...resumirPeriodo(rows,hoje,timezone,dias),incompleto};
}
