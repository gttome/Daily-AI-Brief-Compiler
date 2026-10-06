import { compileShadow } from '../compiler/compile.mjs';

const receipt=compileShadow({
  statePath:'fixtures/complete-edition/compiler-state.json',
  bundlePath:'fixtures/complete-edition/edition-bundle.json',
  outDir:'build/fixture',
  repoRoot:'.'
});
console.log(JSON.stringify(receipt));
