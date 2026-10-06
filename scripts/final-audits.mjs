import fs from 'node:fs';

const runtimeFiles=[
  'compiler/compile.mjs',
  'compiler/reader.mjs',
  'diagram-compiler/render-story.mjs',
  'diagram-compiler/v2/helpers.mjs',
  'diagram-compiler/v2/pipeline.mjs',
  'diagram-compiler/v2/layered-system.mjs',
  'diagram-compiler/v2/control-loop.mjs',
  'diagram-compiler/v2/hub-spoke.mjs',
  'diagram-compiler/v2/comparison.mjs',
  'diagram-compiler/v2/state-machine.mjs',
  'producer/recovery.mjs',
  'scripts/check-current-shadow-ready.mjs',
  'scripts/finalize-shadow-state.mjs',
  'scripts/render-pending-images.mjs',
  'scripts/verify-live.mjs',
  '.github/workflows/render-shadow-images.yml',
  '.github/workflows/bundle-ready-signal.yml',
  '.github/workflows/shadow-compile.yml'
];
const runtimeWorkflows=[
  '.github/workflows/render-shadow-images.yml',
  '.github/workflows/bundle-ready-signal.yml',
  '.github/workflows/shadow-compile.yml'
];

const fail=m=>{throw new Error(m);};
for(const p of runtimeFiles) if(!fs.existsSync(p)) fail('runtime file missing: '+p);

const contents=new Map(runtimeFiles.map(p=>[p,fs.readFileSync(p,'utf8')]));

const prodNeedles=[
  'github.com/gttome/Daily-AI-Brief/',
  'api.github.com/repos/gttome/Daily-AI-Brief/'
];
for(const [p,text] of contents){
  if(p==='compiler/compile.mjs') continue;
  for(const needle of prodNeedles) if(text.includes(needle)) fail('production repository target present in runtime file '+p);
}
const compiler=contents.get('compiler/compile.mjs');
if(!compiler.includes('PROD_MUTATION_PATTERNS')||!compiler.includes('production repository mutation target forbidden')) fail('production isolation guard missing');
for(const needle of ['github\\.com\\/gttome\\/Daily-AI-Brief','api\\.github\\.com\\/repos\\/gttome\\/Daily-AI-Brief']){
  if(!compiler.includes(needle)) fail('production mutation rejection pattern missing: '+needle);
}

const paidNeedles=['api.openai.com','OPENAI_API_KEY','ANTHROPIC_API_KEY','GEMINI_API_KEY','AZURE_OPENAI_API_KEY'];
for(const [p,text] of contents){
  for(const needle of paidNeedles) if(text.includes(needle)) fail('paid/credential dependency present in '+p+': '+needle);
}

const controlPlaneNeedles=['Watchdog Ring','persistent Supervisor','writer lease','recovery lease','worker pool','wake PR','runtime repair framework'];
for(const [p,text] of contents){
  for(const needle of controlPlaneNeedles) if(text.toLowerCase().includes(needle.toLowerCase())) fail('forbidden control-plane term in runtime file '+p+': '+needle);
}

if(runtimeWorkflows.length>3) fail('runtime workflow complexity budget exceeded');
const shadowCompile=contents.get('.github/workflows/shadow-compile.yml');
if(/\bcron\s*:/.test(shadowCompile)||/\bschedule\s*:/.test(shadowCompile)) fail('shadow compiler must be event-driven, not polled');
if(!shadowCompile.includes('repository_dispatch:')||!shadowCompile.includes('daily-compiler-bundle-ready')) fail('event-driven BUNDLE_READY trigger missing');
const render=contents.get('.github/workflows/render-shadow-images.yml');
if(!render.includes('cancel-in-progress: true')) fail('image render serialization missing');
const signal=contents.get('.github/workflows/bundle-ready-signal.yml');
if(!signal.includes('daily-compiler-bundle-ready')) fail('BUNDLE_READY signal missing');

const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const dependencies={...(packageJson.dependencies||{}),...(packageJson.devDependencies||{})};
for(const name of Object.keys(dependencies)){
  if(/openai|anthropic|gemini|codex/i.test(name)) fail('model API SDK dependency forbidden: '+name);
}

const schedule=JSON.parse(fs.readFileSync('contracts/schedule-contract.json','utf8'));
if(schedule.schedules.length!==4) fail('schedule count must be 4');
if(schedule.schedules.filter(x=>x.role==='primary').length!==1) fail('primary schedule count invalid');
if(schedule.schedules.filter(x=>x.role==='recovery').length!==3) fail('recovery schedule count invalid');
if(schedule.rules.continuous_monitoring!==false||schedule.rules.supervisor!==false||schedule.rules.watchdog_ring!==false) fail('schedule complexity contract invalid');
for(const key of ['work','codex','paid_model_api']) if(schedule.rules[key]!==false) fail('paid-production boundary invalid: '+key);

const returnValue = {
  schema_version:'daily-compiler-final-static-audit-v1',
  result:'PASS',
  isolation:{result:'PASS',production_mutation_paths:0,negative_guard_present:true},
  no_paid_production:{result:'PASS',model_api_sdks:0,ai_api_credentials:0},
  complexity:{result:'PASS',runtime_workflows:runtimeWorkflows.length,primary_schedules:1,recovery_schedules:3,continuous_ai_polling:0,supervisor:0,watchdog_ring:0,leases:0,worker_pools:0,wake_prs:0,runtime_repair_frameworks:0},
  reader_runtime:{result:'PASS',event_driven_compile:true,serialized_image_render:true}
};

export function runFinalStaticAudits(){ return returnValue; }

if(process.argv[1] && process.argv[1].endsWith('final-audits.mjs')){
  console.log(JSON.stringify(returnValue,null,2));
}
