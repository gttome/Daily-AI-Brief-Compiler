import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deriveProtectedPackageReleaseInputs} from '../scripts/derive-protected-image-package-release.mjs';
const date='2026-10-11';
const path='external-image-packages/'+date+'/manifest.json';
const head='a'.repeat(40);
const original=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/manifest.json','utf8'));
const manifest={...original,edition_date:date,expected_pages_history_head:'b'.repeat(40)};
const prs=[{number:345,merged_at:'2026-10-10T21:00:00Z',base:{ref:'main'},merge_commit_sha:head,head:{sha:'c'.repeat(40)}}];
const paths=[path,'external-image-packages/'+date+'/starter-assignment.json',
 'external-image-packages/'+date+'/images/oct11-a1-skill.png',
 'external-image-packages/'+date+'/reviews/quality-check.json'];
const args={headSha:head,mainSha:head,changedPaths:paths,manifestPath:path,manifest,associatedPulls:prs};
test('derive protected future image release: only exact one date and merged PR/CI head',()=>{
 const o=deriveProtectedPackageReleaseInputs(args);
 assert.deepEqual(o,{TARGET_DATE:date,PACKAGE_PR:'345',PACKAGE_PR_HEAD:'c'.repeat(40),
   PACKAGE_MERGE_HEAD:head,HISTORY_HEAD:'b'.repeat(40)});
});
test('single-proposal release cannot mix another edition, code, duplicate manifest or old release',()=>{
 const failures=[
  {...args,mainSha:'0'.repeat(40)},
  {...args,changedPaths:[...paths,'external-image-packages/2026-10-12/manifest.json']},
  {...args,changedPaths:[...paths,'scripts/prepare-external-image-replacement.mjs']},
  {...args,changedPaths:[...paths,'external-image-packages/2026-10-12/reviews/x.json']},
  {...args,changedPaths:[...paths,path]},
  {...args,manifest:{...manifest,images:manifest.images.slice(0,5)}},
  {...args,manifest:{...manifest,expected_pages_history_head:'bad'}},
  {...args,associatedPulls:[]},
  {...args,associatedPulls:[{...prs[0],merge_commit_sha:'0'.repeat(40)}]},
  {...args,associatedPulls:[...prs,prs[0]]}
 ];
 for(const f of failures)assert.throws(()=>deriveProtectedPackageReleaseInputs(f),/protected_image_auto_release/);
 assert.throws(()=>deriveProtectedPackageReleaseInputs({...args,
   manifestPath:'external-image-packages/2026-10-08/manifest.json',
   changedPaths:['external-image-packages/2026-10-08/manifest.json']}),/protected_image_auto_release/);
});
test('automatic release still requires exact matching completed-pr and source history hash',()=>{
 const bad={...args,associatedPulls:[{...prs[0],base:{ref:'other'}}]};
 assert.throws(()=>deriveProtectedPackageReleaseInputs(bad),/exact_merged_protected_pr_required/);
 const good={...args};
 assert.equal(deriveProtectedPackageReleaseInputs(good).HISTORY_HEAD,manifest.expected_pages_history_head);
});
