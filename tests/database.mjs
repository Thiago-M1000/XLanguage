import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {proximoIntervalo} from '../src/lib/revisao.ts';
import {lerEntradas} from '../src/lib/importar.ts';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(await readFile(new URL('../supabase/001_xlanguage.sql',import.meta.url),'utf8'));
// A segunda execução também deve ser segura.
await db.exec(await readFile(new URL('../supabase/001_xlanguage.sql',import.meta.url),'utf8'));
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
await db.query('insert into auth.users values ($1,$2),($3,$4)',[a,'a@example.test',b,'b@example.test']);
async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await user(a);await db.query('insert into public.xl_perfis(user_id) values ($1)',[a]);
const deck=await scalar("insert into public.xl_baralhos(nome,idioma) values ('Trabalho','en-US') returning id");
const save=(id,lang,text,translation,decks=[])=>scalar('select public.xl_salvar_palavra($1,$2,$3,$4,$5,$6,$7,$8)',[id,lang,text,translation,'expressão','',[],decks]);
const word=await save(null,'en-US','deadline','prazo',[deck]);
await save(null,'es-ES','hola','olá');
await assert.rejects(()=>save(null,'en-US',' DEADLINE ','outro'),/duplicate key/);
await assert.rejects(()=>save(null,'es-ES','otro','outro',[deck]),/BARALHO_INVALIDO/);
let search=await scalar("select public.xl_buscar('en-US','prazo',1,null)");assert.equal(search.total,1);assert.deepEqual(search.itens[0].baralhos,[deck]);
assert.equal((await db.query("select * from public.xl_fila('es-ES')")).rows.length,1);
assert.equal((await db.query("select * from public.xl_fila('en-US',$1)",[deck])).rows.length,1);
await user(b);assert.equal(await scalar('select count(*)::integer from public.xl_palavras'),0);
await assert.rejects(()=>save(word,'en-US','hack','hack'),/NAO_ENCONTRADO/);
await assert.rejects(()=>db.query('insert into public.xl_baralhos(user_id,nome,idioma) values ($1,$2,$3)',[a,'intruso','en-US']),/row-level security/);
await assert.rejects(()=>db.query('update public.xl_palavras set intervalo_dias=300'),/permission denied/);
await assert.rejects(()=>scalar('select public.xl_avaliar($1,3,0,$2)',[word,crypto.randomUUID()]),/NAO_ENCONTRADO/);
await user(a);
// Comparação do cálculo mostrado nos botões com o PostgreSQL, incluindo arredondamentos.
for(const reps of [0,1,2,5])for(const days of [0,1,6,45,3600])for(const ease of [1.3,2.5,3])for(const nota of [1,2,3,4]){
 const sql=await scalar('select public.xl_intervalo($1,$2,$3,$4)',[reps,days,ease,nota]);assert.deepEqual(sql,proximoIntervalo(reps,days,ease,nota));
}
const req=crypto.randomUUID();let result=await scalar('select public.xl_avaliar($1,3,0,$2)',[word,req]);assert.equal(result.intervalo_dias,1);
assert.deepEqual(await scalar('select public.xl_avaliar($1,3,0,$2)',[word,req]),result);
assert.equal(await scalar('select count(*)::integer from public.xl_revisoes'),1);
await assert.rejects(()=>scalar('select public.xl_avaliar($1,4,0,$2)',[word,req]),/REQUEST_REUTILIZADO/);
await assert.rejects(()=>scalar('select public.xl_avaliar($1,3,0,$2)',[word,crypto.randomUUID()]),/CONFLITO/);
await assert.rejects(()=>scalar('select public.xl_avaliar($1,3,1,$2)',[word,crypto.randomUUID()]),/AINDA_NAO_VENCEU/);
let summary=await scalar("select public.xl_painel('en-US')");assert.equal(summary.total,1);assert.equal(summary.hoje,1);assert.equal(summary.pendentes,0);assert.equal(summary.sequencia,1);assert.equal(summary.semana.length,7);
let imported=await scalar('select public.xl_importar($1,$2,$3)',['en-US',JSON.stringify([{texto:'deadline',traducao:'não sobrescrever'},{texto:'meeting',traducao:'reunião'}]),deck]);assert.deepEqual(imported,{inseridas:1,duplicadas:1});
assert.equal(await scalar('select traducao from public.xl_palavras where id=$1',[word]),'prazo');
await assert.rejects(()=>scalar('select public.xl_importar($1,$2,$3)',['en-US',JSON.stringify([{texto:'rollback',traducao:'teste'},{texto:'sem tradução'}]),null]),/DADOS_INVALIDOS/);
assert.equal((await scalar("select public.xl_buscar('en-US','rollback')")).total,0);
await db.query('delete from public.xl_baralhos where id=$1',[deck]);assert.equal(await scalar('select count(*)::integer from public.xl_palavras'),3);
assert.equal(await scalar('select public.xl_excluir_palavra($1)',[word]),true);
summary=await scalar("select public.xl_painel('en-US')");assert.equal(summary.hoje,1);assert.equal(await scalar('select count(*)::integer from public.xl_revisoes'),1);
await db.exec('reset role');
// Virada de dia e sequência com dias anteriores: cada timestamp é calculado no fuso do perfil.
await db.query("update public.xl_perfis set timezone='Pacific/Kiritimati' where user_id=$1",[a]);
await db.query("update public.xl_revisoes set criado_em=now()-interval '1 day' where user_id=$1",[a]);
await user(a);summary=await scalar("select public.xl_painel('en-US')");assert.equal(summary.hoje,0);assert.equal(summary.sequencia,1);
await db.exec('reset role');await db.query("update public.xl_revisoes set criado_em=now()-interval '3 days' where user_id=$1",[a]);await user(a);assert.equal((await scalar("select public.xl_painel('en-US')")).sequencia,0);
assert.equal(lerEntradas('hello\tolá\nworld\tmundo').length,2);assert.throws(()=>lerEntradas('sem separação'),/Linha 1/);assert.throws(()=>lerEntradas('[{"texto":"a"}]'),/Entrada 1/);
await db.exec('reset role');
await db.exec("create table public.palavras(id integer, texto text, traducao text, idioma text, lang text, etiquetas text[])");
const legacy=(await readFile(new URL('../supabase/002_importar_palavras_antigas.sql',import.meta.url),'utf8')).replace("email_dono text:='COLOQUE_SEU_EMAIL_AQUI'","email_dono text:='a@example.test'");
await assert.rejects(()=>db.exec(legacy),/legado não identifica o dono/);await db.exec('rollback');
await db.exec("alter table public.palavras add column user_id uuid");
await db.query("insert into public.palavras values(1,'legacy A','antiga A','Inglês','en-US',array['original'],$1),(2,'legacy B','antiga B','Inglês','en-US',array[]::text[],$2)",[a,b]);
await db.exec(legacy);await user(a);assert.equal((await scalar("select public.xl_buscar('en-US','legacy')")).total,1);
await db.exec('reset role');assert.equal(await scalar('select count(*)::integer from public.palavras'),2);
await db.close();console.log('PASS: migração repetível, RLS entre usuários, notas, idempotência, conflitos, fila por idioma/baralho, importação atômica, duplicatas, exclusão e estatísticas por fuso.');
