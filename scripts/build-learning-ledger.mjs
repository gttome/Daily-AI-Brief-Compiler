#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {writeLearningLedger} from '../operations/learning.mjs';

const root=process.argv[2]||'_records/learning/problems';
const jsonPath=process.argv[3]||'_records/learning/ledger.json';
const markdownPath=process.argv[4]||'docs/OPERATIONAL-LEARNING.md';
function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(p));
    else if(e.isFile()&&p.endsWith('.json')) out.push(p);
  }
  return out;
}
const records=walk(root).sort().map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
writeLearningLedger({records,jsonPath,markdownPath});
console.log(JSON.stringify({result:'PASS',records:records.length,jsonPath,markdownPath},null,2));
