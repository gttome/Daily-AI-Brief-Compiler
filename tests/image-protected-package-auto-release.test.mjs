import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readImageProcessVersions} from '../scripts/image-process-versions.mjs';
import {REQUIRED_OPERATIONS,evaluateImageAppPreflight} from '../scripts/preflight-image-app-route.mjs';
const file='.github/workflows/external-image-only-replacement.yml';
const yaml=fs.readFileSync(file,'utf8');
const job=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/source/job.json','utf8'));
const v=readImageProcessVersions();
const capability=k=>({available:true,authorized:true,evidence_ref:'verified-'+k,method:'connector_bounded'});
function capabilities(){return Object.fromEntries(REQUIRED_OPERATIONS.map(k=>[k,capability(k)]));}

test('protected six-image package merge starts existing release, preserving manual fallback and zero schedules',()=>{
 assert.match(yaml,/on:\n[\s\S]{0,370}push:\n\s+branches: \[main\]/);
 assert.match(yaml,/external-image-packages\/\*\*\/manifest\.json/);
 assert.match(yaml,/workflow_dispatch:/);
 assert.doesNotMatch(yaml,/\n[ \t]+schedule:/);
 for(const expected of [
   'git diff --name-only "$GITHUB_SHA^1" "$GITHUB_SHA"',
   'test "${#manifests[@]}" -eq 1',
   'test "${#changed[@]}" -gt 0',
   'Cross-edition or unrelated package change',
   'Unexpected image package path',
   'exactly_one_merged_pr_required',
   'PROTECTED_SINGLE_EDITION_PACKAGE_MERGE_AUTO_ROUTE_READY',
   'rulesets/24610983','event=pull_request','compiler-validation',
   'check-external-image-release-gates.mjs','stage-external-image-package.mjs',
   'verify-external-image-original-live.mjs','prepare-external-image-replacement.mjs',
   'verify-external-image-live.mjs','finalize-external-image-release.mjs',
   'image_status_sync_mode','deploy-pages@v4',
   'group: daily-compiler-pages-deploy'
 ])assert.ok(yaml.includes(expected),expected);
 const derive=yaml.indexOf('Derive exact image-package release inputs from protected merge');
 const validate=yaml.indexOf('Require protected exact-head PR/CI and active no-bypass ruleset');
 const deployment=yaml.indexOf('uses: actions/deploy-pages@v4');
 assert.ok(derive>0&&validate>derive&&deployment>validate);
});
test('pre-generation admission permits proven protected merge instead of missing manual dispatch',()=>{
 const c=capabilities();
 c.existing_workflow_dispatch={available:false,authorized:false,evidence_ref:'',method:''};
 assert.equal(evaluateImageAppPreflight({capabilities:c,versions:v,job}).result,'BLOCKED_INCOMPLETE');
 c.protected_main_package_merge_auto_release={
  available:true,authorized:true,
  evidence_ref:'protected-CI-and-reviewed-source-.github/workflows/external-image-only-replacement.yml',
  method:'protected_merged_package_manifest',workflow_path:file
 };
 const result=evaluateImageAppPreflight({capabilities:c,versions:v,job});
 assert.equal(result.result,'CAPABILITY_ROUTE_PROVEN');
 assert.equal(result.release_start_mode,'protected_package_merge');
 assert.equal(result.creative_attempts_consumed,0);
 assert.equal(result.production_dispatch_not_inferred,true);
});
test('future auto-route cannot pass without binary, desktop/mobile or verified workflow evidence',()=>{
 const c=capabilities();
 c.existing_workflow_dispatch={available:false,authorized:false};
 c.protected_main_package_merge_auto_release={available:true,authorized:true,method:'invented',workflow_path:file,evidence_ref:'made-up'};
 assert.equal(evaluateImageAppPreflight({capabilities:c,versions:v,job}).result,'BLOCKED_INCOMPLETE');
 c.protected_main_package_merge_auto_release.method='protected_merged_package_manifest';
 c.protected_main_package_merge_auto_release.evidence_ref='reviewed-workflow-and-protected-pr-ci';
 c.github_authenticated_binary_upload={available:false};
 assert.ok(evaluateImageAppPreflight({capabilities:c,versions:v,job}).blockers.includes('capability_unproven:github_authenticated_binary_upload'));
 c.github_authenticated_binary_upload=capability('github_authenticated_binary_upload');
 c.mobile_image_region_capture={available:false};
 assert.ok(evaluateImageAppPreflight({capabilities:c,versions:v,job}).blockers.includes('capability_unproven:mobile_image_region_capture'));
});
test('selected Rev7 docs specify protected merge auto-release, no second GO, no schedules',()=>{
 const starter=fs.readFileSync('docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV7.md','utf8');
 const full=fs.readFileSync('docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md','utf8');
 const handoff=fs.readFileSync('EXTERNAL_APP_HANDOFF_REV7.md','utf8');
 for(const text of [starter,full,handoff]){
   assert.match(text,/protected.*(?:package|image).*merge|protected-main merge|package-merge/i);
   assert.match(text,/manual/);
   assert.match(text,/BLOCKED_INCOMPLETE/);
 }
 assert.match(full,/No second custom manual image-release GO/);
 assert.match(starter,/do not demand a separate custom manual image-release GO/i);
});
