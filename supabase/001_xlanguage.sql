-- Execute no SQL Editor do Supabase. Não altera nem apaga a tabela palavras antiga.
begin;
create table if not exists public.xl_perfis (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nome text not null default '' check(length(nome)<=80),
 meta_diaria integer not null default 20 check(meta_diaria between 1 and 1000),
 timezone text not null default 'America/Sao_Paulo',
 idioma_ativo text not null default 'en-US',
 idiomas text[] not null default array['en-US','es-ES'],
 check(idioma_ativo=any(idiomas))
);
create table if not exists public.xl_baralhos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 idioma text not null, nome text not null check(length(btrim(nome)) between 1 and 100), descricao text not null default '' check(length(descricao)<=500),
 criado_em timestamptz not null default now(), unique(id,user_id,idioma)
);
create unique index if not exists xl_baralho_nome on public.xl_baralhos(user_id,idioma,lower(btrim(nome)));
create table if not exists public.xl_palavras (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 idioma text not null, texto text not null check(length(btrim(texto)) between 1 and 500),
 traducao text not null check(length(btrim(traducao)) between 1 and 1000), classe text not null default 'expressão' check(length(classe)<=50),
 exemplo text not null default '' check(length(exemplo)<=2000), etiquetas text[] not null default '{}',
 criado_em timestamptz not null default now(), due_at timestamptz not null default now(),
 ultima_revisao timestamptz, repeticoes integer not null default 0, intervalo_dias integer not null default 0,
 facilidade numeric not null default 2.5, versao integer not null default 0,
 tentativas integer not null default 0, acertos integer not null default 0,
 unique(id,user_id,idioma)
);
create unique index if not exists xl_palavra_unica on public.xl_palavras(user_id,idioma,lower(regexp_replace(btrim(texto),'\s+',' ','g')));
create index if not exists xl_palavras_fila on public.xl_palavras(user_id,idioma,due_at);
create table if not exists public.xl_baralho_palavras (
 baralho_id uuid not null, palavra_id uuid not null, user_id uuid not null default auth.uid(), idioma text not null,
 primary key(baralho_id,palavra_id),
 foreign key(baralho_id,user_id,idioma) references public.xl_baralhos(id,user_id,idioma) on delete cascade,
 foreign key(palavra_id,user_id,idioma) references public.xl_palavras(id,user_id,idioma) on delete cascade
);
create table if not exists public.xl_revisoes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, palavra_id uuid references public.xl_palavras(id) on delete set null,
 palavra_ref uuid not null, idioma text not null, nota integer not null check(nota between 1 and 4),
 criado_em timestamptz not null default now(), resultado jsonb not null,
 unique(user_id,request_id)
);
create index if not exists xl_revisoes_dia on public.xl_revisoes(user_id,idioma,criado_em);
-- RLS e permissões. Escritas de vocabulário/revisão passam pelas funções transacionais abaixo.
alter table public.xl_perfis enable row level security;
alter table public.xl_baralhos enable row level security;
alter table public.xl_palavras enable row level security;
alter table public.xl_baralho_palavras enable row level security;
alter table public.xl_revisoes enable row level security;
do $$ declare t text; begin
 foreach t in array array['xl_perfis','xl_baralhos','xl_palavras','xl_baralho_palavras','xl_revisoes'] loop
  execute format('drop policy if exists dono on public.%I',t);
  execute format('create policy dono on public.%I for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
grant insert,update on public.xl_perfis to authenticated;
grant insert,update,delete on public.xl_baralhos to authenticated;

create or replace function public.xl_intervalo(p_reps integer,p_dias integer,p_ease numeric,p_nota integer)
returns jsonb language plpgsql immutable set search_path='' as $$
declare r integer:=p_reps; d integer; e numeric:=p_ease; begin
 if p_nota=1 then r:=0; d:=0; e:=greatest(1.3,e-0.2);
 elsif p_nota=2 then d:=greatest(1,round(p_dias*1.2)::integer); e:=greatest(1.3,e-0.15);
 elsif p_nota=3 then d:=case when r=0 then 1 when r=1 then 6 else greatest(1,round(p_dias*e)::integer) end; r:=r+1;
 elsif p_nota=4 then d:=case when r=0 then 4 else greatest(p_dias+1,round(p_dias*e*1.3)::integer) end; r:=r+1; e:=least(3,e+0.15);
 else raise exception 'NOTA_INVALIDA'; end if;
 d:=least(d,3650);
 return jsonb_build_object('repeticoes',r,'intervalo_dias',d,'facilidade',e,'segundos',case when p_nota=1 then 60 else d*86400 end);
end $$;

create or replace function public.xl_avaliar(p_palavra uuid,p_nota integer,p_versao integer,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.xl_palavras; result jsonb; nx jsonb; destino timestamptz; begin
 if auth.uid() is null then raise exception 'SEM_SESSAO'; end if;
 -- Serializa inclusive retries concorrentes com o mesmo request_id.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));
 select resultado into result from public.xl_revisoes where user_id=auth.uid() and request_id=p_request;
 if found then
  if (result->>'palavra_id')::uuid<>p_palavra or (result->>'nota')::int<>p_nota then raise exception 'REQUEST_REUTILIZADO'; end if;
  return result;
 end if;
 select * into w from public.xl_palavras where id=p_palavra and user_id=auth.uid() for update;
 if not found then raise exception 'NAO_ENCONTRADO'; end if;
 if w.versao<>p_versao then raise exception 'CONFLITO'; end if;
 if w.due_at>now() then raise exception 'AINDA_NAO_VENCEU'; end if;
 nx:=public.xl_intervalo(w.repeticoes,w.intervalo_dias,w.facilidade,p_nota);
 destino:=now()+make_interval(secs=>(nx->>'segundos')::integer);
 update public.xl_palavras set repeticoes=(nx->>'repeticoes')::int, intervalo_dias=(nx->>'intervalo_dias')::int,
 facilidade=(nx->>'facilidade')::numeric,due_at=destino,ultima_revisao=now(),versao=versao+1,
 tentativas=tentativas+1,acertos=acertos+case when p_nota>=3 then 1 else 0 end where id=w.id;
 result:=nx||jsonb_build_object('palavra_id',w.id,'nota',p_nota,'due_at',destino,'versao',w.versao+1);
 insert into public.xl_revisoes(user_id,request_id,palavra_id,palavra_ref,idioma,nota,resultado)
 values(auth.uid(),p_request,w.id,w.id,w.idioma,p_nota,result);
 return result;
