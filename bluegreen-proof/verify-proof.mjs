import { readJson } from './lib.mjs';

const checkpoint = readJson('bluegreen-proof/proof-output/checkpoint.json');
const final = readJson('bluegreen-proof/proof-output/final.json');

if (final.result !== 'PASS') throw new Error('proof result is not PASS');
if (final.engine_transition.from !== 'BLUE-v1' || final.engine_transition.to !== 'GREEN-v1') {
  throw new Error('engine transition is not BLUE -> GREEN');
}
if (final.engine_transition.same_checkpoint_resumed !== true) throw new Error('same checkpoint was not resumed');
if (final.immutable_digest_at_blue !== final.immutable_digest_at_green) {
  throw new Error('immutable digest differs across engine transition');
}
if (final.immutable_digest_at_blue !== checkpoint.immutable_digest) {
  throw new Error('final result is not bound to the BLUE checkpoint');
}
if (final.story_selection_unchanged !== true) throw new Error('story selection changed');
if (final.accepted_image_identities_unchanged !== true) throw new Error('accepted image identity changed');
if (final.image_verification.length !== 6 || !final.image_verification.every(x => x.verified)) {
  throw new Error('six exact images were not verified');
}
if (final.published_render.verified !== true) throw new Error('published rendered artifact was not verified');

for (const [name, value] of Object.entries(final.counters)) {
  if (value !== 0) throw new Error(`${name} must equal zero`);
}

if (final.production_repository_mutated !== false) throw new Error('production mutation invariant failed');

console.log('BLUE_GREEN_STATE_PORTABILITY=PASS');
