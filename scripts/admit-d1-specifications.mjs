#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {admitD1Specifications,compileD1StoryPrompt} from '../image-studio/spec-admission.mjs';

const [requestPath,evidencePath,receiptPath,storyId,promptPath] = process.argv.slice(2);
if (!requestPath || !evidencePath || !receiptPath || Boolean(storyId) !== Boolean(promptPath)) throw new Error('usage: node scripts/admit-d1-specifications.mjs request.json source-evidence.json receipt.json [story-id prompt.txt]');
const inputs = [requestPath,evidencePath].map(value => path.resolve(value));
const outputs = [receiptPath,promptPath,...(promptPath?[promptPath+'.review.txt',promptPath+'.correction-policy.txt',promptPath+'.bindings.json']:[])].filter(Boolean).map(value => path.resolve(value));
if (outputs.some(value => inputs.includes(value)) || new Set(outputs).size !== outputs.length) throw new Error('admission_output_must_not_overwrite_inputs');
if (outputs.some(value => fs.existsSync(value))) throw new Error('admission_output_already_exists');
const request = JSON.parse(fs.readFileSync(requestPath,'utf8'));
const sourceEvidence = JSON.parse(fs.readFileSync(evidencePath,'utf8'));
const receipt = admitD1Specifications(request,sourceEvidence);
// Compile only after all six pass; a rejection writes evidence but no story prompt.
const compiled = receipt.result === 'PASS' && storyId ? compileD1StoryPrompt(request,sourceEvidence,storyId) : null;
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
if (compiled) {
  fs.writeFileSync(promptPath,compiled.prompt,{flag:'wx'});
  if(compiled.review_prompt){
    fs.writeFileSync(promptPath+'.review.txt',compiled.review_prompt,{flag:'wx'});
    fs.writeFileSync(promptPath+'.correction-policy.txt',compiled.correction_policy,{flag:'wx'});
    fs.writeFileSync(promptPath+'.bindings.json',JSON.stringify({schema_version:'daily-compiler-d1-projections-v2',recipe_profile:receipt.recipe_profile,prompt_sha256:compiled.prompt_sha256,review_prompt_sha256:compiled.review_prompt_sha256,correction_policy_sha256:compiled.correction_policy_sha256,criteria_sha256:compiled.criteria_sha256},null,2)+'\n',{flag:'wx'});
  }
}
console.log(JSON.stringify({result:receipt.result,gate:receipt.gate,errors:receipt.errors,receipt_path:receiptPath,prompt_written:Boolean(compiled),quality_attempts_consumed:0,story_chats_opened:0}));
if (receipt.result !== 'PASS') process.exitCode = 1;
