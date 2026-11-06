import assert from 'node:assert/strict';
import {criarLacuna,conferirResposta} from '../src/lib/exercicios.ts';
import {resumirPeriodo,classificarDificuldades} from '../src/lib/progresso.ts';
import {sugerirVocabulario} from '../src/lib/ia-provider.ts';
assert.equal(criarLacuna('art','A party is fun.'),null);
assert.equal(criarLacuna('deadline','The DEADLINE is Monday.'),'The _____ is Monday.');
assert.equal(criarLacuna('a+b','Use a+b today.'),'Use _____ today.');
assert.equal(criarLacuna('take off','We take off soon. Take off now!'),'We _____ soon. _____ now!');
assert.equal(criarLacuna('猫','私は猫が好きです。','ja-JP'),'私は_____が好きです。');
assert.equal(conferirResposta('  HELLO! ','hello'),'certa');
assert.equal(conferirResposta('cafe','café'),'acentos');
assert.equal(conferirResposta('other','hello'),'diferente');
assert.equal(conferirResposta('','hello'),'diferente');
const rows=[
 {id:'a',palavra_ref:'w1',nota:3,criado_em:'2026-11-06T01:00:00Z'},
 {id:'b',palavra_ref:'w1',nota:1,criado_em:'2026-11-06T01:01:00Z'},
 {id:'c',palavra_ref:'w2',nota:4,criado_em:'2026-11-05T12:00:00Z'},
 {id:'d',palavra_ref:'old',nota:3,criado_em:'2026-10-29T12:00:00Z'},
];
const stats=resumirPeriodo(rows,'2026-11-05','America/Sao_Paulo',7);
assert.equal(stats.atual.palavras,2);assert.equal(stats.atual.avaliacoes,3);assert.equal(stats.atual.diasAtivos,1);assert.equal(stats.atual.acertos,2);assert.equal(stats.anterior.palavras,1);
assert.equal(stats.atual.historico.at(-1).palavras,2);assert.equal(stats.atual.historico.length,7);
assert.equal(resumirPeriodo(rows,'2026-11-05','America/Sao_Paulo',30).atual.historico.length,30);
const difficult=classificarDificuldades([{id:'a',tentativas:10,acertos:9,facilidade:2.3},{id:'b',tentativas:2,acertos:0,facilidade:2.1},{id:'c',tentativas:0,acertos:0,facilidade:2.5},{id:'d',tentativas:8,acertos:8,facilidade:2.6}]);
assert.deepEqual(difficult.map(w=>w.id),['b','a']);assert.equal(difficult[0].erros,2);
let sent;
const suggestion=await sugerirVocabulario('deadline','Inglês','fake-unit-key','gpt-5-mini',async(url,options)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({traducao:'prazo',exemplo:'The deadline is Monday.',classe:'substantivo'})}]}]});
});
assert.equal(suggestion.traducao,'prazo');assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.ok(!JSON.stringify(sent).includes('fake-unit-key'));
await assert.rejects(()=>sugerirVocabulario('a','Inglês','fake','gpt-5-mini',async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'no'}]}]})),/válida/);
await assert.rejects(()=>sugerirVocabulario('a','Inglês','fake','gpt-5-mini',async()=>new Response('',{status:429})),/limite/);
console.log('PASS: lacunas sem falsos matches, respostas e acentos, progresso com fuso e deduplicação, dificuldades e contrato da IA sem chamadas externas.');
