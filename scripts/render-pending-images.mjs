import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readImageActivationStatus,readReaderImageStrategy,proposal1rRenderingAllowed} from '../image-capsules/routing.mjs';

const roots=['shadow-runs','rehearsals'];
const sha256=text=>crypto.createHash('sha256').update(text).digest('hex');

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const activationStatus=readImageActivationStatus('.');
const activeReaderStrategy=readReaderImageStrategy('.');
let rendered=0,skipped=0,blockedReaderSpecs=0;
for(const root of roots){
  const files=walk(root).filter(p=>{
    const q=p.replaceAll('\\','/');
    return q.includes('/images/specs/') && q.endsWith('.json');
  });
  for(const file of files){
    const specText=fs.readFileSync(file,'utf8');
    const spec=JSON.parse(specText);
    if(spec.schema_version!=='daily-compiler-diagram-spec-v2') continue;

    const normalized=file.replaceAll('\\','/');
    const runRoot=normalized.slice(0,normalized.lastIndexOf('/images/specs/'));
    const routing=proposal1rRenderingAllowed({activationStatus,activeReaderStrategy,specPath:normalized,runRoot});
    if(!routing.allowed){
      blockedReaderSpecs++;
      console.log(JSON.stringify({event:'proposal1r_reader_render_skipped',story_id:spec.story_id,spec:normalized,activation_status:activationStatus,reason:routing.reason}));
      continue;
    }
    const outDir=path.join(runRoot,'images','rendered',spec.story_id);
    const receiptPath=path.join(outDir,'receipt.json');

    if(fs.existsSync(receiptPath)){
      const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
      if(receipt.result==='PASS' &&
         receipt.renderer==='proposal1r-grammar-set-v2.2' &&
         receipt.source_spec_sha256===sha256(specText) &&
         fs.existsSync(path.join(outDir,'proof.png'))){
        skipped++;
        continue;
      }
    }

    execFileSync(process.execPath,['diagram-compiler/render-story.mjs',file,outDir],{stdio:'inherit'});
    rendered++;
  }
}

console.log(JSON.stringify({result:'PASS',activation_status:activationStatus,active_reader_strategy:activeReaderStrategy,rendered,skipped,blocked_reader_specs:blockedReaderSpecs}));
