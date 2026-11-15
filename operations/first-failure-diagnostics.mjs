// Classify only original literal job diagnostics, never broad stage labels.
const cases=[
 ['production_evidence:video_candidate_review_incomplete:', 'PRESEAL_VIDEO_SUBSTANTIVE_REVIEW_INCOMPLETE'],
 ['production_evidence:six_prequalified_substantive_video_candidates_required', 'PRESEAL_VIDEO_POOL_INCOMPLETE'],
 ['SOURCE_READY_BLOCKED: BUNDLE_INVALID_OR_WRONG_EDITION', 'SOURCE_READY_BUNDLE_OR_EDITION_INVALID'],
 ['EDITORIAL_NEAR_DUPLICATE_REQUIRES_RESELECTION', 'EDITORIAL_SKILLS_NEAR_DUPLICATE'],
 ['PRESEAL_ARCHIVE_REPEAT', 'PRESEAL_ARCHIVE_REPEAT'],
 ['PUBLIC_VIDEO_PLAYBACK_UNVERIFIED', 'VIDEO_PLAYBACK_UNVERIFIED']
];
export function reviewOriginalProtectedFailure({edition_date,stage,run_url,original_log_excerpt}={}){
 const validRun=/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+$/.test(run_url||'');
 const match=typeof original_log_excerpt==='string'?
   cases.find(([token])=>original_log_excerpt.includes(token)):null;
 if(!validRun||!match||!/^\d{4}-\d{2}-\d{2}$/.test(edition_date||'')||
   !/^[A-Z][A-Z_]{2,60}$/.test(stage||''))
   return {status:'UNCLASSIFIED',reason:'Original specific error and authentic same-edition run URL are required before labeling a cause.'};
 return {status:'CLASSIFIED_ORIGINAL_DIAGNOSTIC',edition_date,stage,run_url,
   root_cause_code:match[1],evidence_ref:run_url,
   reason:'Original protected job log contains the literal diagnostic "'+match[0]+'". Classification identifies the failed check, not an unverified deeper systemic cause.'};
}
