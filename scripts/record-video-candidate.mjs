import fs from 'node:fs';
import path from 'node:path';
import {recordVideoCandidate} from '../operations/video-discovery-quality.mjs';
const [bundleFile,ledgerFile,observationFile,outputFile]=process.argv.slice(2);
if(!outputFile)throw Error('Usage: record-video-candidate <unlocked-bundle> <ledger|-> <actual-observation> <output>');
const read=f=>JSON.parse(fs.readFileSync(f));
const bundle=read(bundleFile),ledger=ledgerFile==='-'?{
 schema_version:'daily-video-candidate-discovery-v1',edition_date:bundle.edition_date,candidates:[]}:read(ledgerFile);
const output=recordVideoCandidate(ledger,bundle,read(observationFile));
fs.mkdirSync(path.dirname(outputFile),{recursive:true});fs.writeFileSync(outputFile,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({result:'OBSERVED_CANDIDATE_RECORDED',candidates:output.candidates.length,
 caveat:'Content review does not certify signed-out playback; a plan is not a reviewed candidate.'}));
