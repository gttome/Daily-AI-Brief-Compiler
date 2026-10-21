// Per-cycle, owner-supplied allocation usage. Never derived from GitHub commits,
// model-call counts, an earlier edition, or account billing assumptions.
export function ownerReportedWorkUsage(usage,cycle,edition){
  if(!usage||usage.cycle_date!==cycle||usage.edition_date!==edition)return null;
  const value=usage.work_usage_percent;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)return null;
  // Keep truthful already-published older usage records replayable.
  if(edition<'2026-10-22')return value;
  if(usage.schema_version!=='daily-ai-brief-owner-work-usage-v1'||
     usage.source!=='owner_reported_in_chat'||
     usage.measurement_scope!=='cycle_increment_percent'||
     usage.carry_forward_allowed!==false||
     typeof usage.owner_statement!=='string'||
     usage.owner_statement.trim().length<12||
     usage.report_date!==cycle)
    return null;
  return value;
}
