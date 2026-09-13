import fs from 'node:fs';
import path from 'node:path';

const source=fs.readFileSync(new URL('../src/background.ts',import.meta.url),'utf8');
const match=source.match(/data:image\/jpeg;base64,([^']+)/);
if(!match)throw new Error('Background data URI not found');
const outDir=new URL('../public/assets/',import.meta.url);
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(new URL('tactical-background-hi.jpg',outDir),Buffer.from(match[1],'base64'));
console.log('Wrote public/assets/tactical-background-hi.jpg');
