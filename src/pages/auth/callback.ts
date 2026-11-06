import type {APIRoute} from 'astro';
export const GET:APIRoute=async({url,locals,redirect})=>{
 const code=url.searchParams.get('code');
 if(!code)return redirect('/recuperar-senha?erro=1');
 const {error}=await locals.supabase.auth.exchangeCodeForSession(code);
 return redirect(error?'/recuperar-senha?erro=1':'/redefinir-senha',303);
};
