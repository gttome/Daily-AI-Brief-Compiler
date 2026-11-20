// Materialize actual original-paper reviews; never infer reading from a URL.
import fs from 'node:fs';
import path from 'node:path';
import {validateScientificPaperEditionReceipt} from '../operations/scientific-paper-cadence.mjs';
const [bundleFile,actualReviewFile,outputFile]=process.argv.slice(2);
if(!outputFile)throw Error('Usage: write-scientific-paper-coverage <selected-bundle> <actual-paper-review-receipt> <output>');
const b=JSON.parse(fs.readFileSync(bundleFile)),r=JSON.parse(fs.readFileSync(actualReviewFile));
if(r.edition_date!==b.edition_date||!Number.isFinite(Date.parse(r.reviewed_at))||
 Date.parse(r.reviewed_at)>Date.now()||typeof r.reviewer!=='string'||!r.reviewer.trim())
 throw Error('Genuine review identity and observed clock required');
validateScientificPaperEditionReceipt(r,{editionDate:b.edition_date,bundle:b});
for(const p of r.published_papers){
 const s=b.stories.find(s=>s.id===p.story_id);
 if(p.original_paper_url!==s.source.url&&p.original_paper_url!==s.source.original_paper_url)
  throw Error('Selected paper is not linked to its exact story source');
}
fs.mkdirSync(path.dirname(outputFile),{recursive:true});fs.writeFileSync(outputFile,JSON.stringify(r,null,2)+'\n');
console.log(JSON.stringify({result:'OBSERVED_PAPER_REVIEW_RECORDED',edition_date:b.edition_date,
 papers:r.published_papers.length,review_timing:r.review_timing??'NOT_RECORDED'}));
