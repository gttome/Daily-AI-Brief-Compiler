// Proposed single-job exception. An explicit owner decision is required.
// This admits only the already reviewed October 10 image package; it does not
// certify unattended scheduling, alter the frozen job/bundle, or apply later.
export const OCT10_IMAGE_EXCEPTION = Object.freeze({
  edition_date:'2026-10-10',
  execution_id:'daily-compiler-shadow-2026-10-10',
  source_branch:'shadow/2026-10-10',
  source_commit_sha:'2482a644d6d5f9a1ee5e1e4f05bbe53c76104da7',
  bundle_sha256:'85c8575ddd03e0077e25a710b5159d04140bc632a14533827f7dda8d75957872',
  job_sha256:'15301d33191ad1e04eb8bba0ce9f40a5ac53809bdcc363f1647bce5f97b2749e',
  manifest_sha256:'e0e6afb94a4e942c77b956fb1d6932f13cacd73b0f6cdb513f3512d7f7c6d15f',
  pages_history_head:'aa56456a16475a078c7b01eea7ffe686c4ecc171',
  accepted_package_commit:'270939b2cfcbad4d6ca6b2df650fb50275b8f8b8'
});

export function isAuthorizedOct10ImageException({job,jobSha256,manifestSha256,approval}){
  const x=OCT10_IMAGE_EXCEPTION;
  return job?.edition_date===x.edition_date && job.execution_id===x.execution_id &&
    job.source?.branch===x.source_branch && job.source.commit_sha===x.source_commit_sha &&
    job.source.bundle_sha256===x.bundle_sha256 && jobSha256===x.job_sha256 &&
    manifestSha256===x.manifest_sha256 &&
    approval?.expected_pages_history_head===x.pages_history_head &&
    approval.approved_package_commit_sha===x.accepted_package_commit &&
    approval.oct10_existing_continued_publication_verified===true &&
    approval.oct10_continued_publication_owner_accepted===true &&
    approval.oct10_image_only_exception_owner_authorized===true &&
    approval.release1_genuine_scheduled_placeholder_verified===false &&
    approval.release1_owner_acceptance_recorded===false &&
    approval.unattended_release1_acceptance_claimed===false;
}
