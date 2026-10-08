#!/usr/bin/env node
// One-off operator evidence normalization. Never imported by production.
// No network, Git, browser, scheduler, subprocess, image generation, or overwrite.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const EXPECTED = Object.freeze({
  repository: 'gttome/Daily-AI-Brief-Compiler',
  commit: '3bc8dde18d77c570f169ae70030e0c8e92866649',
  engine: 'aee4f026e88a30e14369099d45f95514933f4707',
  proof: 'value-image-2026-10-08',
  branch: 'qualification/value-image-2026-10-08',
  prefix: 'qualifications/value-image-2026-10-08/',
  firstStory: 'learning-without-assistant',
  requestCommit: '5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b',
  sourceCommit: '73b41c7312c9b1ad98fc33f455dc62cdc686476b',
  terminal: 'quality-attempts-exhausted-20261008T195730Z.json'
});
const PINNED_BLOBS = Object.freeze({
  'image-studio/proof-state.mjs': 'c324595496018647ff223892e01637009dfaaa00',
  'image-studio/spec-admission.mjs': '00774c7220eca20ac81557f9d9b20e9c8c94097a',
  'image-capsules/state.mjs': '86188a1bab588b08232a07eb9d95f39794670fa5',
  'image-capsules/util.mjs': '0be923e3b47f3bbde19b5e07d7f5150d884c3856',
  'image-capsules/set-plan.mjs': 'ed9d7b97865a1b587cac2a8c9a6b5967acb34b1d',
  'contracts/d1-image-contract.json': '7bfe2ecd94662bacd6a6b61ec0a51eed8beffeac',
  'contracts/d1-image-admission-contract.json': 'a8f8a28dc7bef811872067fa8d1c8669659dd33c',
  'contracts/d1-cloud-proof-execution.schema.json': '930e342abf092664d4f5d011fce9cb0371692203'
});
const INPUT_PATHS = Object.freeze({
  'execution-state.json': EXPECTED.prefix + 'execution-state.json',
  'attempt-log.json': EXPECTED.prefix + 'attempt-log.json',
  'request.json': EXPECTED.prefix + 'request.json',
  'source-evidence.json': EXPECTED.prefix + 'source-evidence.json',
  [EXPECTED.terminal]: EXPECTED.prefix + 'evidence/' + EXPECTED.terminal
});
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const hex = (value, count) => typeof value === 'string' && new RegExp('^[a-f0-9]{' + count + '}$').test(value);
const integer = value => Number.isSafeInteger(value) && value > 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex');
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const safeRel = value => typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !/[\\\s:#?]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');

function parseArguments() {
  const args = process.argv.slice(2), result = {};
  fail(args.length > 0 && args.length % 2 === 0, 'Use --input-dir DIR --output-dir NEW_DIR --source-commit SHA --runtime-root DIR.');
  for (let i = 0; i < args.length; i += 2) {
    fail(['--input-dir', '--output-dir', '--source-commit', '--runtime-root', '--check-only'].includes(args[i]), 'Unknown argument: ' + args[i]);
    fail(!Object.hasOwn(result, args[i]) && text(args[i + 1]), 'Duplicate/missing argument: ' + args[i]);
    result[args[i]] = args[i + 1];
  }
  for (const key of ['--input-dir', '--output-dir', '--source-commit', '--runtime-root']) fail(text(result[key]), 'Missing ' + key);
  fail(result['--check-only'] === undefined || result['--check-only'] === 'true', '--check-only accepts only true; omit it to create local output.');
  fail(result['--source-commit'] === EXPECTED.commit, 'This one-off helper only accepts the settled immutable commit ' + EXPECTED.commit);
  return result;
}

function readFileInside(root, relative) {
  fail(safeRel(relative), 'Unsafe relative input: ' + relative);
  const candidate = path.resolve(root, relative);
  fail(fs.existsSync(candidate) && !fs.lstatSync(candidate).isSymbolicLink(), 'Missing or symlinked file: ' + relative);
  const real = fs.realpathSync(candidate), rel = path.relative(root, real);
  fail(rel && !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel), 'Path escapes input root: ' + relative);
  fail(fs.statSync(real).isFile() && fs.statSync(real).size <= 2_000_000, 'Not a bounded JSON/source file: ' + relative);
  return fs.readFileSync(real);
}

