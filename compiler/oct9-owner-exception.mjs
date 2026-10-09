// This is a *single named* owner-authorized October 9 publication exception.
// It never qualifies unattended Release 1, changes an old execution, or applies to October 10+.
// No native image-generation lane, scheduler, or image-review acceptance is enabled.
export const OCT9_RECOVERY_BRANCH = 'shadow/2026-10-09-owner-placeholder-20261009';
export const OCT9_FAILED_BRANCH = 'shadow/2026-10-09';
export const OCT9_FAILED_HEAD = '246c04d1c9761c4bb9164ce34b63833fa277dc49';
export const OCT9_FAILED_EXECUTION = 'daily-compiler-shadow-2026-10-09-validation-r1';
export const OCT9_ORIGINAL_EDITORIAL_BLOB = '39489270a150dde168f43348ebce99d8a535e61f';
export const OCT9_EXCEPTION_VERSION = 'daily-compiler-oct9-owner-placeholder-exception-v1';

export function isAuthorizedOct9Recovery({state,bundle}={}) {
  const x=state?.one_time_recovery;
  const p=bundle?.producer_receipt;
  return state?.edition_date === '2026-10-09' &&
    bundle?.edition_date === '2026-10-09' &&
    state.branch === OCT9_RECOVERY_BRANCH &&
    state.execution_id === 'daily-compiler-oct9-owner-placeholder-recovery-r1' &&
    x?.schema_version === OCT9_EXCEPTION_VERSION &&
    x.owner_authorized === true &&
    x.owner_authorization_scope === 'publish_oct9_placeholders_and_provide_external_work_handoff_only' &&
    x.historical_branch === OCT9_FAILED_BRANCH &&
    x.historical_commit_sha === OCT9_FAILED_HEAD &&
    x.historical_execution_id === OCT9_FAILED_EXECUTION &&
    x.historical_terminal_state === 'SHADOW_FAILED' &&
    x.historical_retryable === false &&
    x.historical_accepted_images === 0 &&
    x.historical_editorial_blob_sha === OCT9_ORIGINAL_EDITORIAL_BLOB &&
    x.normal_schedule_unchanged === true &&
    x.not_an_unattended_release_one_proof === true &&
    x.image_generation_disabled === true &&
    p?.owner_intervention === true &&
    p?.work_used === false &&
    p?.codex_used === false &&
    p?.paid_model_api_used === false &&
    p?.accepted_image_regenerations === 0 &&
    p?.exception_contract === OCT9_EXCEPTION_VERSION &&
    p?.scheduled_execution === false &&
    p?.historical_failed_execution_reopened === false &&
    bundle.image_representation?.status === 'images_pending' &&
    state.images?.mode === 'images_pending' &&
    Array.isArray(state.images.accepted) &&
    state.images.accepted.length === 0;
}

export function allowedPendingEditionBranch({state,bundle}={}) {
  return Boolean(state?.branch === 'shadow/'+bundle?.edition_date || isAuthorizedOct9Recovery({state,bundle}));
}
