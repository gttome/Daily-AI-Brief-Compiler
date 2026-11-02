// Optional read-only corroboration of the report at the exact consumed Git commit.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const [cycle,edition,dir]=process.argv.slice(2);
if(!/^20\d\d-\d\d-\d\d$/.test(cycle||'')||!/^20\d\d-\d\d-\d\d$/.test(edition||'')||!dir)throw Error('invalid_arguments');
const inputPath=path.join(dir,'trend-input.json');
if(fs.existsSync(inputPath))try{
 const input=JSON.parse(fs.readFileSync(inputPath));
 const sourcePath='signals/ai-topic-top10/'+cycle+'.json',sha=input.source_commit;
 if(input.cycle_date!==cycle||input.edition_date!==edition||input.source_path!==sourcePath||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('invalid_consumed_identity');
 try{execFileSync('git',['cat-file','-e',sha+'^{commit}'],{stdio:'ignore'});}
 catch{execFileSync('git',['fetch','--no-tags','origin',sha],{stdio:'ignore',timeout:20000});}
 const bytes=execFileSync('git',['show',sha+':'+sourcePath],{maxBuffer:2*1024*1024});
 const blob=execFileSync('git',['rev-parse',sha+':'+sourcePath],{encoding:'utf8'}).trim();
 const receipt={schema_version:'daily-ai-topic-top10-consumed-source-v1',cycle_date:cycle,edition_date:edition,
  source_commit:sha,source_path:sourcePath,source_blob_sha:blob,report_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),observed_at:new Date().toISOString()};
 fs.writeFileSync(path.join(dir,'trend-consumed-report.json'),bytes);
 fs.writeFileSync(path.join(dir,'trend-consumed-source.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('CONSUMED_COMMIT_REPORT_COLLECTED');
}catch(error){console.log('CONSUMED_COMMIT_UNVERIFIED '+error.message);}
