// Byte-accurate corroboration for the consumed Top 10 report.
// A claim recorded in the compiler input is not independent Git proof.
import crypto from 'node:crypto';
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const canonical=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function verifyConsumedTop10Report({input,cycle,edition,sourcePath,commit,blob,raw}){
 const failures=[];
 if(input?.schema_version!=='daily-ai-topic-top10-input-v1'||input.cycle_date!==cycle||
   input.edition_date!==edition||input.report_date!==cycle||input.source_path!==sourcePath||
   input.source_commit!==commit||!SHA40.test(commit||'')||!SHA40.test(blob||''))
   failures.push('WRONG_CYCLE_EDITION_OR_CONSUMED_SOURCE');
 const actualHash=Buffer.isBuffer(raw)?sha(raw):null;
 if(!actualHash||!SHA64.test(input?.report_sha256||'')||input.report_sha256!==actualHash||
    (input.source_blob_sha&&input.source_blob_sha!==blob))
   failures.push('CONSUMED_REPORT_BYTES_OR_BLOB_MISMATCH');
 let report=null;
 try{report=JSON.parse(raw.toString('utf8'));}catch{failures.push('ORIGINAL_REPORT_JSON_NOT_PARSEABLE');}
 if(report){
   if(report.schema_version!=='daily-ai-topic-top10-v1'||report.report_date!==cycle||
     report.target_edition_date!==edition||report.timezone!=='America/Chicago')
       failures.push('SOURCE_REPORT_NOT_SAME_CHICAGO_CYCLE');
   if(!input?.report||canonical(input.report)!==canonical(report))
       failures.push('CONSUMED_SNAPSHOT_NOT_EXACT_SOURCE_REPORT');
 }
 return {result:failures.length?'UNVERIFIED':'EXACT_GIT_REPORT_VERIFIED',
    reasons:failures,report_sha256:actualHash,source_blob_sha:blob};
}
