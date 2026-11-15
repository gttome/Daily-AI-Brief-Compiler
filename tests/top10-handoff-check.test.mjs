import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {verifyConsumedTop10Report} from '../operations/top10-handoff-check.mjs';
const report={schema_version:'daily-ai-topic-top10-v1',report_date:'2026-11-15',
 target_edition_date:'2026-11-16',timezone:'America/Chicago',topics:[]};
const raw=Buffer.from(JSON.stringify(report));
const hash=crypto.createHash('sha256').update(raw).digest('hex');
const input={schema_version:'daily-ai-topic-top10-input-v1',cycle_date:'2026-11-15',
 edition_date:'2026-11-16',report_date:'2026-11-15',
 source_path:'signals/ai-topic-top10/2026-11-15.json',
 source_commit:'a'.repeat(40),source_blob_sha:'b'.repeat(40),
 report_sha256:hash,report};
const verify=i=>verifyConsumedTop10Report({input:i,cycle:'2026-11-15',edition:'2026-11-16',
 sourcePath:input.source_path,commit:input.source_commit,blob:'b'.repeat(40),raw});
test('consumed report requires exact original Git bytes and matching input snapshot',()=>{
 assert.equal(verify(input).result,'EXACT_GIT_REPORT_VERIFIED');
 assert.ok(verify({...input,report_sha256:'c'.repeat(64)}).reasons.includes('CONSUMED_REPORT_BYTES_OR_BLOB_MISMATCH'));
 assert.ok(verify({...input,report:{...report,topics:[{name:'fabricated'}]}}).reasons.includes('CONSUMED_SNAPSHOT_NOT_EXACT_SOURCE_REPORT'));
 assert.ok(verify({...input,edition_date:'2026-11-15'}).reasons.includes('WRONG_CYCLE_EDITION_OR_CONSUMED_SOURCE'));
});
