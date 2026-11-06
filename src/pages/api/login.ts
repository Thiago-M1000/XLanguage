import type {APIRoute} from 'astro';
export const POST:APIRoute=async({request,locals,redirect})=>{
 const form=await request.formData();const email=String(form.get('email')??'').trim();const password=String(form.get('senha')??'');
 if(email.length>254||password.length>1024)return redirect('/login?erro=1',303);
 const {error}=await locals.supabase.auth.signInWithPassword({email,password});
 return redirect(error?'/login?erro=1':'/',303);
};