end $$;

create or replace function public.xl_salvar_palavra(p_id uuid,p_idioma text,p_texto text,p_traducao text,p_classe text,p_exemplo text,p_etiquetas text[],p_baralhos uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid; begin
 if auth.uid() is null then raise exception 'SEM_SESSAO'; end if;
 if p_idioma not in ('en-US','es-ES','fr-FR','de-DE','it-IT','pt-BR','ja-JP','ko-KR','zh-CN') then raise exception 'IDIOMA_INVALIDO'; end if;
 if coalesce(length(btrim(p_texto)),0) not between 1 and 500 or coalesce(length(btrim(p_traducao)),0) not between 1 and 1000 then raise exception 'DADOS_INVALIDOS'; end if;
 if coalesce(array_length(p_etiquetas,1),0)>20 then raise exception 'DADOS_INVALIDOS'; end if;
 if exists(select 1 from unnest(p_baralhos) b where not exists(select 1 from public.xl_baralhos d where d.id=b and d.user_id=auth.uid() and d.idioma=p_idioma)) then raise exception 'BARALHO_INVALIDO'; end if;
 if p_id is null then
  insert into public.xl_palavras(idioma,texto,traducao,classe,exemplo,etiquetas) values(p_idioma,btrim(p_texto),btrim(p_traducao),p_classe,p_exemplo,coalesce(p_etiquetas,'{}')) returning id into v;
 else
  update public.xl_palavras set texto=btrim(p_texto),traducao=btrim(p_traducao),classe=p_classe,exemplo=p_exemplo,etiquetas=coalesce(p_etiquetas,'{}'),versao=versao+1
   where id=p_id and user_id=auth.uid() and idioma=p_idioma returning id into v;
  if v is null then raise exception 'NAO_ENCONTRADO'; end if;
 end if;
 delete from public.xl_baralho_palavras where palavra_id=v and user_id=auth.uid();
 insert into public.xl_baralho_palavras(baralho_id,palavra_id,user_id,idioma) select distinct b,v,auth.uid(),p_idioma from unnest(p_baralhos) b;
 return v;
end $$;
create or replace function public.xl_excluir_palavra(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin
 delete from public.xl_palavras where id=p_id and user_id=auth.uid(); return found;
end $$;

create or replace function public.xl_importar(p_idioma text,p_entradas jsonb,p_baralho uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; v uuid; n int:=0; puladas int:=0; begin
 if auth.uid() is null then raise exception 'SEM_SESSAO'; end if;
 if p_idioma not in ('en-US','es-ES','fr-FR','de-DE','it-IT','pt-BR','ja-JP','ko-KR','zh-CN') then raise exception 'IDIOMA_INVALIDO'; end if;
 if jsonb_typeof(p_entradas)<>'array' or jsonb_array_length(p_entradas) not between 1 and 500 then raise exception 'DADOS_INVALIDOS'; end if;
 if p_baralho is not null and not exists(select 1 from public.xl_baralhos where id=p_baralho and user_id=auth.uid() and idioma=p_idioma) then raise exception 'BARALHO_INVALIDO'; end if;
 for item in select value from jsonb_array_elements(p_entradas) loop
  if coalesce(length(btrim(item->>'texto')),0) not between 1 and 500 or coalesce(length(btrim(item->>'traducao')),0) not between 1 and 1000 or coalesce(length(item->>'exemplo'),0)>2000 then raise exception 'DADOS_INVALIDOS'; end if;
  v:=null;
  insert into public.xl_palavras(idioma,texto,traducao,exemplo) values(p_idioma,btrim(item->>'texto'),btrim(item->>'traducao'),coalesce(item->>'exemplo','')) on conflict do nothing returning id into v;
  if v is null then
   puladas:=puladas+1;
   select id into v from public.xl_palavras where user_id=auth.uid() and idioma=p_idioma and lower(regexp_replace(btrim(texto),'\s+',' ','g'))=lower(regexp_replace(btrim(item->>'texto'),'\s+',' ','g'));
  else n:=n+1; end if;
  if p_baralho is not null then insert into public.xl_baralho_palavras values(p_baralho,v,auth.uid(),p_idioma) on conflict do nothing; end if;
 end loop;
 return jsonb_build_object('inseridas',n,'duplicadas',puladas);
end $$;

create or replace function public.xl_buscar(p_idioma text,p_busca text default '',p_pagina integer default 1,p_baralho uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 with filtro as (
 select w.* from public.xl_palavras w where w.user_id=auth.uid() and w.idioma=p_idioma
 and (strpos(lower(w.texto),lower(left(p_busca,200)))>0 or strpos(lower(w.traducao),lower(left(p_busca,200)))>0)
 and (p_baralho is null or exists(select 1 from public.xl_baralho_palavras bp where bp.palavra_id=w.id and bp.baralho_id=p_baralho and bp.user_id=auth.uid()))
 ), pagina as (select * from filtro order by criado_em desc,id limit 30 offset (greatest(1,least(p_pagina,100000))-1)*30)
 select jsonb_build_object('total',(select count(*) from filtro),'itens',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('baralhos',coalesce((select jsonb_agg(bp.baralho_id) from public.xl_baralho_palavras bp where bp.palavra_id=p.id),'[]'::jsonb))) from pagina p),'[]'::jsonb));
$$;
create or replace function public.xl_fila(p_idioma text,p_baralho uuid default null)
returns setof public.xl_palavras language sql stable security invoker set search_path='' as $$
 select w.* from public.xl_palavras w where w.user_id=auth.uid() and w.idioma=p_idioma and w.due_at<=now()
 and(p_baralho is null or exists(select 1 from public.xl_baralho_palavras bp where bp.palavra_id=w.id and bp.baralho_id=p_baralho and bp.user_id=auth.uid()))
 order by due_at,id limit 100;
$$;
create or replace function public.xl_baralhos_resumo(p_idioma text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t) order by t.criado_em desc),'[]'::jsonb) from (
 select b.*,count(w.id)::integer cartoes,count(w.id) filter(where w.due_at<=now())::integer pendentes,
 count(w.id) filter(where w.repeticoes>=2)::integer aprendidas
 from public.xl_baralhos b left join public.xl_baralho_palavras bp on bp.baralho_id=b.id
 left join public.xl_palavras w on w.id=bp.palavra_id where b.user_id=auth.uid() and b.idioma=p_idioma group by b.id
 ) t;
