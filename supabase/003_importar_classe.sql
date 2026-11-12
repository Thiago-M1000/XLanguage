-- Execute depois de 001_xlanguage.sql. A migração 002 é opcional.
begin;

create or replace function public.xl_importar_classificado(p_idioma text,p_entradas jsonb,p_baralho uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; v uuid; classe_entrada text; n int:=0; puladas int:=0; begin
 if auth.uid() is null then raise exception 'SEM_SESSAO'; end if;
 if p_idioma not in ('en-US','es-ES','fr-FR','de-DE','it-IT','pt-BR','ja-JP','ko-KR','zh-CN') then raise exception 'IDIOMA_INVALIDO'; end if;
 if jsonb_typeof(p_entradas)<>'array' or jsonb_array_length(p_entradas) not between 1 and 500 then raise exception 'DADOS_INVALIDOS'; end if;
 if p_baralho is not null and not exists(select 1 from public.xl_baralhos where id=p_baralho and user_id=auth.uid() and idioma=p_idioma) then raise exception 'BARALHO_INVALIDO'; end if;
 for item in select value from jsonb_array_elements(p_entradas) loop
  if coalesce(length(btrim(item->>'texto')),0) not between 1 and 500 or coalesce(length(btrim(item->>'traducao')),0) not between 1 and 1000 or coalesce(length(item->>'exemplo'),0)>2000 then raise exception 'DADOS_INVALIDOS'; end if;
  classe_entrada := 'expressão';
  if item ? 'classe' then
   classe_entrada := item->>'classe';
   if classe_entrada is null or classe_entrada not in ('expressão','verbo','substantivo','adjetivo','advérbio','frase') then
    raise exception 'DADOS_INVALIDOS';
   end if;
  end if;
  v:=null;
  insert into public.xl_palavras(idioma,texto,traducao,exemplo,classe) values(p_idioma,btrim(item->>'texto'),btrim(item->>'traducao'),coalesce(item->>'exemplo',''),classe_entrada) on conflict do nothing returning id into v;
  if v is null then
   puladas:=puladas+1;
   select id into v from public.xl_palavras where user_id=auth.uid() and idioma=p_idioma and lower(regexp_replace(btrim(texto),'\s+',' ','g'))=lower(regexp_replace(btrim(item->>'texto'),'\s+',' ','g'));
  else n:=n+1; end if;
  if p_baralho is not null then insert into public.xl_baralho_palavras values(p_baralho,v,auth.uid(),p_idioma) on conflict do nothing; end if;
 end loop;
 return jsonb_build_object('inseridas',n,'duplicadas',puladas);
end $$;

revoke execute on function public.xl_importar_classificado(text,jsonb,uuid) from public, anon;
grant execute on function public.xl_importar_classificado(text,jsonb,uuid) to authenticated;
notify pgrst, 'reload schema';

commit;
