import fs from 'node:fs';
import { readJson, writeJson, sha256Object, immutableProjection } from './lib.mjs';

const fixturePath = 'bluegreen-proof/fixture/2026-10-06/edition-state.json';
const checkpointPath = 'bluegreen-proof/proof-output/checkpoint.json';

const fixture = readJson(fixturePath);

if (fixture.fixture_status !== 'FROZEN') throw new Error('fixture must be FROZEN');
if (fixture.stories.length !== 6) throw new Error('fixture must contain exactly six stories');
if (fixture.stories.filter(s => s.agent_skill).length !== 1) throw new Error('fixture must contain exactly one Agent Skills story');
if (!fixture.stories.every(s => s.accepted_locked === true)) throw new Error('all six fixture images must be accepted_locked');

fs.rmSync('bluegreen-proof/proof-output', { recursive: true, force: true });

const immutableDigest = sha256Object(immutableProjection(fixture));

writeJson(checkpointPath, {
  schema_version: 'blue-green-checkpoint-v1',
  proof_id: 'oct6-state-portability',
  edition_date: fixture.edition_date,
  phase: 'MIDWAY',
  engine_started: 'BLUE-v1',
  next_engine: 'GREEN-v1',
  stopped_intentionally: true,
  immutable_digest: immutableDigest,
  completed_story_ids: fixture.stories.slice(0, 3).map(s => s.story_id),
  remaining_story_ids: fixture.stories.slice(3).map(s => s.story_id),
  accepted_image_sha256: fixture.stories.map(s => s.image_sha256),
  counters: {
    research_calls: 0,
    editorial_selection_calls: 0,
    image_generation_attempts: 0,
    accepted_image_mutations: 0
  }
});

console.log(`BLUE_CHECKPOINT_WRITTEN ${checkpointPath}`);
console.log(`IMMUTABLE_DIGEST ${immutableDigest}`);
console.log('BLUE_INTENTIONAL_STOP');
