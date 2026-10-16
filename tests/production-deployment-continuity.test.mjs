import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dir='.github/workflows/';
const protectedPublishers=[
  'shadow-compile.yml',
  'external-image-only-replacement.yml',
  'external-image-postrelease-verify.yml',
  'watchlist-editorial-correction.yml',
  'reading-copy-correction.yml'
];
test('every active edition or correction publisher checks accepted image continuity before Pages upload',()=>{
  for(const workflow of protectedPublishers){
    const source=fs.readFileSync(dir+workflow,'utf8');
    const guard=source.indexOf('node scripts/assert-published-image-continuity.mjs');
    const upload=source.indexOf('actions/upload-pages-artifact@v3');
    assert.ok(guard>0,'accepted-image preservation gate missing: '+workflow);
    assert.ok(upload>guard,'accepted-image gate must precede any Pages upload: '+workflow);
    assert.ok(source.includes('group: daily-compiler-pages-deploy'),
      'production Pages deploy must share writer concurrency: '+workflow);
  }
});
test('fixture qualification cannot publish over the live reader',()=>{
  const source=fs.readFileSync(dir+'fixture-pages-proof.yml','utf8');
  assert.match(source,/workflow_dispatch:/);
  assert.match(source,/npm run fixture:e2e/);
  assert.match(source,/actions\/upload-artifact@v4/);
  assert.doesNotMatch(source,/actions\/deploy-pages@/);
  assert.doesNotMatch(source,/actions\/upload-pages-artifact@/);
  assert.doesNotMatch(source,/pages:\s*write/);
  assert.doesNotMatch(source,/id-token:\s*write/);
});
