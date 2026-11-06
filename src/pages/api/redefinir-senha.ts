import type {APIRoute} from 'astro';
export const POST:APIRoute=async({request,locals,redirect})=>{
 const form=await request.formData();const password=String(form.get('senha')??'');const confirm=String(form.get('confirmar')??'');
 if(password.length<8||password.length>1024||password!==confirm)return redirect('/redefinir-senha?erro=1',303);
 const {error}=await locals.supabase.auth.updateUser({password});
 return redirect(error?'/redefinir-senha?erro=1':'/configuracoes?senha=1',303);
};
