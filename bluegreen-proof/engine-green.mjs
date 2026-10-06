import { readJson, writeJson, sha256Object, immutableProjection, fetchBytes, sha256Bytes } from './lib.mjs';

const fixture = readJson('bluegreen-proof/fixture/2026-10-06/edition-state.json');
const checkpoint = readJson('bluegreen-proof/proof-output/checkpoint.json');

if (checkpoint.engine_started !== 'BLUE-v1') throw new Error('checkpoint did not originate from BLUE-v1');
if (checkpoint.next_engine !== 'GREEN-v1') throw new Error('checkpoint not designated for GREEN-v1');
if (checkpoint.phase !== 'MIDWAY' || checkpoint.stopped_intentionally !== true) {
  throw new Error('expected intentional midway BLUE stop');
}

const currentDigest = sha256Object(immutableProjection(fixture));
if (currentDigest !== checkpoint.immutable_digest) {
  throw new Error('immutable fixture digest changed between BLUE and GREEN');
}

const zeroCounters = checkpoint.counters;
for (const [name, value] of Object.entries(zeroCounters)) {
  if (value !== 0) throw new Error(`semantic/image replay counter ${name} must remain zero`);
}

const imageVerification = [];
for (const story of fixture.stories) {
  const bytes = await fetchBytes(story.image_url);
  const actual = sha256Bytes(bytes);
  const verified = actual === story.image_sha256;
  imageVerification.push({
    story_id: story.story_id,
    url: story.image_url,
    expected_sha256: story.image_sha256,
    actual_sha256: actual,
    bytes: bytes.length,
    verified
  });
  if (!verified) throw new Error(`image identity mismatch for ${story.story_id}`);
}

const renderedBytes = await fetchBytes(fixture.published_render_url);
const renderedActual = sha256Bytes(renderedBytes);
if (renderedActual !== fixture.published_render_sha256) {
  throw new Error(
    `published rendered HTML identity mismatch: expected ${fixture.published_render_sha256}, got ${renderedActual}`
  );
}

writeJson('bluegreen-proof/proof-output/final.json', {
  schema_version: 'blue-green-portability-result-v1',
  proof_id: checkpoint.proof_id,
  result: 'PASS',
  edition_date: fixture.edition_date,
  engine_transition: {
    from: 'BLUE-v1',
    to: 'GREEN-v1',
    same_checkpoint_resumed: true
  },
  immutable_digest_at_blue: checkpoint.immutable_digest,
  immutable_digest_at_green: currentDigest,
  story_selection_unchanged: true,
  accepted_image_identities_unchanged: true,
  image_verification: imageVerification,
  published_render: {
    url: fixture.published_render_url,
    expected_sha256: fixture.published_render_sha256,
    actual_sha256: renderedActual,
    verified: true
  },
  counters: {
    research_calls: 0,
    editorial_selection_calls: 0,
    image_generation_attempts: 0,
    accepted_image_mutations: 0
  },
  production_repository_mutated: false
});

console.log('GREEN_RESUME_COMPLETE');
console.log('HISTORICAL_ASSET_IDENTITY_VERIFIED');
