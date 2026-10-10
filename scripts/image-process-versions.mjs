// Static switches apply only to future optional premium-image jobs. No daily editor dependency.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE=path.resolve(HERE,'../contracts/image-process-versions.json');
export const KNOWN={
 image_release_authority_policy:['legacy_go_v1','bounded_starter_v7'],
 image_starter_contract_version:['rev6','rev7'],
 image_target_capture_policy:['legacy','element24_v1'],
 image_status_sync_mode:['baseline','public_sync_v2'],
 image_verify_only_enabled:[false,true],
 image_additional_first_pass_qc:['baseline','enriched_v1']
};
export const PAIRS=new Set(['legacy_go_v1:rev6','bounded_starter_v7:rev7']);
export function validateImageProcessVersions(value){
 if(value?.schema_version!=='external-image-process-versions-v1')throw Error('invalid_image_process_selector_schema');
 for(const [key,choices] of Object.entries(KNOWN))if(!choices.includes(value[key]))throw Error('invalid_image_process_selector:'+key);
 return Object.freeze({...value});
}
export function readImageProcessVersions(file=DEFAULT_FILE){
 return validateImageProcessVersions(JSON.parse(fs.readFileSync(file,'utf8')));
}
export function imageReleaseCompatibility(versions){
 const v=validateImageProcessVersions(versions);
 const pair=v.image_release_authority_policy+':'+v.image_starter_contract_version;
 return PAIRS.has(pair)?{result:'COMPATIBLE',pair}:{result:'RELEASE_ADMISSION_HOLD',pair,reason:'release_authority_and_starter_version_conflict'};
}
// Historical source and package bytes stay frozen. A reader may inspect old v1
// and additive future receipts without reinterpreting their original assertions.
export function readHistoricalImageEvidence(record,kind){
 const allowed=kind==='source'?['external-compiler-image-job-v1']:
 kind==='package'?['external-compiler-image-package-v1']:
 kind==='release'?['external-compiler-image-release-v1','external-compiler-image-release-v2']:
 kind==='assignment'?['external-compiler-owner-image-release-go-v1','external-compiler-starter-assignment-v7']:null;
 if(!allowed||!record||!allowed.includes(record.schema_version))throw Error('unsupported_immutable_image_evidence:'+kind);
 return structuredClone(record);
}
