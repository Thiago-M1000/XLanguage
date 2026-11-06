import {spawn} from 'node:child_process';

const action=process.argv[2]??'build';
if(!['build','deploy'].includes(action))throw new Error('Use build ou deploy.');
const env={...process.env,XLANGUAGE_TARGET:'cloudflare',ASTRO_TELEMETRY_DISABLED:'1',WRANGLER_SEND_METRICS:'false'};
const run=(args)=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,args,{env,stdio:'inherit'});
 child.once('error',reject);
 child.once('exit',code=>code===0?resolve():reject(new Error(`Comando terminou com código ${code}.`)));
});
await run(['node_modules/astro/bin/astro.mjs','build']);
if(action==='deploy')await run(['node_modules/wrangler/bin/wrangler.js','deploy']);
