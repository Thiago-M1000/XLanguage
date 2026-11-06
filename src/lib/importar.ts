export function lerEntradas(raw:unknown) {
 if(typeof raw!=='string'||raw.length>400000)throw new Error('Cole até 500 palavras.');
 const text=raw.trim(); if(!text)throw new Error('Cole as palavras para importar.');
 let rows:unknown[];
 if(text.startsWith('[')){try{rows=JSON.parse(text)}catch{throw new Error('JSON inválido.')}if(!Array.isArray(rows))throw new Error('Use uma lista JSON.');}
 else rows=text.split(/\r?\n/).filter(l=>l.trim()).map((line,index)=>{
  const [texto,traducao,exemplo='']=line.split('\t');
  if(!texto?.trim()||!traducao?.trim())throw new Error(`Linha ${index+1}: separe palavra e tradução com uma tabulação (copie duas colunas da planilha).`);
  return {texto,traducao,exemplo};
 });
 if(rows.length<1||rows.length>500)throw new Error('Importe entre 1 e 500 entradas por vez.');
 return rows.map((row,index)=>{
  if(!row||typeof row!=='object')throw new Error(`Entrada ${index+1} inválida.`);
  const r=row as Record<string,unknown>;
  const texto=typeof r.texto==='string'?r.texto.normalize('NFC').trim():'';
  const traducao=typeof r.traducao==='string'?r.traducao.normalize('NFC').trim():'';
  const exemplo=typeof r.exemplo==='string'?r.exemplo.trim():'';
  if(!texto||texto.length>500||!traducao||traducao.length>1000||exemplo.length>2000)throw new Error(`Entrada ${index+1}: confira palavra, tradução e exemplo.`);
  return {texto,traducao,exemplo};
 });
}
