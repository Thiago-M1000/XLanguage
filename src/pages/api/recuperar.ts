import type {APIRoute} from 'astro';
import {getSecret} from 'astro:env/server';
export const POST:APIRoute=async({request,locals,url,redirect})=>{
 const form=await request.formData();const email=String(form.get('email')??'').trim();
 if(!email||email.length>254)return redirect('/recuperar-senha?erro=1',303);
 const siteUrl=getSecret('PUBLIC_SITE_URL')??import.meta.env.PUBLIC_SITE_URL;
 const origin=siteUrl?new URL(siteUrl).origin:url.origin;
 const {error}=await locals.supabase.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/callback`});
 if(error)console.error('Recuperação de senha:',error.code??'falha');
 // A resposta é a mesma para emails cadastrados e não cadastrados.
 return redirect('/recuperar-senha?enviado=1',303);
};
