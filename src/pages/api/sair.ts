import type {APIRoute} from 'astro';
export const POST:APIRoute=async({locals,redirect})=>{
 const {error}=await locals.supabase.auth.signOut({scope:'local'});
 if(error)return new Response('Não foi possível sair. Tente novamente.',{status:500});
 return redirect('/login',303);
};
