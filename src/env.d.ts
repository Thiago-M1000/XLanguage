/// <reference path="../.astro/types.d.ts" />
interface ImportMetaEnv {readonly PUBLIC_SUPABASE_URL:string;readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY:string;readonly PUBLIC_SITE_URL?:string;}
declare namespace App {interface Locals {
 supabase:import('@supabase/supabase-js').SupabaseClient;
 user:import('@supabase/supabase-js').User|null;
 perfil:import('./lib/estudo').Perfil;
 erroPerfil:string|null;
}}
