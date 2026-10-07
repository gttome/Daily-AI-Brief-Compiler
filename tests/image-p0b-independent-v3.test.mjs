import test from 'node:test';
import assert from 'node:assert/strict';
import {promoteTransportPreflightToP0B,validateP0B,validateTransportPreflight} from '../image-capsules/p0b-proof.mjs';

const transport={
 schema_version:'daily-compiler-d0-transport-preflight-v1',
 proof_id:'d0-transport-only-2026-10-07-r1',
 scope:'TRANSPORT_ONLY_NOT_CAPSULE_OR_P0_PROOF',
 generated_by:'chatgpt_native_images',
 native_generated_file_id:'file_native',
 same_assistant_invocation:true,
 bridge:{kind:'connected_google_drive_ephemeral_file_shuttle',preconnected:true,owner_approval_required:false,drive_file_id:'drive1',drive_file_deleted_after_persistence:true},
 raw_identity:{bytes:1111336,sha256:'a'.repeat(64),git_blob_sha:'b'.repeat(40),github_path:'proof/raw.png',github_commit_sha:'c'.repeat(40),source_vs_drive_byte_identity:'PASS',drive_vs_git_blob_identity:'PASS',github_blob_readback_sha:'b'.repeat(40)},
 boundaries:{proves_native_image_to_file_handoff:true,proves_exact_byte_persistence:true,proves_clean_fresh_capsule:false,formal_p0_a:false,formal_p0_b:false,work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false}
};

test('P0-B can promote exact same-invocation byte transport independently of P0-A',()=>{
 assert.deepEqual(validateTransportPreflight(transport),[]);
 const p0b=promoteTransportPreflightToP0B(transport);
 assert.equal(p0b.result,'PASS');
 assert.equal(p0b.p0_a_dependency,false);
 assert.equal(p0b.activation_still_requires_p0_a,true);
 assert.equal(p0b.native_generations_added_for_promotion,0);
 assert.deepEqual(validateP0B(p0b),[]);
});

test('P0-B rejects missing exact byte readback',()=>{
 const bad=structuredClone(transport);
 bad.raw_identity.drive_vs_git_blob_identity='FAIL';
 assert.ok(validateTransportPreflight(bad).includes('byte_identity_not_proven'));
 assert.throws(()=>promoteTransportPreflightToP0B(bad),/byte_identity_not_proven/);
});

test('P0-B rejects paid or owner-transfer evidence',()=>{
 const bad=structuredClone(transport);
 bad.boundaries.owner_image_transfer_used=true;
 assert.ok(validateTransportPreflight(bad).includes('zero_cost_boundary'));
});
