import {defineMiddleware} from 'astro:middleware';
import {criarSupabase} from './lib/supabase';
import {perfilPadrao,mensagemErro} from './lib/estudo';
export const onRequest=defineMiddleware(async(context,next)=>{
 const path=context.url.pathname.replace(/\/$/,'')||'/';
 if(!['GET','HEAD','OPTIONS'].includes(context.request.method)){
  const origin=context.request.headers.get('Origin');
  if(origin!==context.url.origin)return new Response('Origem inválida.',{status:403});
 }
 const db=criarSupabase(context.request,context.cookies);context.locals.supabase=db;
 const {data}=await db.auth.getUser();context.locals.user=data.user;
 const publica=['/login','/recuperar-senha','/api/login','/api/recuperar','/auth/callback'].includes(path);
 if(!data.user&&!publica){
  if(path.startsWith('/api/'))return Response.json({erro:'Sua sessão expirou. Entre novamente.'},{status:401});
  return context.redirect('/login');
 }
 if(data.user&&path==='/login')return context.redirect('/');
 context.locals.erroPerfil=null;
 if(data.user){
  context.locals.perfil=perfilPadrao(data.user.id);
  if(!path.startsWith('/auth/')&&!path.startsWith('/api/')){
   const {error:insertError}=await db.from('xl_perfis').upsert({user_id:data.user.id},{onConflict:'user_id',ignoreDuplicates:true});
   const {data:profile,error}=await db.from('xl_perfis').select('*').eq('user_id',data.user.id).single();
   if(profile)context.locals.perfil=profile;
   if(insertError||error)context.locals.erroPerfil=mensagemErro(insertError||error);
  }
 }
 const response=await next();response.headers.set('Cache-Control','private, no-store');return response;
});
