import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateEdition} from '../compiler/compile.mjs';
import {assertProgressPreserved} from '../producer/recovery.mjs';
import {validateMediaSelection,mediaSha256} from '../compiler/media.mjs';
import {makeMediaFixture,writeMediaFixture} from './fixtures/media.mjs';

function persisted(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-media-integration-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const fixture=writeMediaFixture(root);
  for(const image of fixture.bundle.images){
    const target=path.join(root,image.path);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(image.path,target);
  }
  return fixture;
}

test('I03 current bundle compiler requires the same qualified media evidence as CONTENT selection',t=>{
  const fixture=persisted(t);
  const before=fs.readFileSync(fixture.bundlePath);
  const result=validateEdition(fixture);
  assert.equal(result.mediaGate.result,'PASS');
  assert.equal(result.mediaGate.items.length,4);
  assert.equal(result.imageEvidence.length,6,'existing image integrity remains mandatory');
  assert.equal(result.d0ImageGate,null);
  assert.equal(result.d1ImageGate,null,'test does not activate another image lane');
  assert.deepEqual(fs.readFileSync(fixture.bundlePath),before);
  fs.appendFileSync(path.join(fixture.repoRoot,fixture.bundle.media_evidence.path),' ');
  assert.throws(()=>validateEdition(fixture),/media evidence hash mismatch/);
});

test('I03 selection CLI validates retained evidence without writing candidate or state',t=>{
  const fixture=persisted(t);
  const beforeState=fs.readFileSync(fixture.statePath),beforeBundle=fs.readFileSync(fixture.bundlePath);
  const output=execFileSync(process.execPath,['scripts/validate-media.mjs',fixture.statePath,fixture.bundlePath,fixture.repoRoot],{encoding:'utf8'});
  const result=JSON.parse(output);
  assert.equal(result.result,'PASS');
  assert.equal(result.live_source_availability_certified,false);
  assert.deepEqual(fs.readFileSync(fixture.statePath),beforeState);
  assert.deepEqual(fs.readFileSync(fixture.bundlePath),beforeBundle);
});

test('I03 source selection cannot borrow another edition state or ambiguous story identity',()=>{
  const fixture=makeMediaFixture();
  fixture.state.edition_date='2026-10-10';
  assert.throws(()=>validateMediaSelection(fixture),/persisted edition identity/);
  fixture.state.edition_date=fixture.bundle.edition_date;
  fixture.bundle.stories[1].id=fixture.bundle.stories[0].id;
  assert.throws(()=>validateMediaSelection(fixture),/story identities must be unique/);
});

test('I03 original cutoff is recorded during EDITORIAL and cannot move on any resume',()=>{
  const previous=makeMediaFixture().state;
  delete previous.research_cutoff_at;
  previous.stage='EDITORIAL'; previous.state='PRODUCING';
  previous.editorial_bundle={status:'pending',digest:null};
  previous.bundle={status:'pending',digest:null}; previous.images.accepted=[];
  const next=structuredClone(previous);
  next.research_cutoff_at='2026-10-08T00:00:00Z';
  next.stage='CONTENT'; next.editorial_bundle={status:'complete',digest:'synthetic-editorial'};
  assert.equal(assertProgressPreserved(previous,next),true);
  for(const value of [undefined,'2026-10-08T00:00:01Z',null]){
    const changed=structuredClone(next);changed.research_cutoff_at=value;
    assert.throws(()=>assertProgressPreserved(next,changed),/cutoff changed or removed/);
  }
  for(const value of ['2026-02-30T00:00:00Z','2026-10-08','2026-10-08T00:00:00']){
    const changed=structuredClone(next);changed.research_cutoff_at=value;
    assert.throws(()=>assertProgressPreserved(previous,changed),/research cutoff/);
  }
  const late=structuredClone(next);delete late.research_cutoff_at;
  assert.throws(()=>assertProgressPreserved(late,next),/unfinished EDITORIAL/);
  const done=structuredClone(previous);done.editorial_bundle.status='complete';
  assert.throws(()=>assertProgressPreserved(done,{...done,research_cutoff_at:next.research_cutoff_at}),/unfinished EDITORIAL/);
  const old=structuredClone(previous);
  assert.equal(assertProgressPreserved(previous,old),true,'historical states need no retrofit');
});

test('I03-T08 compiler compatibility returns historical status without current qualification or a digest rewrite',()=>{
  const bundlePath='fixtures/complete-edition/edition-bundle.json';
  const before=fs.readFileSync(bundlePath);
  const result=validateEdition({statePath:'fixtures/complete-edition/compiler-state.json',bundlePath,repoRoot:'.'});
  assert.equal(result.mediaGate.result,'HISTORICAL_COMPATIBILITY');
  assert.equal(result.mediaGate.current_media_qualification,false);
  assert.equal(result.mediaGate.bundle_sha256,mediaSha256(before));
  assert.deepEqual(fs.readFileSync(bundlePath),before);
});
