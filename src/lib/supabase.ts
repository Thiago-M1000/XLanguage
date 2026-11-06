import {createServerClient,parseCookieHeader} from '@supabase/ssr';
import type {AstroCookies} from 'astro';
import {getSecret} from 'astro:env/server';
export function criarSupabase(request:Request,cookies:AstroCookies){
 const url=(getSecret('PUBLIC_SUPABASE_URL')??import.meta.env.PUBLIC_SUPABASE_URL)?.trim();
 const key=(getSecret('PUBLIC_SUPABASE_PUBLISHABLE_KEY')??import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();
 if(!url||!key)throw new Error('Configure a URL e a chave pública do Supabase no ambiente do XLanguage.');
 return createServerClient(url,key,{
  cookies:{getAll(){return parseCookieHeader(request.headers.get('Cookie')??'')},setAll(values){values.forEach(({name,value,options})=>cookies.set(name,value,options))}}
 });
}
