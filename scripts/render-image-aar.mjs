import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateImageAfterAction} from './image-aar-contract.mjs';
const cell=s=>String(s??'Not recorded').replaceAll('|','/').replace(/\r?\n/g,' ');
export function renderImageAar({aar,job,manifest}){
 validateImageAfterAction({aar,job,manifest});
 const p=aar.production;
 return [
 '# '+aar.edition_date+' premium image after-action report','',
 '**Status: '+cell(aar.status)+'**. This is image-lane status, not unattended certification of the editorial producer.','',
 '| Metric | Observed result |','|---|---|',
 '| Native generations | '+p.actual_generation_count+' |',
 '| Accepted images | '+p.accepted_count+' |','| Rejected candidates | '+p.rejected_count+' |',
 '| Accepted-image regeneration | '+p.accepted_art_regenerated_after_lock+' |',
 '| First accepted binary commit | '+p.github_binary_stage_commit+' |',
 '| Executor observed run start | '+cell(p.host_execution_observed_at)+' (self-attested, not scheduler telemetry) |',
 '| First native generation clock | '+cell(p.generation_started_at)+' (observed before tool call) |',
 '| Public release | '+cell(aar.publication?.result)+' |',
 '| Public verified time | '+cell(aar.publication?.verified_at)+' |',
 '| Final saved-context review | '+cell(aar.visual_review?.result)+'; '+cell(aar.visual_review?.reviewed_targets)+' targets |',
 '| Weekly usage | '+(aar.usage?.work_usage_percent??'UNKNOWN')+' |','',
 '## Per-story effort','', '| Story | Attempts | Accepted SHA-256 |','|---|---:|---|',
 ...aar.images.map(i=>'| '+cell(i.story_id)+' | '+i.generation_attempts+' | '+i.sha256+' |'),'',
 '## Corrections','', '| Stage | Issue | Correction |','|---|---|---|',
 ...aar.errors.map(e=>'| '+cell(e.phase)+' | '+cell(e.issue)+' | '+cell(e.correction)+' |'),'',
 '## Evidence and limitations','',
 'Job SHA-256: '+aar.job_sha256+'. Original source: '+aar.original_source_commit_sha+'. Original bundle: '+aar.original_bundle_sha256+'.','',
 'The actual generation start is '+cell(p.generation_started_at)+'; its provenance is '+cell(p.generation_start_source)+'. No precise active native runtime is inferred.','',
 'Visual review path: '+cell(aar.visual_review?.review_path)+'. Real pixel inspection is required; neither workflow success nor screenshot counts imply visual PASS.','',
 ...(aar.notes||[]).flatMap(n=>[cell(n),'']),
 'Owner personal artwork acceptance is not inferred. Preserve all accepted PNG bytes, prior receipts and existing recurrence. Unknown usage never blocks publication.',''
 ].join('\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [jobFile,manifestFile,aarFile]=process.argv.slice(2);
 if(!aarFile)throw Error('usage: render-image-aar.mjs <job.json> <manifest.json> <after-action.json>');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const aar=read(aarFile),markdown=renderImageAar({aar,job:read(jobFile),manifest:read(manifestFile)});
 // Fixed sibling output; producer-authored path never controls arbitrary writes.
 fs.writeFileSync(path.join(path.dirname(aarFile),'after-action.md'),markdown);
}
