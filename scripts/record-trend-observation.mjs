// Single-observation checkpoint, never backfills past editorial work.
import fs from 'node:fs';
import path from 'node:path';
import {recordTrendSearch,recordSelectedTrendMapping} from '../operations/trend-receipt-writer.mjs';
const [coverageFile,inputFile,observationFile,outputFile,bundleFile]=process.argv.slice(2);
if(!outputFile)throw Error('Usage: record-trend-observation.mjs <coverage.json> <trend-input.json> <actual-observation.json> <output.json> [draft-bundle.json]');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const coverage=read(coverageFile),input=read(inputFile),record=read(observationFile);
if(bundleFile&&record.kind==='search'&&read(bundleFile).editorial_provenance?.selection_locked_at)
 throw Error('TREND_RECEIPT_SELECTION_LOCKED_SEARCH_CANNOT_BE_BACKFILLED');
let output;
if(record.kind==='search')output=recordTrendSearch(coverage,input,record.observation,
 {selectionLockedAt:bundleFile?read(bundleFile).editorial_provenance?.selection_locked_at:null});
else if(record.kind==='selected_mapping'&&bundleFile)
 output=recordSelectedTrendMapping(coverage,input,read(bundleFile),record.observation);
else throw Error('TREND_RECEIPT_UNKNOWN_KIND_OR_BUNDLE_REQUIRED');
fs.mkdirSync(path.dirname(outputFile),{recursive:true});
fs.writeFileSync(outputFile,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({result:'CANONICAL_OBSERVATION_SAVED',kind:record.kind,
 edition_date:output.edition_date,searches_observed:output.searches.filter(x=>x.outcome!=='not_attempted').length,
 selection_mappings:output.selected_mappings.length,
 caveat:'This action validates supplied current observations; it does not perform or attest a search.'}));
