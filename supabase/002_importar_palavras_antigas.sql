-- OPCIONAL: copie as palavras antigas para o novo modelo sem remover os originais.
-- Preencha somente o email da conta proprietária antes de executar no SQL Editor.
-- Havendo user_id no legado, importa só as linhas daquela conta.
-- Sem user_id, exige que exista exatamente uma conta no projeto, evitando atribuição ambígua.
begin;
do $$
declare email_dono text:='COLOQUE_SEU_EMAIL_AQUI'; dono uuid; item jsonb; codigo text; tags text[]; importadas int:=0; total_usuarios int; tem_owner boolean; n int;
begin
 if email_dono='COLOQUE_SEU_EMAIL_AQUI' then raise exception 'Preencha email_dono com o email usado no login.'; end if;
 select id into dono from auth.users where lower(email)=lower(email_dono);
 if dono is null then raise exception 'Conta não encontrada.'; end if;
 if to_regclass('public.palavras') is null then raise exception 'A tabela antiga public.palavras não existe.'; end if;
 select exists(select 1 from information_schema.columns where table_schema='public' and table_name='palavras' and column_name='user_id') into tem_owner;
 select count(*) into total_usuarios from auth.users;
 if not tem_owner and total_usuarios<>1 then raise exception 'O legado não identifica o dono e há várias contas. Não foi importado nada. Exporte apenas suas palavras e use a importação do app.'; end if;
 for item in execute 'select to_jsonb(p) from public.palavras p' loop
  if tem_owner and (item->>'user_id') is distinct from dono::text then continue; end if;
  codigo:=case coalesce(item->>'lang',item->>'idioma') when 'Inglês' then 'en-US' when 'Espanhol' then 'es-ES' else coalesce(item->>'lang',item->>'idioma') end;
  if codigo not in ('en-US','es-ES','fr-FR','de-DE','it-IT','pt-BR','ja-JP','ko-KR','zh-CN') then raise exception 'Idioma desconhecido no legado. Corrija ou importe a lista pelo app.'; end if;
  tags:='{}';if jsonb_typeof(item->'etiquetas')='array' then select array_agg(value) into tags from jsonb_array_elements_text(item->'etiquetas');end if;
  insert into public.xl_palavras(user_id,idioma,texto,traducao,classe,exemplo,etiquetas)
  values(dono,codigo,item->>'texto',item->>'traducao',coalesce(item->>'classe','expressão'),coalesce(item->>'exemplo',''),coalesce(tags,'{}')) on conflict do nothing;
  get diagnostics n=row_count;importadas:=importadas+n;
 end loop;
 raise notice '% palavras importadas. A tabela antiga permanece intacta.',importadas;
end $$;
commit;
