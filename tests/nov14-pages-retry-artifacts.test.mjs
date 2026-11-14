import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('publication retry uploads its own Pages artifact and targets that exact attempt',()=>{
 const wf=fs.readFileSync('.github/workflows/shadow-compile.yml','utf8');
 const unique='daily-compiler-pages-'+String.raw`${{ github.run_id }}-${{ github.run_attempt }}`;
 const marker='name: '+unique;
 const selector='artifact_name: '+unique;
 assert.ok(wf.includes(marker),'upload must use run ID and attempt ID');
 assert.ok(wf.includes(selector),'deployment must request that same exact artifact');
 assert.ok(wf.indexOf(marker)<wf.indexOf('uses: actions/deploy-pages@v4'));
 assert.ok(wf.indexOf('verify-publication-preservation.mjs preflight')<wf.indexOf(marker));
 assert.ok(wf.indexOf('verify-live.mjs')>wf.indexOf(selector));
});
