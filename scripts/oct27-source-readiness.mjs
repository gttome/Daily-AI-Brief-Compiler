// Forward-only, evidence-honest October 27 source expansion AAR action plan.
// Reporting never validates external HTTP/playback by itself, changes a registry,
// requests paid services, blocks public publishing or creates new AI schedules.
export const SOURCE_AAR_DATE='2026-10-27';
export const SOURCE_NEXT_EDITION='2026-10-28';
export const SOURCE_DEADLINE='2026-10-27 19:15 America/Chicago';
const TASKS=[
 {id:'SOURCE-01',title:'Inspect real October 27 source-coverage receipts',
  acceptance:'Read actual run-bound route and editorial receipts; record 208 registered IDs, 94 enabled route attempts, 83 editorial source checks, blocked/skipped IDs and source yield. Verify with the protected standalone coverage validators. Never convert an unobserved HTTP request or item into PASS.'},
 {id:'SOURCE-02',title:'Qualify the previously disabled source portfolio',
  acceptance:'Individually examine all 114 disabled source records, keep a source-by-source disposition (verified current route and original dated item, duplicate/publisher alias, stale or unsupported, or still pending). Do not indiscriminately enable old links or generic platform indexes.'},
 {id:'SOURCE-03',title:'Enable only currently qualified, nonduplicate sources',
  acceptance:'For each qualified candidate, verify first-party original item identity and publisher/show ownership; ensure media playback and AI-content admission are checked at item-selection time. Preserve every existing resource ID, accepted edition and editorial selection rule.'},
 {id:'SOURCE-04',title:'Merge source-only changes under protected main',
  acceptance:'Reconcile source candidate changes against fresh main, apply only new safe registry roles/statuses and source-only tests, require exact-head protected CI, permitted merge and independent GitHub readback. No changes to images, schedules, Watchlist, historical editions, paid APIs or publishing workflows.'},
 {id:'SOURCE-05',title:'Verify October 28 source-discovery readiness',
  acceptance:'Before the existing October 27 19:15 CT Compiler start for the October 28 edition, confirm its unchanged task and full-registry instructions, enumerate every enabled source, verify complete source-coverage results or list truthful exceptions, and preserve the 21:15 image handoff.'}
];
export const OCT28_SOURCE_ACTIONS=Object.freeze(TASKS.map(t=>Object.freeze(t)));
const iso=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))&&/^\d{4}-\d{2}-\d{2}T/.test(t);
const dated=(o,date)=>o&&typeof o==='object'&&o.edition_date===date&&
 typeof o.execution_id==='string'&&o.execution_id.length>0;
const metric=(o,key)=>Number.isSafeInteger(o?.counts?.[key])?o.counts[key]:null;
// IMPORTANT: these are source-reported numbers, NOT independently verified
// pass flags. Standalone validators with the bound registry must check the receipts.
export function oct27SourceReadiness(edition,{routeCoverage=null,itemCensus=null,qualifications=null}={}){
 if(edition!==SOURCE_AAR_DATE)return null;
 const routes=dated(routeCoverage,edition)?routeCoverage:null;
 const items=dated(itemCensus,edition)?itemCensus:null;
 const attemptedRoutes=metric(routes,'attempted');
 const attemptedEditorial=metric(items,'attempted');
 const gaps=Array.isArray(routes?.resources)?routes.resources
  .filter(x=>x.enabled&&x.status==='NOT_CHECKED').map(x=>x.resource_id):null;
 const unvisited=Array.isArray(items?.resources)?items.resources
  .filter(x=>x.outcome==='NOT_VISITED').map(x=>x.resource_id):null;
 const q=dated(qualifications,edition)?qualifications:null;
 const independentlyQualified=Array.isArray(q?.verified_source_ids)?q.verified_source_ids.length:null;
 return {
  schema_version:'oct27-to-oct28-source-readiness-aar-v1',
  edition_date:edition,target_edition:SOURCE_NEXT_EDITION,
  must_complete_before:SOURCE_DEADLINE,
  baseline:{registered:208,enabled:94,disabled:114,article_enabled:56,video_enabled:6,podcast_enabled:21,editorial_role_sources:83},
  recorded_route_attempts:attemptedRoutes,
  recorded_editorial_source_visits:attemptedEditorial,
  recorded_route_reachable:metric(routes,'reachable'),
  recorded_route_blocked:metric(routes,'blocked'),
  recorded_route_failures:metric(routes,'failures'),
  recorded_editorial_candidate_sources:metric(items,'candidates_found'),
  unchecked_route_ids:gaps,
  unvisited_editorial_source_ids:unvisited,
  disabled_source_dispositions_reported:Number.isSafeInteger(q?.reviewed_disabled_count)?q.reviewed_disabled_count:null,
  independently_qualified_source_count:independentlyQualified,
  route_receipt_attached:!!routes,
  editorial_receipt_attached:!!items,
  qualification_receipt_attached:!!q,
  evidence_verified:'NOT_INDEPENDENTLY_VERIFIED_BY_AAR_GENERATOR',
  implementation_verified:false,
  readiness:'NOT_VERIFIED',
  readiness_reason:'Complete real retrieval, 114 disabled source dispositions, protected integration and a fresh next-run check are not established by a registry, an AAR template, or unit tests.',
  actions:TASKS.map(task=>({...task,status:'OPEN_UNTIL_REAL_EVIDENCE'}))
 };
}
export function renderOct27SourceSection(report){
 if(!report)return '';
 const p=value=>value===null||value===undefined?'NOT OBSERVED':String(value);
 const rows=[
 ['Registered source inventory',p(report.baseline.registered)],
 ['Enabled sources / intended public-route checks',p(report.baseline.enabled)],
 ['Recorded route attempts (requires independent validation)',p(report.recorded_route_attempts)],
 ['Editorial sources eligible for original item review',p(report.baseline.editorial_role_sources)],
 ['Recorded actual editorial source visits (requires independent validation)',p(report.recorded_editorial_source_visits)],
 ['Disabled records requiring qualification review',p(report.baseline.disabled)],
 ['Reviewed disabled source dispositions',p(report.disabled_source_dispositions_reported)],
 ['Verified next-edition readiness',report.readiness]
 ];
 return ['## Required October 27 AAR improvement: Full source qualification before October 28',
 '',
 '**Owner-approved deadline:** '+report.must_complete_before+'. **Next edition:** '+report.target_edition+'.',
 '',
 'These actions are mandatory AAR follow-ups; the AAR does not claim that any source was successfully checked or qualified without live independent evidence.',
 '',
 '| Item | Evidence / status |','|---|---|',
 ...rows.map(([k,v])=>'| '+k+' | '+v+' |'),'',
 '### Five required actions before the October 28 run','',
 ...report.actions.map(a=>'- **'+a.id+' — '+a.title+'** ('+a.status+'). '+a.acceptance),
 '',
 '**Unresolved route IDs:** '+(report.unchecked_route_ids?.length?report.unchecked_route_ids.join(', '):'NOT REPORTED OR NONE VERIFIED')+'.',
 '',
 '**Unvisited Article/Video/Podcast IDs:** '+(report.unvisited_editorial_source_ids?.length?report.unvisited_editorial_source_ids.join(', '):'NOT REPORTED OR NONE VERIFIED')+'.',
 '',
 '**Readiness verdict:** '+report.readiness+'; evidence classification: '+report.evidence_verified+'. This AAR section is an obligation register, not proof of next-cycle implementation.',
 ''].join('\n');
}
