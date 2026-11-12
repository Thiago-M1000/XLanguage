export async function enviar(acao:string,body:unknown){
 const response=await fetch(`/api/xlanguage/${acao}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({erro:'Resposta inválida. Tente novamente.'}));
 if(!response.ok)throw Object.assign(new Error(data.erro??'Não foi possível salvar.'),{status:response.status,conflito:data.conflito});
 return data;
}
export function iniciarUI(){
 document.querySelectorAll<HTMLElement>('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  const dialog=document.getElementById(button.dataset.open!) as HTMLDialogElement;dialog?.showModal();
 }));
 document.querySelectorAll<HTMLElement>('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog')?.close()));
 document.querySelectorAll<HTMLFormElement>('form[data-api]').forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();const status=form.querySelector<HTMLElement>('[data-feedback]')!;
  const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const original=submit.textContent;submit.disabled=true;submit.textContent='Salvando…';status.textContent='';
  try{
   const fields=new FormData(form);const body:Record<string,unknown>=Object.fromEntries(fields);
   if(form.dataset.api==='palavra')body.baralhos=fields.getAll('baralhos').filter(Boolean);
   if(form.dataset.api==='preferencias')body.idiomas=fields.getAll('idiomas');
   const result=await enviar(form.dataset.api!,body);
   if(form.dataset.api==='importar'){
    status.textContent=`${result.inseridas} adicionadas; ${result.duplicadas} duplicadas ignoradas. Atualizando…`;
    status.classList.remove('xl-error');
    setTimeout(()=>location.reload(),1200);
   } else if (form.hasAttribute('data-quick-word')) {
    const url = new URL(location.href);
    url.searchParams.set('rapido', '1');
    url.searchParams.set('salva', '1');
    url.hash = 'cadastro-rapido';
    if (url.search === location.search) location.reload();
    else location.assign(url.pathname + url.search + url.hash);
   } else location.reload();
  }catch(error){status.textContent=error instanceof Error?error.message:'Não foi possível salvar.';}
  finally{submit.disabled=false;submit.textContent=original;}
 }));
 const confirmation=document.getElementById('confirmar-exclusao') as HTMLDialogElement|null;
 document.querySelectorAll<HTMLButtonElement>('[data-delete-action]').forEach(button=>button.addEventListener('click',()=>{
  if(!confirmation)return;
  confirmation.dataset.action=button.dataset.deleteAction;confirmation.dataset.id=button.dataset.id;
  confirmation.querySelector('[data-delete-name]')!.textContent=button.dataset.name??'';
  confirmation.querySelector('[data-delete-description]')!.textContent=button.dataset.deleteAction==='excluir-baralho'?'O baralho será excluído. Suas palavras continuam no dicionário.':'A palavra e seus vínculos com baralhos serão excluídos. O histórico de estudo será preservado.';
  confirmation.querySelector('[data-feedback]')!.textContent='';confirmation.showModal();
 }));
 confirmation?.querySelector<HTMLButtonElement>('[data-confirm-delete]')?.addEventListener('click',async event=>{
  const button=event.currentTarget as HTMLButtonElement;button.disabled=true;
  try{await enviar(confirmation.dataset.action!,{id:confirmation.dataset.id});location.reload()}
  catch(error){confirmation.querySelector('[data-feedback]')!.textContent=(error as Error).message;button.disabled=false;}
 });
}
