import fs from 'node:fs';
import path from 'node:path';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';
const [editionDate,registryFile,previousAarFile,output,trendInputFile,paperEvidenceFile]=process.argv.slice(2);
if(!output)throw Error('Usage: plan-editorial-research.mjs <edition> <registry.json> <previous-combined.json|-> <output.json> [verified-trend-input.json] [prior-scientific-paper-coverage.json]');
const previousAar=previousAarFile==='-'?null:JSON.parse(fs.readFileSync(previousAarFile));
const trendInput=trendInputFile?JSON.parse(fs.readFileSync(trendInputFile)):null;
const recentScientificPaperEvidence=paperEvidenceFile?JSON.parse(fs.readFileSync(paperEvidenceFile)):[];
const plan=buildEditorialResearchPlan({editionDate,registry:JSON.parse(fs.readFileSync(registryFile)),previousAar,trendInput,recentScientificPaperEvidence});
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({result:'RESEARCH_PLAN_ONLY',edition_date:editionDate,eligible:plan.eligible_count,previously_unreviewed:plan.previously_unreviewed_prioritized,video_registered:plan.video_source_sweep.registered_count,video_qualification_only:plan.video_source_sweep.qualification_only_count,
  paper_review_priority:plan.scientific_papers.paper_review_priority,
  paper_history_status:plan.scientific_papers.prior_target_status,
  paper_source_count:plan.scientific_papers.eligible_discovery_sources.length}));
