// Prospective scientific-paper discovery cadence. Advisory only: never changes release gates.
// Missing historical evidence is unknown, not a claim that no papers were published.
import {validateResourceRegistry} from './resources.mjs';

export const SCIENTIFIC_PAPER_WINDOW=7;
const paperIds=new Set(['acl-anthology','arxiv-cs-ai','arxiv-cs-cl','arxiv-cs-lg',
  'openreview','iclr','icml','neurips','hugging-face-daily-papers']);
const date=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const originalPaperUrl=s=>{
  if(!https(s))return false;
  const u=new URL(s),h=u.hostname.replace(/^www\./,'').toLowerCase(),p=u.pathname;
  return (h==='arxiv.org'&&/^\/(abs|pdf)\/[^/]+/.test(p))||
    (h==='aclanthology.org'&&/^\/\d/.test(p))||
    (h==='openreview.net'&&p==='/forum'&&u.searchParams.has('id'))||
    (h==='proceedings.mlr.press'&&/^\/v/.test(p))||
    (h==='proceedings.neurips.cc'&&/^\/paper\//.test(p))||
    (h==='doi.org'&&/^\/10\./.test(p))||
    (h==='dl.acm.org'&&/^\/doi\//.test(p))||
    (h==='ieeexplore.ieee.org'&&/^\/document\//.test(p))||
    (h==='nature.com'&&/^\/articles\//.test(p))||
    (h==='science.org'&&/^\/doi\//.test(p))||
    (h==='link.springer.com'&&/^\/article\//.test(p))||
    (h==='sciencedirect.com'&&/^\/science\/article\//.test(p));
};
const assert=(condition,code)=>{if(!condition)throw Error('SCIENTIFIC_PAPER_CADENCE_'+code);};

// These receipts must be produced from genuine current/prior article reading, never from metadata-only
// search or inferred historical publisher mentions. A verified *empty* selection is valid only if the
// compiler actually reviewed the sealed edition; we cannot prove that truth from a JSON assertion.
export function validateScientificPaperEditionReceipt(receipt,{editionDate,bundle=null}={}){
  assert(date(editionDate)&&receipt?.schema_version==='daily-scientific-paper-coverage-v1'&&
    receipt.edition_date===editionDate,'WRONG_EDITION');
  assert(receipt.review_status==='VERIFIED'||receipt.review_status==='INCOMPLETE','BAD_STATUS');
  assert(Array.isArray(receipt.published_papers),'PAPERS_REQUIRED');
  const seen=new Set(),stories=Array.isArray(bundle?.stories)&&bundle.edition_date===editionDate?bundle.stories:null;
  for(const p of receipt.published_papers){
    assert(p&&typeof p.story_id==='string'&&p.story_id.trim()&&!seen.has(p.story_id)&&
      typeof p.title==='string'&&p.title.trim().length>=8&&originalPaperUrl(p.original_paper_url)&&
      ['PREPRINT','PEER_REVIEWED'].includes(p.publication_status)&&
      typeof p.research_limitations==='string'&&p.research_limitations.trim().length>=30&&
      ['FULL_PAPER','METHODS_AND_RESULTS'].includes(p.review_scope)&&
      (!stories||stories.some(s=>s.id===p.story_id)),'UNVERIFIED_SELECTED_PAPER');
    // arXiv alone cannot support a claim of peer review.
    if(new URL(p.original_paper_url).hostname.replace(/^www\./,'')==='arxiv.org')
      assert(p.publication_status==='PREPRINT','ARXIV_IS_NOT_PEER_REVIEW');
    seen.add(p.story_id);
  }
  if(receipt.review_status==='INCOMPLETE')assert(receipt.published_papers.length===0,'INCOMPLETE_WITH_CLAIM');
  return {result:receipt.review_status,selected_paper_count:receipt.review_status==='VERIFIED'?
    receipt.published_papers.length:null,selected_story_ids:[...seen],
    caveat:'Structural receipt only; original full-paper reading and published paper links require independent evidence.'};
}

export function buildScientificPaperCadence({editionDate,registry,recentCoverage=[]}){
  assert(date(editionDate)&&!validateResourceRegistry(registry).length&&Array.isArray(recentCoverage),'INVALID_INPUT');
  const priorDates=Array.from({length:SCIENTIFIC_PAPER_WINDOW},(_,i)=>shift(editionDate,-i-1));
  const entries=new Map();
  for(const receipt of recentCoverage){
    if(!receipt||!priorDates.includes(receipt.edition_date))continue;
    assert(!entries.has(receipt.edition_date),'DUPLICATE_EDITION');
    validateScientificPaperEditionReceipt(receipt,{editionDate:receipt.edition_date});
    entries.set(receipt.edition_date,receipt);
  }
  const confirmed=[...entries.values()].filter(x=>x.review_status==='VERIFIED');
  const known=confirmed.reduce((n,x)=>n+x.published_papers.length,0);
  const full=confirmed.length===SCIENTIFIC_PAPER_WINDOW;
  const sourceIds=registry.resources.filter(x=>x.enabled&&x.content_types.includes('article')&&
    paperIds.has(x.resource_id)).map(x=>({resource_id:x.resource_id,url:x.url}));
  return {schema_version:'daily-scientific-paper-cadence-plan-v1',edition_date:editionDate,
    recent_edition_dates:priorDates,window_editions:SCIENTIFIC_PAPER_WINDOW,
    target_paper_led_stories:1,verified_edition_receipts:confirmed.length,
    unverified_edition_dates:priorDates.filter(d=>!entries.has(d)||entries.get(d).review_status!=='VERIFIED'),
    known_paper_led_stories:known,prior_target_status:known>=1?'MET':
      full?'NOT_MET':'UNKNOWN_HISTORY_INCOMPLETE',
    paper_review_priority:known>=1?'NORMAL':'PRIORITY',
    eligible_discovery_sources:sourceIds,
    selection_rule:'Seek one genuinely qualifying original-paper-led story within every rolling seven editions. Record real methods, sample, limitations, venue and original paper link. Distinguish preprint from peer review. Never force an unqualified or stale paper, change 2/2/2, or bypass freshness/novelty/protected gates.',
    nonblocking:true,
    evidence_caveat:'Verified means reported in explicit edition receipts; neither source discovery nor this planner proves a published paper or independent peer-review status.'};
}
