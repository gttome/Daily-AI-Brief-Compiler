// Forward-only, zero-API editorial value re-use audit. History is the already
// published canonical archive; a distinct publisher or source is not novel teaching.
export const EDITORIAL_NOVELTY_EFFECTIVE='2026-10-27';
const DATE=/^20\d\d-\d\d-\d\d$/;
const STOP=new Set(('about after again agent agents ai also among and are around based before between '+
 'brief business can case claims coding context data development different does each '+
 'from have into latest makes model models more new only other people platform '+
 'previous provides published reports reusable same should source sources than '+
 'that their these this through tools used users using what when where while with '+
 'workflow workflows work').split(' '));
const norm=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const meaningfulTokens=v=>new Set(norm(v).split(' ').filter(x=>x.length>3&&!STOP.has(x)));
const storyText=s=>[s.headline,s.summary,s.why_it_matters].filter(Boolean).join(' ');
function similarity(a,b){
  const first=meaningfulTokens(a),second=meaningfulTokens(b);
  const common=[...first].filter(x=>second.has(x));
  return {shared:common.length,score:first.size&&second.size?
    Math.round(1000*2*common.length/(first.size+second.size))/1000:0};
}

/**
 * A deliberately narrow, high-confidence *instructional-value* signature:
 * generic create/package -> inspect/test -> reuse a Skill/workflow.
 * Domain-specific Skills, or reporting on Skills governance, are not
 * automatically treated as repeats. Independent editorial review is still
 * required for all subject areas; this detector cannot judge every theme.
 */
export function isRecurringSkillAuthoringLesson(story){
  const head=norm(story?.headline),all=norm(storyText(story||{}));
  return /\bskills?\b/.test(head)&&
    (/\b(?:reusable|skill authoring|skill author|skill builder)\b/.test(head)||
      /\bskills?\b.{0,60}\b(?:work procedure|workflow|procedures|business process)\b/.test(head)||
      /\bworkflow\b.{0,65}\bskills?\b/.test(head))&&
    /\b(?:author(?:s|ing|ed)?|creat(?:e|es|ed|ing|ion)|generat(?:e|es|ed|ing)|draft(?:s|ing|ed)?|packag(?:e|es|ed|ing)|turns?|builds?|built)\b/.test(all)&&
    /\b(?:test(?:s|ed|ing|able)?|review(?:s|ed|ing|able)?|inspect(?:s|ed|ing|ion)?|validat(?:e|es|ed|ing|ion)|approv(?:e|al)|version(?:s|ed|ing)?)\b/.test(all)&&
    /\b(?:workflows?|process(?:es)?|procedures?|instructions?|templates?|files?|routines?|business|tasks?)\b/.test(all);
}

/**
 * Compare all six proposed reader outcomes to previous published edition
 * summaries. Machine hard stops are limited to unmistakable copy/paraphrase
 * or three-in-a-week generic Skill-authoring explanations. Other topical
 * matches are inspectable research leads, NOT a claim of semantic certainty.
 */

// A title can omit "Skill" while its reader outcome still repeats a recent
// generic Skill packaging/review lesson. This is a narrow prospective signal
// for the editorial reviewer, not an automated determination of semantics.
export function skillProcedureEvidence(story){
 const combined=norm([story?.headline,story?.summary,story?.why_it_matters,
   story?.agent_skills_evidence,story?.related_coverage,
   story?.audience_fit?.practical_action,story?.audience_fit?.usable_outcome].join(' '));
 const isSkill=story?.agent_skills===true||/\bskills?\b/.test(combined);
 const builds=/\b(?:author|create|generate|draft|package|build|format|turn)\w*\b/.test(combined);
 const reviews=/\b(?:review|test|inspect|validate|approve)\w*\b/.test(combined);
 const repeatable=/\b(?:reusable|repeatable|reuse|workflow|procedure|instructions|routine)\b/.test(combined);
 const practical=[story?.audience_fit?.practical_action,story?.audience_fit?.usable_outcome]
   .filter(Boolean).join(' ');
 const generic=new Set(('skill skills agent agents routine reusable reuse workflow workflows work '+
   'procedure procedures test tests testing review reviews reviewing create creating '+
   'package packaging build building generated generate using use instructions document '+
   'file files output outputs prompt prompts approve approval process task tasks').split(' '));
 const specific=[...meaningfulTokens(practical)].filter(x=>!generic.has(x));
 return {procedural_skill:isSkill&&builds&&reviews&&repeatable,
   reader_task_evidence:practical||null,
   task_specific_tokens:specific.slice(0,12),
   concrete_task_evidenced:specific.length>=3,
   primary_source_url:story?.source?.url??null};
}

