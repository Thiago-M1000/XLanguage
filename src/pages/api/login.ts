import type {APIRoute} from 'astro';
import {codigoErroLogin,registrarFalhaLogin} from '../../lib/auth';
export const POST:APIRoute=async({request,locals,redirect})=>{
 const form=await request.formData();const email=String(form.get('email')??'').trim();const password=String(form.get('senha')??'');
 if(email.length>254||password.length>1024)return redirect('/login?erro=1',303);
 try {
  const {error}=await locals.supabase.auth.signInWithPassword({email,password});
  if(error){registrarFalhaLogin(error);return redirect(`/login?erro=${codigoErroLogin(error)}`,303);}
  return redirect('/',303);
 }catch(error){registrarFalhaLogin(error);return redirect(`/login?erro=${codigoErroLogin(error)}`,303);}
};
