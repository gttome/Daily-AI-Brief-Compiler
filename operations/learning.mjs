import fs from 'node:fs';
import path from 'node:path';

export function validateProblemLearning(p={}){
  const errors=[];
  if(p.schema_version!=='daily-compiler-problem-learning-v1') errors.push('learning_schema');
  for(const k of ['problem_id','edition_date','execution_id','detected_at','classification','problem','root_cause','impact','actual_fix','outcome','permanent_action','regression_test','recurrence','status']){
    if(!p[k]) errors.push('learning_'+k);
  }
  if(!Array.isArray(p.attempted_fixes)) errors.push('learning_attempted_fixes');
  if(p.timing_impact_seconds!==null&&(!Number.isFinite(p.timing_impact_seconds)||p.timing_impact_seconds<0)) errors.push('learning_timing');
  return [...new Set(errors)];
}

export function buildLearningMarkdown(records=[]){
  const sorted=[...records].sort((a,b)=>Date.parse(a.detected_at)-Date.parse(b.detected_at));
  const lines=['# Daily Compiler Operational Learning','','Generated from durable per-problem records.',''];
  for(const p of sorted){
    const errors=validateProblemLearning(p);
    if(errors.length) throw new Error(errors.join(';'));
    lines.push(
      '## '+p.problem_id+' — '+p.classification,'',
      '- Edition: '+p.edition_date,
      '- Status: **'+p.status+'**',
      '- Recurrence: '+p.recurrence,
      '- Problem: '+p.problem,
      '- Root cause: '+p.root_cause,
      '- Impact: '+p.impact,
      '- Actual fix: '+p.actual_fix,
      '- Outcome: '+p.outcome,
      '- Timing impact seconds: '+String(p.timing_impact_seconds),
      '- Permanent action: '+p.permanent_action,
      '- Regression test: '+p.regression_test,''
    );
  }
  return lines.join('\n')+'\n';
}

export function writeLearningLedger({records,jsonPath,markdownPath}={}){
  if(!Array.isArray(records)||!jsonPath||!markdownPath) throw new Error('learning_write_args');
  for(const r of records){
    const errors=validateProblemLearning(r);
    if(errors.length) throw new Error(errors.join(';'));
  }
  fs.mkdirSync(path.dirname(jsonPath),{recursive:true});
  fs.mkdirSync(path.dirname(markdownPath),{recursive:true});
  fs.writeFileSync(jsonPath,JSON.stringify({schema_version:'daily-compiler-learning-ledger-v1',records},null,2)+'\n');
  fs.writeFileSync(markdownPath,buildLearningMarkdown(records));
}
