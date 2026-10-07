export function buildDashboardSnapshot({
  generatedAt=new Date().toISOString(),
  system,
  currentRun=null,
  recentRuns=[],
  resourceHealth=[],
  futureBriefQueue=[],
  corrections=[],
  usage={},
  risks=[],
  nextActions=[]
}={}){
  if(!system||typeof system!=='object') throw new Error('dashboard_system_required');
  return {
    schema_version:'daily-compiler-dashboard-snapshot-v1',
    generated_at:generatedAt,
    system,
    current_run:currentRun,
    recent_runs:recentRuns,
    resource_health:resourceHealth,
    future_brief_queue:futureBriefQueue,
    corrections,
    usage,
    risks,
    next_actions:nextActions
  };
}
