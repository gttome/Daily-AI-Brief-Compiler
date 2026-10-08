import fs from 'node:fs';
import path from 'node:path';
import {
  buildSourcePlan, readSourceSnapshot, sourceDigest, sourceJson, validateBoundSourcePlan
} from '../operations/source-discovery.mjs';
import {buildSourceResearch,replayBoundSourceAcquisition,validateSourceEditorial} from '../producer/source-research.mjs';

function options(args){
  const result={};
  for(let i=0;i<args.length;i+=2){
    if(!args[i].startsWith('--')||args[i+1]===undefined||args[i+1].startsWith('--'))throw new Error('Expected --name value arguments');
    const key=args[i].slice(2);if(Object.hasOwn(result,key))throw new Error('Duplicate option: '+key);
    result[key]=args[i+1];
  }
  const allowed=['root','out','date','cutoff','topic','budget','purpose','plan','observations','requests','receipt','selection','state'];
  if(Object.keys(result).some(k=>!allowed.includes(k)))throw new Error('Unknown source-discovery option');
  return result;
}

try{
  const [command='verify',...args]=process.argv.slice(2),o=options(args),root=path.resolve(o.root||'.');
  const required=key=>{if(!o[key])throw new Error('Required option: --'+key);return o[key];};
  const read=key=>JSON.parse(fs.readFileSync(path.resolve(root,required(key)),'utf8'));
  const context=readSourceSnapshot(root);
  let result;
  if(command==='verify'){
    result={result:'QUALIFIED_SNAPSHOT_PASS',source_rollout:context.snapshot.source_rollout,
      registry_sha256:context.snapshot.registry_sha256,resources:context.snapshot.resource_count,
      memberships:context.snapshot.membership_count,qualified_resources:context.snapshot.qualified_resources,
      selected_media_admission:'NOT_RUN',activation:'NOT_RUN',release:'NOT_RUN'};
  }else if(command==='plan'){
    result=buildSourcePlan(context.registry,context.policy,{reference_date:required('date'),cutoff_at:required('cutoff'),
      topic_resource_ids:o.topic?o.topic.split(','):[],max_probes:o.budget===undefined?null:Number(o.budget),purpose:o.purpose||'edition'});
  }else if(['replay','research','validate-editorial'].includes(command)){
    const plan=read('plan'),document=read('observations');
    if(validateBoundSourcePlan(context.registry,context.policy,plan).length)throw new Error('Plan does not match approved source snapshot');
    if(document.plan_sha256!==sourceDigest(plan)||document.research_cutoff_at!==plan.cutoff_at)throw new Error('Observation document is not bound to this plan and cutoff');
    if(command==='replay')result=replayBoundSourceAcquisition(context,plan,document);
    else{
      const requests=read('requests');
      if(command==='research')result=buildSourceResearch(context,plan,document,requests);
      else{
        const receipt=read('receipt'),selection=read('selection'),state=read('state');
        const errors=validateSourceEditorial(context,plan,document,requests,receipt,selection,state);
        result={result:errors.length?'FAIL':'EDITORIAL_RESEARCH_PASS',errors,research_cutoff_at:plan.cutoff_at,
          source_rollout:context.snapshot.source_rollout,selected_media_admission:'NOT_RUN',activation:'NOT_RUN',release:'NOT_RUN'};
        if(errors.length)process.exitCode=1;
      }
    }
  }else throw new Error('Use verify, plan, replay, research or validate-editorial');
  const output=sourceJson(result);
  if(o.out){const target=path.resolve(root,o.out);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,output);}
  else process.stdout.write(output);
}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
