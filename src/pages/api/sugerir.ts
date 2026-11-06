import type {APIRoute} from 'astro';
import {getSecret} from 'astro:env/server';
import {iaDisponivel} from '../../lib/ia';
import {sugerirVocabulario,ErroSugestao} from '../../lib/ia-provider';
import {idioma,idiomaValido} from '../../lib/idiomas';
const pedidos=new Map<string,{inicio:number;n:number;ocupado:boolean}>();
export const POST:APIRoute=async({request,locals})=>{
 if(!locals.user)return Response.json({erro:'Entre novamente.'},{status:401});
 if(!iaDisponivel(locals.user.id))return Response.json({erro:'As sugestões de IA ainda não estão ativadas para esta conta.'},{status:503});
 const key=locals.user.id,now=Date.now();
 for(const [id,v] of pedidos)if(now-v.inicio>60000&&!v.ocupado)pedidos.delete(id);
 const uso=pedidos.get(key)??{inicio:now,n:0,ocupado:false};
 if(uso.ocupado||uso.n>=5)return Response.json({erro:'Aguarde um minuto antes de pedir outra sugestão.'},{status:429});
 uso.n++;uso.ocupado=true;pedidos.set(key,uso);
 try{
  const raw=await request.text();if(raw.length>3000)return Response.json({erro:'Use uma palavra ou frase curta.'},{status:413});
  let body;try{body=JSON.parse(raw)}catch{return Response.json({erro:'Dados inválidos.'},{status:400});}
  if(!body||typeof body.texto!=='string'||!body.texto.trim()||body.texto.length>500||!idiomaValido(body.idioma))return Response.json({erro:'Informe a palavra e o idioma.'},{status:400});
  const sugestao=await sugerirVocabulario(body.texto.trim(),idioma(body.idioma).nome,getSecret('OPENAI_API_KEY')!,getSecret('OPENAI_MODEL')?.trim()||'gpt-5-mini');
  return Response.json({sugestao});
 }catch(error){return Response.json({erro:error instanceof ErroSugestao?error.message:error instanceof Error&&error.name==='TimeoutError'?'A sugestão demorou demais. Tente novamente.':'Não foi possível acessar a IA agora. Tente novamente.'},{status:502});}
 finally{uso.ocupado=false;}
};
