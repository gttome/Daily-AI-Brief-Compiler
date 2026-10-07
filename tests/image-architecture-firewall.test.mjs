import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtimeFiles=[
  'image-capsules/packet.mjs','image-capsules/prompt.mjs','image-capsules/set-plan.mjs',
  'image-capsules/admission.mjs','image-capsules/persistence.mjs','image-capsules/chunk-bridge.mjs',
  'image-capsules/normalize.mjs','image-capsules/structural-gate.mjs','image-capsules/review-contract.mjs',
  'image-capsules/set-review.mjs','image-capsules/state.mjs','image-capsules/bundle-gate.mjs','image-capsules/routing.mjs',
  'scripts/process-native-image.mjs','scripts/verify-image-candidate.mjs',
  'scripts/verify-image-set.mjs','scripts/verify-bundle-images.mjs'
];

test('D0 executable runtime has no paid/control-plane dependency',()=>{
  const forbidden=[
    /api\.openai\.com/i,/OPENAI_API_KEY/,/from\s+['"]openai['"]/i,/require\(['"]openai['"]\)/i,
    /invokeWork\s*\(/i,/invokeCodex\s*\(/i,/Supervisor/i,/Watchdog Ring/i,
    /writer[_ -]?lease/i,/recovery[_ -]?lease/i,/persistent[_ -]?worker/i,/wake[_ -]?PR/i
  ];
  for(const p of runtimeFiles){
    if(!fs.existsSync(p)) continue;
    const text=fs.readFileSync(p,'utf8');
    for(const rule of forbidden) assert.doesNotMatch(text,rule,p+' violates architecture firewall: '+rule);
  }
});
