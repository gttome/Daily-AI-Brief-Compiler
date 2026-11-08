import fs from 'node:fs';
import crypto from 'node:crypto';
import {summarizeTop10} from './top10-aar.mjs';

const [inputPath,reportPath,coveragePath,draftPath]=process.argv.slice(2);
if(!draftPath)throw Error('Usage: check-trend-search-coverage <trend-input> <raw dated report> <coverage> <draft bundle>');
const read=file=>JSON.parse(fs.readFileSync(file));
const input=read(inputPath),raw=fs.readFileSync(reportPath),coverage=read(coveragePath),bundle=read(draftPath);
const hash=crypto.createHash('sha256').update(raw).digest('hex');
const result=summarizeTop10(input.cycle_date,bundle.edition_date,{
 'top10-report':JSON.parse(raw),'trend-input':input,'trend-search-coverage':coverage,'edition-bundle':bundle,
 'top10-report-source':{schema_version:'daily-ai-topic-top10-source-v1',cycle_date:input.cycle_date,
  edition_date:bundle.edition_date,source_path:input.source_path,source_commit:input.source_commit,
  source_blob_sha:input.source_blob_sha,report_sha256:hash,observed_at:new Date().toISOString()}
},{'top10-report':hash});
const attempted=Object.values(result.search_counts).reduce((n,row)=>n+row.attempted,0);
console.log(JSON.stringify({result:result.search_status,attempted,expected:result.topic_count*3,
 selection_mapping_status:result.selection_mapping_status,defects:result.defects}));
if(result.search_status!=='RECEIPTS_OBSERVED'||attempted!==result.topic_count*3||
   !['NONE_RECORDED','MATCHES_EDITION_BUNDLE'].includes(result.selection_mapping_status))process.exitCode=1;
