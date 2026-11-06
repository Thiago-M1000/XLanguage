import type {SupabaseClient} from '@supabase/supabase-js';
export type Perfil = {user_id:string;nome:string;meta_diaria:number;timezone:string;idioma_ativo:string;idiomas:string[]};
export type Palavra = {id:string;idioma:string;texto:string;traducao:string;classe:string;exemplo:string;etiquetas:string[];baralhos?:string[];due_at:string;repeticoes:number;intervalo_dias:number;facilidade:number;versao:number};
export type Baralho = {id:string;nome:string;descricao:string;idioma:string;cartoes:number;pendentes:number;aprendidas:number};
export type Painel = {total:number;pendentes:number;aprendidas:number;hoje:number;sequencia:number;proxima:string|null;semana:{data:string;cartoes:number}[]};
export const perfilPadrao = (id:string):Perfil=>({user_id:id,nome:'',meta_diaria:20,timezone:'America/Sao_Paulo',idioma_ativo:'en-US',idiomas:['en-US','es-ES']});
export async function rpc<T>(db:SupabaseClient,nome:string,args:Record<string,unknown>):Promise<T> {
 const {data,error}=await db.rpc(nome,args); if(error)throw error; return data as T;
}
export function mensagemErro(error:unknown) {
 const e=error as {code?:string};
 return ['42P01','PGRST202','PGRST205','42883'].includes(e?.code??'') ? 'A atualização do banco ainda não foi aplicada. Siga o LEIA-ME do pacote.' : 'Não foi possível carregar os dados. Atualize a página para tentar novamente.';
}
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
