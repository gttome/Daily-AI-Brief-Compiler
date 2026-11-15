import test from 'node:test';import assert from 'node:assert/strict';
import {reviewOriginalProtectedFailure} from '../operations/first-failure-diagnostics.mjs';
const x={edition_date:'2026-11-16',stage:'PRESEAL_VIDEO',run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/43662900216'};
test('classifies only actual original protected error, never broad stage',()=>{
 const classified=reviewOriginalProtectedFailure({...x,original_log_excerpt:'production_evidence:video_candidate_review_incomplete:3'});
 assert.equal(classified.root_cause_code,'PRESEAL_VIDEO_SUBSTANTIVE_REVIEW_INCOMPLETE');
 assert.equal(classified.evidence_ref,x.run_url);
 assert.equal(reviewOriginalProtectedFailure({...x,original_log_excerpt:'exit code 1'}).status,'UNCLASSIFIED');
 assert.equal(reviewOriginalProtectedFailure({...x,run_url:'https://example.org/fake',original_log_excerpt:'PRESEAL_ARCHIVE_REPEAT'}).status,'UNCLASSIFIED');
});
