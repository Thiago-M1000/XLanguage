export type ModoEstudo='cartoes'|'digitar'|'lacunas';
export const modoValido=(v:unknown):v is ModoEstudo=>['cartoes','digitar','lacunas'].includes(String(v));
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function criarLacuna(texto:string,exemplo:string,idioma='en-US'):string|null{
 const termo=texto.normalize('NFC').trim();const frase=exemplo.normalize('NFC').trim();
 if(!termo||!frase)return null;
 const cjk=/^(ja|ko|zh)/.test(idioma);
 const literal=escape(termo).replace(/\s+/g,'\\s+');
 const pattern=new RegExp(cjk?literal:`(^|[^\\p{L}\\p{N}])(${literal})(?=$|[^\\p{L}\\p{N}])`,'giu');
 let found=false;
 const result=frase.replace(pattern,(...args)=>{found=true;return cjk?'_____':`${args[1]}_____`;});
 return found?result:null;
}
export function normalizarResposta(s:string){return s.normalize('NFC').trim().replace(/\s+/gu,' ').replace(/[.!?。！？]+$/u,'').toLocaleLowerCase();}
export function conferirResposta(resposta:string,esperada:string):'certa'|'acentos'|'diferente'{
 const a=normalizarResposta(resposta),b=normalizarResposta(esperada);
 if(a===b&&a)return 'certa';
 const semAcentos=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'');
 return a&&semAcentos(a)===semAcentos(b)?'acentos':'diferente';
}