export function findEditorialValueOverlap({bundle,archive,priorEditionDates}){
  const date=bundle?.edition_date;
  if(!DATE.test(date||'')||!Array.isArray(bundle?.stories)||bundle.stories.length!==6)
    throw new Error('EDITORIAL_NOVELTY_INVALID_SOURCE: six dated proposed articles required');
  if(!Array.isArray(priorEditionDates)||priorEditionDates.length===0||
     priorEditionDates.some(d=>!DATE.test(d)||d>=date))
    throw new Error('EDITORIAL_NOVELTY_HISTORY_REQUIRED: prior published edition dates');
  if(!Array.isArray(archive?.stories))
    throw new Error('EDITORIAL_NOVELTY_HISTORY_REQUIRED: canonical archive-index.json');
  const selectedDates=priorEditionDates.slice(0,7),dates=new Set(selectedDates);
  const prior=archive.stories.filter(x=>
    x.content_type==='Article'&&dates.has(x.brief_date)&&
    typeof x.headline==='string'&&typeof x.summary==='string'&&
    typeof x.url==='string'&&x.url.startsWith('/stories/'));
  if(prior.length===0)throw new Error('EDITORIAL_NOVELTY_HISTORY_REQUIRED: complete published article history');
  const violations=[],review_candidates=[];
  for(const [i,story] of bundle.stories.entries()){
    const related=prior.map(old=>{
      const match=similarity(storyText(story),storyText(old));
      return {prior_date:old.brief_date,prior_title:old.headline,
        prior_page:old.url,similarity:match.score,shared_terms:match.shared,
        recurring_skill_lesson:isRecurringSkillAuthoringLesson(old)};
    }).sort((a,b)=>b.similarity-a.similarity||b.prior_date.localeCompare(a.prior_date));
    const uniqueSkillDates=new Map();
    if(isRecurringSkillAuthoringLesson(story))for(const candidate of related){
      if(candidate.recurring_skill_lesson&&!uniqueSkillDates.has(candidate.prior_date))
        uniqueSkillDates.set(candidate.prior_date,candidate);
    }
    if(uniqueSkillDates.size>=2)violations.push({
      story_index:i+1,story_title:story.headline,
      reason:'recurring_generic_skill_authoring_reader_lesson',
      prior_edition_count:uniqueSkillDates.size,
      prior_pages:[...uniqueSkillDates.values()].sort((a,b)=>
        b.prior_date.localeCompare(a.prior_date)).map(x=>({
          prior_date:x.prior_date,prior_title:x.prior_title,prior_page:x.prior_page
        }))
    });
    const skillEvidence=skillProcedureEvidence(story);
    const similarSkillPages=skillEvidence.procedural_skill?
      related.filter(x=>x.recurring_skill_lesson).slice(0,4):[];
    // Starting October 31, generic rewording cannot circumvent an otherwise
    // clear three-in-seven published Skill-authoring repetition. A concrete
    // reader task (e.g. release-note triage) remains reviewable, not banned.
    if(date>='2026-10-31'&&similarSkillPages.length>=2&&
       !skillEvidence.concrete_task_evidenced&&
       !violations.some(x=>x.story_index===i+1&&
         x.reason==='recurring_generic_skill_authoring_reader_lesson')){
      violations.push({story_index:i+1,story_title:story.headline,
        reason:'skill_procedure_rebrand_without_distinct_task_evidence',
        prior_pages:similarSkillPages.map(x=>({
          prior_date:x.prior_date,prior_title:x.prior_title,prior_page:x.prior_page})),
        required:'Name a distinct source-grounded deliverable and practical action or reselect; a renamed generic Skill tutorial is not new editorial value'});
    }
    const nearCopied=related.filter(x=>x.similarity>=0.82&&x.shared_terms>=10);
    if(nearCopied.length)violations.push({
      story_index:i+1,story_title:story.headline,
      reason:'near_identical_reader_explanation',
      prior_pages:nearCopied.slice(0,3).map(x=>({
        prior_date:x.prior_date,prior_title:x.prior_title,
        prior_page:x.prior_page,similarity:x.similarity
      }))
    });
    review_candidates.push({
      story_index:i+1,story_title:story.headline,
      closest_prior:related.filter(x=>x.similarity>=0.20&&x.shared_terms>=4)
        .slice(0,3).map(({prior_date,prior_title,prior_page,similarity})=>
          ({prior_date,prior_title,prior_page,similarity})),
      skill_procedure_review:similarSkillPages.length?{
        compare_primary_source:true,compare_reader_takeaway:true,
        compare_specific_practical_action:true,
        primary_source_url:skillEvidence.primary_source_url,
        concrete_task_evidenced:skillEvidence.concrete_task_evidenced,
        task_specific_tokens:skillEvidence.task_specific_tokens,
        similar_published_lessons:similarSkillPages.map(x=>({
          prior_date:x.prior_date,prior_title:x.prior_title,prior_page:x.prior_page}))
      }:null
    });
  }
  return {
    result:violations.length?'NEAR_DUPLICATE':'PASS',
    reviewed_selection_count:bundle.stories.length,
    compared_published_edition_dates:selectedDates,
    previous_articles_compared:prior.length,
    reviewer_note:'Machine flags do not replace a real editor comparing distinct reader takeaways.',
    violations,review_candidates
  };
}
