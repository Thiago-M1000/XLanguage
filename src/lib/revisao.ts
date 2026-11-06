// Modelo de repetição espaçada simples; os mesmos cálculos são executados no PostgreSQL.
export function proximoIntervalo(repeticoes:number,dias:number,facilidade:number,nota:number) {
 let r=repeticoes,d=0,e=facilidade;
 if(nota===1){r=0;e=Math.max(1.3,e-.2)}
 else if(nota===2){d=Math.max(1,Math.round(dias*1.2));e=Math.max(1.3,e-.15)}
 else if(nota===3){d=r===0?1:r===1?6:Math.max(1,Math.round(dias*e));r++}
 else if(nota===4){d=r===0?4:Math.max(dias+1,Math.round(dias*e*1.3));r++;e=Math.min(3,e+.15)}
 else throw new Error('Nota inválida');
 d=Math.min(d,3650);
 return {repeticoes:r,intervalo_dias:d,facilidade:Number(e.toFixed(2)),segundos:nota===1?60:d*86400};
}
export function rotuloIntervalo(segundos:number){return segundos<86400?`${Math.round(segundos/60)} min`:`${Math.round(segundos/86400)} ${segundos===86400?'dia':'dias'}`}