$$;
create or replace function public.xl_painel(p_idioma text)
returns jsonb language sql stable security invoker set search_path='' as $$
 with perfil as(select coalesce((select timezone from public.xl_perfis where user_id=auth.uid()),'America/Sao_Paulo') tz),
 hoje as(select timezone(tz,now())::date dia,tz from perfil),
 dias as(select distinct timezone(h.tz,r.criado_em)::date dia from public.xl_revisoes r cross join hoje h where r.user_id=auth.uid() and r.idioma=p_idioma),
 base as(select case when exists(select 1 from dias d,hoje h where d.dia=h.dia) then (select dia from hoje) else (select dia-1 from hoje) end dia),
 ordem as(select d.dia,row_number() over(order by d.dia desc)-1 n from dias d,base b where d.dia<=b.dia),
 semana as(select h.dia-i d,h.tz from hoje h,generate_series(6,0,-1) i)
 select jsonb_build_object(
 'total',(select count(*) from public.xl_palavras where user_id=auth.uid() and idioma=p_idioma),
 'pendentes',(select count(*) from public.xl_palavras where user_id=auth.uid() and idioma=p_idioma and due_at<=now()),
 'aprendidas',(select count(*) from public.xl_palavras where user_id=auth.uid() and idioma=p_idioma and repeticoes>=2),
 'hoje',(select count(distinct r.palavra_ref) from public.xl_revisoes r,hoje h where r.user_id=auth.uid() and r.idioma=p_idioma and timezone(h.tz,r.criado_em)::date=h.dia),
 'sequencia',(select count(*) from ordem o,base b where b.dia-o.dia=o.n),
 'proxima',(select min(due_at) from public.xl_palavras where user_id=auth.uid() and idioma=p_idioma and due_at>now()),
 'semana',(select jsonb_agg(jsonb_build_object('data',s.d,'cartoes',(select count(distinct r.palavra_ref) from public.xl_revisoes r where r.user_id=auth.uid() and r.idioma=p_idioma and timezone(s.tz,r.criado_em)::date=s.d)) order by s.d) from semana s)
 );
$$;
-- Funções com privilégios elevados têm auth.uid() e ownership explícitos; acesso só para usuários autenticados.
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('xl_intervalo','xl_avaliar','xl_salvar_palavra','xl_excluir_palavra','xl_importar','xl_buscar','xl_fila','xl_baralhos_resumo','xl_painel') loop
 execute format('revoke all on function %s from public, anon',f.sig);
 execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
