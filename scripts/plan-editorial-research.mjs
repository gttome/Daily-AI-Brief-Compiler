import fs from 'node:fs';
import path from 'node:path';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';
const [editionDate,registryFile,previousAarFile,output]=process.argv.slice(2);
if(!output)throw Error('Usage: plan-editorial-research.mjs <edition> <registry.json> <previous-combined.json|-> <output.json>');
const previousAar=previousAarFile==='-'?null:JSON.parse(fs.readFileSync(previousAarFile));
const plan=buildEditorialResearchPlan({editionDate,registry:JSON.parse(fs.readFileSync(registryFile)),previousAar});
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({result:'RESEARCH_PLAN_ONLY',edition_date:editionDate,eligible:plan.eligible_count,previously_unreviewed:plan.previously_unreviewed_prioritized}));