// Closed, schema-driven validator for every assertion keyword present in the
// exact pinned state schema. Unknown keywords fail; nothing is silently skipped.
function validateDeclaredSchema(schema, value, location = '$', errors = []) {
  const supported = new Set(['$schema', '$id', 'title', 'type', 'additionalProperties', 'required', 'properties', 'const', 'enum', 'minLength', 'pattern', 'minimum', 'maxItems', 'uniqueItems', 'items', 'format']);
  for (const key of Object.keys(schema)) fail(supported.has(key), 'Unsupported pinned-schema keyword: ' + key);
  const matches = type => type === 'object' ? object(value) : type === 'array' ? Array.isArray(value) : type === 'null' ? value === null : type === 'integer' ? Number.isInteger(value) : typeof value === type;
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).some(matches)) {
    errors.push({path: location, keyword: 'type'}); return errors;
  }
  if (Object.hasOwn(schema, 'const') && !same(value, schema.const)) errors.push({path: location, keyword: 'const'});
  if (schema.enum && !schema.enum.some(item => same(value, item))) errors.push({path: location, keyword: 'enum'});
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) errors.push({path: location, keyword: 'minLength'});
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push({path: location, keyword: 'pattern'});
    if (schema.format) {
      fail(schema.format === 'date-time', 'Unsupported format: ' + schema.format);
      if (!instant(value)) errors.push({path: location, keyword: 'format'});
    }
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push({path: location, keyword: 'minimum'});
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({path: location, keyword: 'maxItems'});
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push({path: location, keyword: 'uniqueItems'});
    if (schema.items) value.forEach((item, i) => validateDeclaredSchema(schema.items, item, location + '[' + i + ']', errors));
  }
  if (object(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push({path: location + '.' + key, keyword: 'required'});
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) validateDeclaredSchema(schema.properties[key], item, location + '.' + key, errors);
      else if (schema.additionalProperties === false) errors.push({path: location + '.' + key, keyword: 'additionalProperties'});
    }
  }
  return errors;
}

