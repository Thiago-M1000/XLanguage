import {getSecret} from 'astro:env/server';
export function iaDisponivel(userId:string){return Boolean(getSecret('OPENAI_API_KEY')?.trim()&&getSecret('OPENAI_ALLOWED_USER_IDS')?.split(',').map(s=>s.trim()).includes(userId));}
