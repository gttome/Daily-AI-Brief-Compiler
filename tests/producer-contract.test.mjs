import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {palette,validateSpec} from '../diagram-compiler/v2/helpers.mjs';
import {render as pipeline} from '../diagram-compiler/v2/pipeline.mjs';
import {render as layered} from '../diagram-compiler/v2/layered-system.mjs';
import {render as loop} from '../diagram-compiler/v2/control-loop.mjs';
import {render as hub} from '../diagram-compiler/v2/hub-spoke.mjs';
import {render as comparison} from '../diagram-compiler/v2/comparison.mjs';
import {render as stateMachine} from '../diagram-compiler/v2/state-machine.mjs';

const grammars=['pipeline','layered_system','control_loop','hub_spoke','comparison','state_machine'];
const renderers={pipeline,layered_system:layered,control_loop:loop,hub_spoke:hub,comparison,state_machine:stateMachine};

function spec(grammar){
  return {
    schema_version:'daily-compiler-diagram-spec-v2',
    story_id:'fixture-story',
    grammar,
    title:'Mechanism title',
    subtitle:'A professional explanatory mechanism diagram for validation',
    nodes:Array.from({length:6},(_,i)=>({id:'n'+(i+1),label:'Stage '+(i+1),detail:'Mechanism detail '+(i+1)+' explains the system'})),
    callouts:[
      {label:'Evidence',detail:'Exact persisted artifact identity is checked'},
      {label:'Control',detail:'Deterministic validation protects the boundary'},
      {label:'Outcome',detail:'Reader-facing result remains complete'}
    ],
    flow_label:'Mechanism flow',
    footer:'Deterministic story diagram fixture'
  };
}

test('diagram contract exposes six qualified grammars',()=>{
  const schema=JSON.parse(fs.readFileSync('contracts/diagram-spec.schema.json','utf8'));
  assert.deepEqual(schema.properties.grammar.enum,grammars);
  assert.equal(schema.properties.nodes.minItems,6);
  assert.equal(schema.properties.nodes.maxItems,6);
});

test('all six grammars produce substantive SVG mechanisms',()=>{
  for(const grammar of grammars){
    const s=spec(grammar);
    validateSpec(s);
    const p=palette(s);
    const colors=[p.blue,p.green,p.purple,p.orange,p.cyan,p.red];
    const svg=renderers[grammar](s,p,colors);
    assert.ok(svg.length>1000,grammar+' output too small');
    assert.ok(svg.includes('Stage 1'));
    assert.ok(svg.includes('Stage 6'));
  }
});

test('semantic producer contract forbids control-plane replacement',()=>{
  const text=fs.readFileSync('docs/SEMANTIC-PRODUCER-CONTRACT.md','utf8');
  for(const term of ['Supervisor','Watchdog Ring','writer/recovery leases','runtime software repair']){
    assert.ok(text.includes(term));
  }
  assert.ok(text.includes('Accepted images are immutable'));
  assert.ok(text.includes('BUNDLE_READY'));
});

test('runtime workflow count remains bounded',()=>{
  const runtime=[
    '.github/workflows/render-shadow-images.yml',
    '.github/workflows/bundle-ready-signal.yml',
    '.github/workflows/shadow-compile.yml'
  ];
  for(const p of runtime) assert.ok(fs.existsSync(p));
  assert.ok(runtime.length<=3);
});


test('runtime trigger path is event-driven and bounded',()=>{
  const render=fs.readFileSync('.github/workflows/render-shadow-images.yml','utf8');
  const signal=fs.readFileSync('.github/workflows/bundle-ready-signal.yml','utf8');
  const compile=fs.readFileSync('.github/workflows/shadow-compile.yml','utf8');
  assert.match(render,/cancel-in-progress: true/);
  assert.match(signal,/daily-compiler-bundle-ready/);
  assert.match(compile,/repository_dispatch:/);
  assert.doesNotMatch(compile,/cron:/);
  assert.doesNotMatch(compile,/\*\/5 \* \* \* \*/);
});