async function main() {
  const args = parseArguments();
  const inputDir = fs.realpathSync(args['--input-dir']), runtimeRoot = fs.realpathSync(args['--runtime-root']);
  const outputDir = path.resolve(args['--output-dir']);
  fail(!fs.existsSync(outputDir), 'Output directory must not exist; refusing to overwrite.');
  fail(!outputDir.startsWith(inputDir + path.sep) && outputDir !== inputDir, 'Output must be separate from input.');
  fail(!outputDir.startsWith(runtimeRoot + path.sep) && outputDir !== runtimeRoot, 'Output must be outside the bound runtime/repository.');
  for (const [relative, expected] of Object.entries(PINNED_BLOBS)) fail(gitBlob(readFileInside(runtimeRoot, relative)) === expected, 'Pinned runtime file mismatch: ' + relative);

  const {canonicalSha} = await import(pathToFileURL(path.join(runtimeRoot, 'image-capsules/util.mjs')).href);
  const {validateD1ProofState, nextD1ProofAction} = await import(pathToFileURL(path.join(runtimeRoot, 'image-studio/proof-state.mjs')).href);
  const {assertD1Specifications, compileD1StoryPrompt} = await import(pathToFileURL(path.join(runtimeRoot, 'image-studio/spec-admission.mjs')).href);
  const inputBytes = {}, inputs = {}, inputIdentities = {};
  for (const [filename, repositoryPath] of Object.entries(INPUT_PATHS)) {
    const bytes = readFileInside(inputDir, filename);
    const decoded = bytes.toString('utf8');
    fail(Buffer.from(decoded).equals(bytes), 'Input is not exact valid UTF-8: ' + filename);
    inputBytes[filename] = bytes; inputs[filename] = JSON.parse(decoded);
    inputIdentities[filename] = {repository_path: repositoryPath, commit: EXPECTED.commit, bytes: bytes.length, bytes_sha256: digest(bytes), git_blob_sha: gitBlob(bytes), canonical_sha256: canonicalSha(inputs[filename])};
  }
  let observedBlobBindings = false;
  const bindingFilename = fs.existsSync(path.join(inputDir, 'observed-source-bindings.json')) ? 'observed-source-bindings.json' : 'source-bindings.json';
  if (fs.existsSync(path.join(inputDir, bindingFilename))) {
    const bytes = readFileInside(inputDir, bindingFilename), bindings = JSON.parse(bytes);
    fail((bindings.repository === undefined || bindings.repository === EXPECTED.repository) && bindings.source_commit === EXPECTED.commit, 'Source-bindings identity mismatch.');
    const records = bindings.files ?? bindings.records;
    for (const [filename, actual] of Object.entries(inputIdentities)) {
      const row = records?.[filename];
      fail(row && row.repository_path === actual.repository_path && row.git_blob_sha === actual.git_blob_sha, 'Observed source blob mismatch: ' + filename);
      if (row.bytes_sha256 !== undefined) fail(row.bytes_sha256 === actual.bytes_sha256, 'Observed source SHA mismatch: ' + filename);
      if (row.sha256 !== undefined) fail(row.sha256 === actual.bytes_sha256, 'Observed source exact-byte SHA mismatch: ' + filename);
    }
    inputBytes[bindingFilename] = bytes; observedBlobBindings = true;
  }

  const originalState = inputs['execution-state.json'], originalLog = inputs['attempt-log.json'];
  const request = inputs['request.json'], sourceEvidence = inputs['source-evidence.json'], terminal = inputs[EXPECTED.terminal];
  const schema = JSON.parse(readFileInside(runtimeRoot, 'contracts/d1-cloud-proof-execution.schema.json'));
  const originalSchemaErrors = validateDeclaredSchema(schema, originalState);
  fail(originalSchemaErrors.every(error => error.path === '$.runtime_progress' && error.keyword === 'additionalProperties'), 'Original state has unrelated declared-schema defects.');
  fail(validateD1ProofState(originalState).length === 0, 'Original state fails lightweight state validation.');
  fail(originalState.proof_id === EXPECTED.proof && originalState.branch === EXPECTED.branch && originalState.status === 'BLOCKED', 'Only the actual terminal BLOCKED state is eligible.');
  fail(originalLog.schema_version === 'daily-compiler-d1-attempt-log-v1' && originalLog.proof_id === EXPECTED.proof, 'Attempt-log identity mismatch.');
  fail(originalState.request_path === INPUT_PATHS['request.json'] && originalState.specification_binding?.source_evidence_path === INPUT_PATHS['source-evidence.json'], 'Request/source path mismatch.');
  fail(originalState.specification_binding?.request_commit === EXPECTED.requestCommit && originalState.specification_binding?.source_commit === EXPECTED.sourceCommit, 'Immutable request/source commit changed.');
  fail(canonicalSha(request) === originalState.specification_binding.request_sha256 && canonicalSha(sourceEvidence) === originalState.specification_binding.source_evidence_sha256, 'Immutable request/source digest changed.');
  assertD1Specifications(request, sourceEvidence);
  fail(request.execution_id === EXPECTED.proof && request.stories?.length === 6 && request.stories[0].story_id === EXPECTED.firstStory, 'Request order/identity mismatch.');
  const compiled = compileD1StoryPrompt(request, sourceEvidence, EXPECTED.firstStory);
  fail(Array.isArray(originalState.accepted_assets) && originalState.accepted_assets.length === 0 && Array.isArray(originalState.accepted_story_chats) && originalState.accepted_story_chats.length === 0, 'Accepted locks exist; this helper cannot touch them.');
  fail(originalState.native_generations === 4 && originalLog.native_generations === 4, 'The settled exhaustion record must show four genuine generations in both state and log.');
  fail(Array.isArray(originalLog.stories) && originalLog.stories.length === 1, 'Only the failed first-story lineage is eligible.');
  const row = originalLog.stories[0];
  fail(row.story_id === EXPECTED.firstStory && row.accepted_locked === false && row.genuine_attempts === 4, 'Unexpected first-story/accepted/count state.');
  fail(Array.isArray(row.attempts) && row.attempts.length === 4, 'Exactly four retained attempts are required.');
  fail(/^ctx-[a-f0-9]{64}$/.test(row.generation_context_digest || '') && row.canonical_prompt_sha256 === compiled.prompt_sha256, 'Generation context/canonical prompt mismatch.');
  fail(terminal.schema_version === 'd1_qualification_terminal_blocker_v1' && terminal.proof_id === EXPECTED.proof && terminal.result === 'STORY_QUALITY_ATTEMPTS_EXHAUSTED', 'Missing actual terminal exhaustion evidence.');
  fail(terminal.request_sha256 === canonicalSha(request) && terminal.story_id === row.story_id && terminal.generation_context_digest === row.generation_context_digest && terminal.canonical_prompt_sha256 === compiled.prompt_sha256, 'Terminal identity differs from retained attempts.');
  fail(terminal.native_generations === 4 && terminal.quality_attempts_consumed === 4 && terminal.accepted_images === 0 && terminal.accepted_locks === 0 && terminal.next_story_opened === false && terminal.resume_allowed === false && terminal.fifth_attempt_prohibited === true, 'Terminal record does not establish exhausted/no-resume scope.');
  const originalLogCanonicalSha = canonicalSha(originalLog), originalLogBytesSha = digest(inputBytes['attempt-log.json']);
  const terminalLogDigestMethod = terminal.attempt_log_sha256 === originalLogCanonicalSha ? 'canonical_json_sha256' : terminal.attempt_log_sha256 === originalLogBytesSha ? 'exact_utf8_bytes_sha256' : null;
  const originalStateLogDigestMethod = originalState.specification_binding.attempt_log_sha256 === originalLogCanonicalSha ? 'canonical_json_sha256' : originalState.specification_binding.attempt_log_sha256 === originalLogBytesSha ? 'exact_utf8_bytes_sha256' : null;
  fail(instant(terminal.recorded_at) && terminalLogDigestMethod !== null, 'Terminal timestamp/original-log binding mismatch.');
  fail(originalStateLogDigestMethod !== null, 'Original state is not bound to the exact original log under either declared historical digest method.');
  fail(terminal.state_path === INPUT_PATHS['execution-state.json'] && terminal.attempt_log_path === INPUT_PATHS['attempt-log.json'] && Array.isArray(terminal.attempts) && terminal.attempts.length === 4, 'Terminal paths/attempts mismatch.');

  const changes = [], rawIdentities = [], rawHashes = new Set();
  let previousReview = null;
  for (let index = 0; index < row.attempts.length; index++) {
    const attempt = row.attempts[index], finalRow = terminal.attempts[index];
    const expectedLabel = index === 3 ? 'QUALITY_REJECTED_FINAL' : 'QUALITY_REJECTED';
    fail(attempt.attempt === index + 1 && attempt.result === expectedLabel, 'Unsupported, pending, PASS, or out-of-order attempt at index ' + index);
    fail(attempt.native_generation_completed === undefined || attempt.native_generation_completed === true, 'Contradictory generation flag.');
    fail(attempt.quality_attempt_consumed === undefined || attempt.quality_attempt_consumed === true, 'Contradictory attempt-consumption flag.');
    fail(attempt.review === undefined || attempt.review === 'FAIL', 'Contradictory attempt review.');
    fail(instant(attempt.generation_completed_at) && instant(attempt.review_completed_at) && Date.parse(attempt.generation_completed_at) <= Date.parse(attempt.review_completed_at), 'Missing or invalid actual generation/review timestamps.');
    fail(previousReview === null || Date.parse(previousReview) <= Date.parse(attempt.generation_completed_at), 'Attempt chronology is not consecutive.');
    fail(Date.parse(attempt.review_completed_at) <= Date.parse(terminal.recorded_at), 'Review occurs after terminal receipt.');
    previousReview = attempt.review_completed_at;
    fail(safeRel(attempt.raw_asset_path) && attempt.raw_asset_path === EXPECTED.prefix + 'evidence/attempts/' + row.story_id + '/attempt-' + attempt.attempt + '-raw.png', 'Invalid raw asset path.');
    fail(hex(attempt.raw_asset_commit, 40) && hex(attempt.raw_sha256, 64) && hex(attempt.raw_git_blob_sha, 40) && integer(attempt.raw_bytes), 'Missing raw Git/byte identity.');
    fail(object(attempt.raw_dimensions) && integer(attempt.raw_dimensions.width) && integer(attempt.raw_dimensions.height), 'Missing raw dimensions.');
    fail(object(attempt.observed_pixels) && Object.keys(attempt.observed_pixels).length > 0 && Object.values(attempt.observed_pixels).every(value => typeof value === 'boolean'), 'Missing retained pixel-review observations.');
    fail(Array.isArray(attempt.defects) && attempt.defects.length > 0 && attempt.defects.every(text), 'Missing actual quality defects.');
    fail(finalRow.attempt === attempt.attempt && finalRow.result === attempt.result && finalRow.raw_sha256 === attempt.raw_sha256 && finalRow.raw_git_blob_sha === attempt.raw_git_blob_sha && finalRow.commit === attempt.raw_asset_commit && text(finalRow.primary_defect), 'Terminal attempt identity/result mismatch.');
    fail(!rawHashes.has(attempt.raw_sha256), 'Repeated raw image identity.'); rawHashes.add(attempt.raw_sha256);
    rawIdentities.push({attempt: attempt.attempt, path: attempt.raw_asset_path, commit: attempt.raw_asset_commit, sha256: attempt.raw_sha256, git_blob_sha: attempt.raw_git_blob_sha, bytes: attempt.raw_bytes, dimensions: structuredClone(attempt.raw_dimensions), generation_completed_at: attempt.generation_completed_at, review_completed_at: attempt.review_completed_at, source_result: attempt.result});
  }

  const state = structuredClone(originalState), log = structuredClone(originalLog);
  const relocatedProgress = Object.hasOwn(state, 'runtime_progress') ? structuredClone(state.runtime_progress) : null;
  if (Object.hasOwn(state, 'runtime_progress')) { delete state.runtime_progress; changes.push({path: 'execution-state.json#/runtime_progress', action: 'relocate_to_separate_evidence', value_changed: false}); }
  for (let index = 0; index < log.stories[0].attempts.length; index++) {
    const attempt = log.stories[0].attempts[index];
    changes.push({path: 'attempt-log.json#/stories/0/attempts/' + index, source_result: attempt.result, normalized_result: 'FAIL', established_native_generation_completed: true, established_quality_attempt_consumed: true});
    attempt.result = 'FAIL'; attempt.native_generation_completed = true; attempt.quality_attempt_consumed = true;
    const original = structuredClone(row.attempts[index]), preserved = structuredClone(attempt);
    for (const key of ['result', 'native_generation_completed', 'quality_attempt_consumed']) { delete original[key]; delete preserved[key]; }
    fail(same(original, preserved), 'An unrelated attempt field changed.');
  }
  const genuineCount = log.stories[0].attempts.length;
  log.native_generations = genuineCount; log.stories[0].genuine_attempts = genuineCount; state.native_generations = genuineCount;
  const oldBinding = state.specification_binding.attempt_log_sha256;
  state.specification_binding.attempt_log_sha256 = canonicalSha(log);
  changes.push({path: 'execution-state.json#/specification_binding/attempt_log_sha256', before: oldBinding, after: state.specification_binding.attempt_log_sha256});
  fail(state.status === originalState.status && state.status === 'BLOCKED' && state.updated_at === originalState.updated_at, 'Status or historical state timestamp changed.');
  fail(same(state.accepted_assets, originalState.accepted_assets) && same(state.accepted_story_chats, originalState.accepted_story_chats), 'Accepted lock lists changed.');
  const stateSchemaErrors = validateDeclaredSchema(schema, state);
  fail(stateSchemaErrors.length === 0, 'Normalized state fails declared schema: ' + JSON.stringify(stateSchemaErrors));
  fail(validateD1ProofState(state).length === 0, 'Normalized state fails lightweight validator.');
  const requestSource = {branch: state.branch, request_path: state.request_path, source_evidence_path: state.specification_binding.source_evidence_path, commit: state.specification_binding.request_commit};
  const context = {request, sourceEvidence, attemptLog: log, requestSource};
  const terminalAction = nextD1ProofAction(state, context);
  fail(terminalAction.action === 'EXIT_BLOCKED', 'Actual terminal action did not remain EXIT_BLOCKED.');
  // Diagnostic projection only. Never persisted as execution state and never
  // treated as authority to resume. Exercises accounting hidden by terminal exit.
  const accountingProjection = nextD1ProofAction({...structuredClone(state), status: 'BROWSER_RUNNING'}, context);
  fail(accountingProjection.action === 'FAIL_ATTEMPT_LIMIT', 'Projected accounting does not prove the four-attempt limit: ' + JSON.stringify(accountingProjection));
  fail(accountingProjection.story_id === EXPECTED.firstStory, 'Accounting projection selected another story.');
  fail(state.status === 'BLOCKED', 'Diagnostic projection mutated output state.');

  const recordedAt = new Date().toISOString();
  const progressEvidence = {schema_version: 'iteration-07-relocated-runtime-progress-v1', repository: EXPECTED.repository, proof_id: EXPECTED.proof, source_commit: EXPECTED.commit, source_state_git_blob_sha: inputIdentities['execution-state.json'].git_blob_sha, relocated_at: recordedAt, historical_runtime_progress: relocatedProgress, scope: 'PRESERVED_OBSERVATION_NOT_EXECUTION_AUTHORITY'};
  const receipt = {
    schema_version: 'iteration-07-attempt-accounting-normalization-v1',
    result: 'LOCAL_CANDIDATE_VALIDATED_NOT_PUBLISHED', recorded_at: recordedAt,
    repository: EXPECTED.repository, source_commit: EXPECTED.commit, runtime_engine: EXPECTED.engine,
    proof_id: EXPECTED.proof, input_identities: inputIdentities,
    observed_source_git_blob_bindings_verified: observedBlobBindings,
    source_commit_membership_verified_by_network: false,
    publication_requires_operator_exact_commit_source_verification: !observedBlobBindings,
    original_state_attempt_log_binding_matches_canonical: originalState.specification_binding.attempt_log_sha256 === canonicalSha(originalLog),
    original_state_attempt_log_digest_method: originalStateLogDigestMethod,
    original_terminal_attempt_log_digest_method: terminalLogDigestMethod,
    original_attempt_log_exact_bytes_sha256: originalLogBytesSha,
    original_attempt_log_canonical_sha256: originalLogCanonicalSha,
    original_declared_state_schema_errors: originalSchemaErrors,
    normalized_declared_state_schema_errors: stateSchemaErrors,
    normalized_state_sha256: canonicalSha(state), normalized_attempt_log_sha256: canonicalSha(log),
    normalized_state_status: state.status, native_generations: genuineCount, accepted_images: 0,
    immutable_originals_preserved: true, original_terminal_receipt_preserved: true,
    raw_identities_reviews_and_timestamps_preserved: true, raw_png_bytes_independently_downloaded_or_verified_by_helper: false,
    native_generations_performed: 0, quality_reassessment_performed: false,
    attempt_budget_reset: false, accepted_image_supersession: false,
    new_runtime_or_task_created: false, external_writes_performed: false,
    historical_timestamps_modified: false, state_status_changed: false,
    actual_terminal_action: terminalAction,
    diagnostic_accounting_projection: {persisted_as_state: false, grants_execution_authority: false, projected_status: 'BROWSER_RUNNING', result: accountingProjection},
    raw_attempts: rawIdentities, changes,
    decision: 'Preserve BLOCKED and all four failed attempts. No fifth attempt, rearm, resume, qualification PASS, or activation is authorized.'
  };
  const mapping = {
    schema_version: 'iteration-07-local-evidence-candidate-mapping-v1',
    source_commit: EXPECTED.commit, repository: EXPECTED.repository,
    authority: 'LOCAL_CANDIDATE_ONLY_OPERATOR_REVIEW_AND_EXACT_CURRENT_HEAD_REQUIRED_BEFORE_ANY_PUBLICATION',
    updates: [
      {local_path: 'normalized/execution-state.json', repository_path: INPUT_PATHS['execution-state.json'], expected_source_git_blob_sha: inputIdentities['execution-state.json'].git_blob_sha},
      {local_path: 'normalized/attempt-log.json', repository_path: INPUT_PATHS['attempt-log.json'], expected_source_git_blob_sha: inputIdentities['attempt-log.json'].git_blob_sha}
    ],
    preserved_originals: Object.keys(inputBytes).map(filename => 'originals/' + filename),
    derived_evidence: ['evidence/runtime-progress.json', 'normalization-receipt.json'],
    status: 'BLOCKED', next_execution_action: 'EXIT_BLOCKED', allowed_new_generations: 0
  };

  if (args['--check-only'] === 'true') {
    console.log(JSON.stringify({result: 'LOCAL_INPUT_VALIDATED_NO_OUTPUT_WRITTEN', source_commit: EXPECTED.commit, runtime_engine: EXPECTED.engine, source_blob_bindings_verified: observedBlobBindings, original_declared_schema_errors: originalSchemaErrors, normalized_declared_schema_errors: stateSchemaErrors, original_state_log_digest_method: originalStateLogDigestMethod, original_terminal_log_digest_method: terminalLogDigestMethod, normalized_state_status: state.status, native_generations: genuineCount, accepted_images: 0, actual_terminal_action: terminalAction, diagnostic_accounting_action: accountingProjection, allowed_new_generations: 0, normalized_state_sha256: canonicalSha(state), normalized_attempt_log_sha256: canonicalSha(log), changes}, null, 2));
    return;
  }

  // All validation precedes the only mutation: create a new local output folder.
  fs.mkdirSync(outputDir, {recursive: false});
  for (const folder of ['originals', 'normalized', 'evidence']) fs.mkdirSync(path.join(outputDir, folder));
  const write = (relative, bytes) => fs.writeFileSync(path.join(outputDir, relative), bytes, {flag: 'wx'});
  for (const [filename, bytes] of Object.entries(inputBytes)) write('originals/' + filename, bytes);
  for (const [filename, value] of Object.entries({'normalized/execution-state.json': state, 'normalized/attempt-log.json': log, 'evidence/runtime-progress.json': progressEvidence, 'normalization-receipt.json': receipt, 'candidate-mapping.json': mapping})) write(filename, JSON.stringify(value, null, 2) + '\n');
  for (const [filename, bytes] of Object.entries(inputBytes)) {
    fail(fs.readFileSync(path.join(outputDir, 'originals', filename)).equals(bytes), 'Original-copy integrity failure.');
    fail(readFileInside(inputDir, filename).equals(bytes), 'Input changed during local normalization.');
  }
  console.log(JSON.stringify({result: receipt.result, output_dir: outputDir, source_commit: EXPECTED.commit, runtime_engine: EXPECTED.engine, source_blob_bindings_verified: observedBlobBindings, normalized_state_status: state.status, native_generations: genuineCount, accepted_images: 0, actual_terminal_action: terminalAction.action, diagnostic_accounting_action: accountingProjection.action, allowed_new_generations: 0, normalized_state_sha256: canonicalSha(state), normalized_attempt_log_sha256: canonicalSha(log)}, null, 2));
}

main().catch(error => { console.error(JSON.stringify({result: 'REFUSED', error: error.message})); process.exitCode = 1; });
