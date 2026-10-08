import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  MEDIA_CONTRACT_VERSION, evaluateMediaFreshness, mediaDurationBand,
  normalizeMediaCopy, parseMediaInstant, publicationInterval, mediaSha256, mediaReviewedEvidenceSha256,
  readMediaEvidence, validateBundleMedia, validateDirectMediaIdentity,
  validateHistoricalMedia, validateMediaSelection
} from '../compiler/media.mjs';
import {makeMediaFixture, makeMediaEvidence, writeMediaFixture} from './fixtures/media.mjs';

const HOUR = 3_600_000;
const CUTOFF = '2026-10-08T00:00:00Z';
const instant = value => ({original_value:value, precision:'second', timezone:'UTC'});
const dateOnly = (value, timezone = 'UTC') => ({original_value:value, precision:'date', timezone});
const reason = 'The documented candidate review found no equally useful qualifying selection in the preferred band.';

// Rebuild retained observations after deliberate factual fixture changes. Tests
// for stale or contradictory evidence modify the already-created fixture instead.
function changed(mutate) {
  const fixture = makeMediaFixture();
  mutate(fixture);
  fixture.evidence = makeMediaEvidence(fixture.bundle);
  return fixture;
}
function evidenceRecord(fixture, item, key) {
  return fixture.evidence.records.find(row => row.id === item[key]);
}
function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-compiler-media-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  return root;
}
function historicalFixture() {
  const bytes = fs.readFileSync(new URL('../fixtures/complete-edition/edition-bundle.json', import.meta.url));
  const state = JSON.parse(fs.readFileSync(new URL('../fixtures/complete-edition/compiler-state.json', import.meta.url), 'utf8'));
  return {bundle:JSON.parse(bytes), state, bundleDigest:mediaSha256(bytes)};
}

test('media positive fixture has exactly two qualified videos and two source-diverse podcasts without claiming live proof', () => {
  const fixture = makeMediaFixture();
  const before = structuredClone(fixture);
  const result = validateMediaSelection(fixture);
  assert.equal(result.result, 'PASS');
  assert.equal(result.contract_version, MEDIA_CONTRACT_VERSION);
  assert.equal(result.items.filter(item => item.type === 'video').length, 2);
  assert.equal(result.items.filter(item => item.type === 'podcast').length, 2);
  assert.equal(result.live_source_availability_certified, false);
  assert.deepEqual(fixture, before, 'qualification must not rewrite original metadata or accepted story records');
});

test('I03-T01 video freshness accepts exactly 72 hours and rejects one second older at the original cutoff', () => {
  for (const [value, expected] of [['2026-10-05T00:00:00Z', 'ELIGIBLE'], ['2026-10-04T23:59:59Z', 'INELIGIBLE']]) {
    assert.equal(evaluateMediaFreshness('video', instant(value), CUTOFF).status, expected, value);
    const fixture = changed(({bundle}) => { bundle.videos[0].publication = instant(value); });
    if (expected === 'ELIGIBLE') assert.equal(validateMediaSelection(fixture).result, 'PASS');
    else assert.throws(() => validateMediaSelection(fixture), /freshness INELIGIBLE: too_old/);
  }
});

test('I03-T02 the article seven-day fallback cannot admit an October 1 video at the October 8 cutoff', () => {
  const fixture = changed(({bundle}) => {
    Object.assign(bundle.videos[0], {publication:instant('2026-10-01T00:00:00Z'), freshness_band:'fallback_7d', freshness_fallback_reason:reason, verified:true});
  });
  assert.throws(() => validateMediaSelection(fixture), /freshness INELIGIBLE: too_old/);
});

test('I03-T03 exact video seconds determine 10-, 15- and 20-minute bands with documented fallbacks', () => {
  for (const [seconds, band] of [[600,'preferred_10m'], [601,'fallback_15m'], [900,'fallback_15m'], [901,'last_resort_20m'], [1200,'last_resort_20m']]) {
    const fixture = changed(({bundle}) => {
      Object.assign(bundle.videos[0], {duration_seconds:seconds, duration_band:band, duration_fallback_reason:seconds > 600 ? reason : null});
    });
    assert.equal(mediaDurationBand('video', seconds), band);
    assert.equal(validateMediaSelection(fixture).items[0].duration_band, band, String(seconds));
    if (seconds > 600) {
      fixture.bundle.videos[0].duration_fallback_reason = null;
      assert.throws(() => validateMediaSelection(fixture), /duration fallback documented rationale/);
    }
  }
  const fixture = changed(({bundle}) => {
    Object.assign(bundle.videos[0], {duration_seconds:1201, duration_band:'last_resort_20m', duration_fallback_reason:reason});
  });
  assert.throws(() => validateMediaSelection(fixture), /video duration exceeds 1200 seconds/);
});

test('podcast duration has no ceiling but does not license a long video selection', () => {
  const fixture = changed(({bundle}) => { bundle.podcasts[0].duration_seconds = 14_400; });
  assert.equal(validateMediaSelection(fixture).items[2].duration_band, 'no_ceiling');
  assert.throws(() => mediaDurationBand('video', 14_400), /video duration exceeds/);
});

test('podcast freshness keeps the 48-hour preference, seven-day fallback and exceptional 30-day boundaries', () => {
  for (const [age, band] of [[48*3600,'preferred_48h'], [48*3600+1,'fallback_7d'], [168*3600,'fallback_7d'], [168*3600+1,'exceptional_30d'], [720*3600,'exceptional_30d']]) {
    const value = new Date(Date.parse(CUTOFF) - age*1000).toISOString();
    const fixture = changed(({bundle}) => {
      Object.assign(bundle.podcasts[0], {publication:instant(value), freshness_band:band, freshness_fallback_reason:band === 'preferred_48h' ? null : reason});
    });
    assert.equal(validateMediaSelection(fixture).items[2].freshness_band, band, String(age));
    if (band !== 'preferred_48h') {
      fixture.bundle.podcasts[0].freshness_fallback_reason = null;
      assert.throws(() => validateMediaSelection(fixture), /freshness fallback documented rationale/);
    }
  }
  const value = new Date(Date.parse(CUTOFF) - (720*3600+1)*1000).toISOString();
  const fixture = changed(({bundle}) => {
    Object.assign(bundle.podcasts[0], {publication:instant(value), freshness_band:'exceptional_30d', freshness_fallback_reason:reason});
  });
  assert.throws(() => validateMediaSelection(fixture), /freshness INELIGIBLE: too_old/);
});

test('I03-T04 selected destinations reject channel, show and generic listings even with verified=true', () => {
  const cases = [
    ['videos', 'https://www.youtube.com/@SyntheticChannel/videos'],
    ['videos', 'https://www.youtube.com/playlist?list=synthetic'],
    ['videos', 'https://www.youtube.com/watch'],
    ['podcasts', 'https://podcast1.example/show'],
    ['podcasts', 'https://podcast1.example/episodes'],
    ['podcasts', 'https://open.spotify.com/show/FixtureShow'],
    ['podcasts', 'https://podcasts.apple.com/us/podcast/synthetic-show/id123456']
  ];
  for (const [collection, url] of cases) {
    const fixture = changed(({bundle}) => { Object.assign(bundle[collection][0], {url, verified:true}); });
    assert.throws(() => validateMediaSelection(fixture), /destination|listing/, url);
  }
});

test('I03-T04 exact video URL and channel identity must agree with canonical item/source IDs', () => {
  for (const mutate of [
    item => { item.item_id = 'OtherVid001'; },
    item => { item.url += '&v=OtherVid001'; },
    item => { item.source_id = 'SyntheticChannel'; },
    item => { item.source_url = 'https://www.youtube.com/@SyntheticChannel'; }
  ]) {
    const fixture = changed(({bundle}) => mutate(bundle.videos[0]));
    assert.throws(() => validateMediaSelection(fixture), /exact .* identity|exact YouTube video destination|exact item ID disagree/);
  }
  const item = makeMediaFixture().bundle.videos[0];
  const originalKey = validateDirectMediaIdentity(item).item_key;
  item.url = 'https://youtu.be/' + item.item_id + '?si=tracking#position';
  assert.equal(validateDirectMediaIdentity(item).item_key, originalKey, 'alternate exact video URLs preserve identity');
});

test('I03-T04 podcast diversity rejects shared canonical show ID, canonical URL or normalized show name', () => {
  for (const field of ['source_id', 'source_url', 'source']) {
    const fixture = changed(({bundle}) => {
      bundle.podcasts[1][field] = field === 'source' ? '  SYNTHETIC Podcast 1!!! ' : bundle.podcasts[0][field];
    });
    assert.throws(() => validateMediaSelection(fixture), /two distinct canonical shows/, field);
  }
  const fixture = changed(({bundle}) => {
    bundle.podcasts[1].source_url = bundle.podcasts[0].source_url + '/?utm_source=mirror#about';
  });
  assert.throws(() => validateMediaSelection(fixture), /two distinct canonical shows/);
});

test('duplicate media IDs and mirrored exact episode identities cannot fill two slots', () => {
  for (const field of ['id', 'item_id', 'url']) {
    const fixture = changed(({bundle}) => {
      bundle.podcasts[1][field] = bundle.podcasts[0][field];
    });
    assert.throws(() => validateMediaSelection(fixture), /duplicate selected media identity/, field);
  }
  const fixture = changed(({bundle}) => {
    const podcast = bundle.podcasts[1], video = bundle.videos[0];
    Object.assign(podcast, {item_id:video.item_id, url:'https://youtu.be/' + video.item_id});
  });
  assert.throws(() => validateMediaSelection(fixture), /duplicate selected media identity/);
});

test('known podcast platforms accept exact episodes and reject disagreement with the selected episode ID', () => {
  for (const [url, itemId] of [
    ['https://open.spotify.com/episode/FixtureEpisode001', 'FixtureEpisode001'],
    ['https://podcasts.apple.com/us/podcast/synthetic/id123456?i=987654321', '987654321']
  ]) {
    const fixture = changed(({bundle}) => { Object.assign(bundle.podcasts[0], {url, item_id:itemId}); });
    assert.equal(validateMediaSelection(fixture).result, 'PASS', url);
    fixture.bundle.podcasts[0].item_id = 'different-episode';
    assert.throws(() => validateMediaSelection(fixture), /exact item ID disagree/);
  }
});

test('I03-T05 unknown, zero, noninteger and unsupported runtimes remain unresolved for both media types', () => {
  for (const collection of ['videos', 'podcasts']) for (const seconds of [null, undefined, 0, -1, 1.5, '600', Number.MAX_SAFE_INTEGER+1]) {
    const fixture = changed(({bundle}) => { bundle[collection][0].duration_seconds = seconds; });
    assert.throws(() => validateMediaSelection(fixture), /observed duration_seconds required/, `${collection}: ${seconds}`);
  }
});

test('I03-T05 future publication and missing or impossible publication metadata reject', () => {
  for (const publication of [
    instant('2026-10-08T00:00:01Z'),
    instant('2026-02-30T12:00:00Z'),
    instant('2026-10-07T12:00:00'),
    dateOnly('2026-13-01'),
    {original_value:null, precision:'unknown', timezone:null}
  ]) {
    const fixture = changed(({bundle}) => { bundle.videos[0].publication = publication; });
    assert.throws(() => validateMediaSelection(fixture), /future|publication|timestamp/);
  }
});

test('I03-T05 date-only publication remains an interval and uncertain eligibility never becomes a midnight timestamp', () => {
  const inputs = [
    [dateOnly('2026-10-05'), 'ELIGIBLE'],
    [dateOnly('2026-10-04', null), 'UNRESOLVED'],
    [dateOnly('2026-10-08'), 'UNRESOLVED'],
    [dateOnly('2026-10-06', null), 'ELIGIBLE'],
    [dateOnly('2026-10-04'), 'INELIGIBLE'],
    [dateOnly('2026-10-09'), 'INELIGIBLE']
  ];
  for (const [publication, expected] of inputs) {
    const before = structuredClone(publication);
    const result = evaluateMediaFreshness('video', publication, CUTOFF);
    assert.equal(result.status, expected, JSON.stringify(publication));
    assert.equal(result.interval.precision, 'date');
    assert.equal(result.interval.end_exclusive, true);
    assert.equal(result.interval.original_value, publication.original_value);
    assert.deepEqual(publication, before);
    const fixture = changed(({bundle}) => { bundle.videos[0].publication = publication; });
    if (expected === 'ELIGIBLE') assert.equal(validateMediaSelection(fixture).result, 'PASS');
    else assert.throws(() => validateMediaSelection(fixture), /freshness (UNRESOLVED|INELIGIBLE)/);
  }
  const unknown = publicationInterval(dateOnly('2026-10-06', null));
  assert.equal(unknown.latest_ms - unknown.earliest_ms, 50*HOUR, 'unknown zone conservatively spans UTC+14 through UTC-12');
});

test('date-only timezone intervals preserve Chicago 23-hour and 25-hour DST days', () => {
  for (const [day, start, end, hours] of [
    ['2026-03-08', '2026-03-08T06:00:00Z', '2026-03-09T05:00:00Z', 23],
    ['2026-11-01', '2026-11-01T05:00:00Z', '2026-11-02T06:00:00Z', 25]
  ]) {
    const interval = publicationInterval(dateOnly(day, 'America/Chicago'));
    assert.equal(interval.earliest_ms, Date.parse(start), day);
    assert.equal(interval.latest_ms, Date.parse(end), day);
    assert.equal(interval.latest_ms - interval.earliest_ms, hours*HOUR);
  }
  const offset = publicationInterval(dateOnly('2026-10-07', '+05:30'));
  assert.equal(offset.earliest_ms, Date.parse('2026-10-06T18:30:00Z'));
  assert.equal(offset.latest_ms, Date.parse('2026-10-07T18:30:00Z'));
});

test('exact timestamp parsing rejects impossible dates/offsets and conflicting declared zones', () => {
  for (const value of ['2026-02-29T00:00:00Z', '2026-10-07T24:00:00Z', '2026-10-07T12:60:00Z', '2026-10-07T12:00:60Z', '2026-10-07T12:00:00+14:01', '2026-10-07T12:00:00+15:00', '2026-10-07T12:00:00']) {
    assert.throws(() => parseMediaInstant(value), /valid|invalid/, value);
  }
  assert.equal(parseMediaInstant('2024-02-29T12:00:00+05:30'), Date.parse('2024-02-29T06:30:00Z'));
  assert.throws(() => publicationInterval({original_value:'2026-10-07T12:00:00Z', precision:'second', timezone:'America/Chicago'}), /timezone conflicts/);
  assert.throws(() => publicationInterval(dateOnly('2026-10-07', 'Invented/Zone')), /timezone invalid/);
  assert.throws(() => publicationInterval(dateOnly('2026-10-07', '')), /unknown date-only timezone/);
  const chicago = publicationInterval({original_value:'2026-10-07T12:00:00-05:00', precision:'second', timezone:'America/Chicago'});
  assert.equal(chicago.earliest_ms, Date.parse('2026-10-07T17:00:00Z'));
});

test('selection retries cannot change the recorded original research cutoff', () => {
  const mutations = [
    fixture => { fixture.bundle.research_cutoff_at = '2026-10-09T00:00:00Z'; },
    fixture => { fixture.bundle.videos[0].research_cutoff_at = '2026-10-09T00:00:00Z'; },
    fixture => { fixture.evidence.research_cutoff_at = '2026-10-09T00:00:00Z'; },
    fixture => { delete fixture.state.research_cutoff_at; }
  ];
  for (const mutate of mutations) {
    const fixture = makeMediaFixture();
    mutate(fixture);
    assert.throws(() => validateMediaSelection(fixture), /cutoff/);
  }
});

test('I03-T06 every Summary, Why and Connection pair rejects exact-normalized duplication', () => {
  for (const collection of ['videos', 'podcasts']) for (const [from, to] of [['summary','why_it_matters'], ['summary','connection_to_brief'], ['why_it_matters','connection_to_brief']]) {
    const fixture = changed(({bundle}) => {
      const item = bundle[collection][0];
      item[to] = '<b>' + item[from].toUpperCase().replaceAll(' ', '&nbsp;') + '</b>!!!';
    });
    assert.throws(() => validateMediaSelection(fixture), /distinct normalized reader fields/, collection + ' ' + to);
  }
  assert.equal(normalizeMediaCopy('ＴＥＳＴ — ev\u200bidence &#38; review'), normalizeMediaCopy('test evidence & review'));
});

test('I03-T06 distinct reader copy needs a current semantic review tied to exact copy and selected coverage', () => {
  for (const change of ['copy', 'coverage', 'failed_review', 'missing_check', 'new_review_service', 'missing_rationale', 'repeated_rationale', 'changed_support']) {
    const fixture = makeMediaFixture();
    const item = fixture.bundle.videos[0];
    const review = evidenceRecord(fixture, item, 'reader_review_ref');
    if (change === 'copy') item.why_it_matters += ' A new unreviewed professional claim has been added.';
    if (change === 'coverage') fixture.bundle.stories[0].headline = 'A materially different story changes the claimed connection';
    if (change === 'failed_review') review.result = 'FAIL';
    if (change === 'missing_check') review.checks.semantically_distinct = false;
    if (change === 'new_review_service') review.scope = 'new_background_review_service';
    if (change === 'missing_rationale') delete review.rationale.why_it_matters;
    if (change === 'repeated_rationale') review.rationale.why_it_matters = review.rationale.summary;
    if (change === 'changed_support') review.support_refs = ['unreviewed-support'];
    assert.throws(() => validateMediaSelection(fixture), /review|rationale/, change);
  }
});

test('I03-T06 a negative semantic review rejects paraphrased duplication that exact normalization cannot identify', () => {
  const fixture = changed(({bundle}) => {
    bundle.videos[0].why_it_matters = 'This synthetic video shows evidence being attached to work, then reviewed and released.';
  });
  const item = fixture.bundle.videos[0];
  assert.notEqual(normalizeMediaCopy(item.summary), normalizeMediaCopy(item.why_it_matters));
  const review = evidenceRecord(fixture, item, 'reader_review_ref');
  review.checks.semantically_distinct = false;
  review.result = 'FAIL';
  assert.throws(() => validateMediaSelection(fixture), /bounded semantic reader-value review required/);
});

test('Connection to the Brief must reference actual selected story identities and written podcast read time must remain positive', () => {
  for (const related of [[], ['not-selected'], ['fixture-story-01','fixture-story-01']]) {
    const fixture = changed(({bundle}) => { bundle.podcasts[0].related_story_ids = related; });
    assert.throws(() => validateMediaSelection(fixture), /Connection must bind selected story identities/);
  }
  for (const minutes of [undefined, null, 0, 1.5]) {
    const fixture = changed(({bundle}) => { bundle.podcasts[0].written_reading_time_minutes = minutes; });
    assert.throws(() => validateMediaSelection(fixture), /written podcast page reading time/);
  }
});

test('I03-T07 missing a second qualifying video or podcast fails without a reduced-count fallback', () => {
  for (const collection of ['videos', 'podcasts']) for (const count of [0,1,3]) {
    const fixture = changed(({bundle}) => {
      bundle[collection] = count === 3 ? [...bundle[collection], {...bundle[collection][0], id:'extra-media'}] : bundle[collection].slice(0,count);
    });
    // The third synthetic row shares evidence references; remove that incidental
    // conflict so this case isolates the count policy itself.
    fixture.evidence.records = [...new Map(fixture.evidence.records.map(row => [row.id,row])).values()];
    assert.throws(() => validateMediaSelection(fixture), /exactly two videos and two podcasts required/, collection + ':' + count);
  }
});

test('bare verified booleans cannot replace bounded, substantive media evidence', () => {
  for (const kind of ['metadata', 'content_support', 'reader_value_review']) {
    const fixture = makeMediaFixture();
    for (const item of [...fixture.bundle.videos,...fixture.bundle.podcasts]) item.verified = true;
    fixture.evidence.records = fixture.evidence.records.filter(row => row.kind !== kind);
    assert.throws(() => validateMediaSelection(fixture), /evidence reference missing/, kind);
  }
  const fixture = makeMediaFixture();
  const support = fixture.evidence.records.find(row => row.kind === 'content_support');
  support.source_excerpt = 'verified=true';
  assert.throws(() => validateMediaSelection(fixture), /substantive source excerpt/);
});

test('media evidence and selected records must match the current edition and versioned media contract', () => {
  for (const change of ['evidence_edition','evidence_version','item_version','item_type','contract_version']) {
    const fixture = makeMediaFixture();
    if (change === 'evidence_edition') fixture.evidence.edition_date = '2026-10-08';
    if (change === 'evidence_version') fixture.evidence.schema_version = 'daily-compiler-media-evidence-v0';
    if (change === 'item_version') fixture.bundle.videos[0].schema_version = 'daily-compiler-media-record-v0';
    if (change === 'item_type') fixture.bundle.videos[0].type = 'podcast';
    if (change === 'contract_version') fixture.bundle.media_contract_version = 'daily-compiler-media-contract-v0';
    assert.throws(() => validateMediaSelection(fixture), /contract|record version\/type/, change);
  }
});

test('retained metadata must support exact item/source identity, original date and exact runtime seconds', () => {
  for (const change of ['item_id','source_id','url','source_url','publication','seconds','original_title','authority','original_metadata']) {
    const fixture = makeMediaFixture();
    const item = fixture.bundle.videos[0];
    const metadata = evidenceRecord(fixture, item, 'metadata_ref');
    if (['item_id','source_id','url','source_url'].includes(change)) metadata[change] += '-different';
    if (change === 'publication') metadata.publication.original_value = '2026-10-07T13:00:00Z';
    if (change === 'seconds') metadata.duration.seconds = 599;
    if (change === 'original_title') metadata.original_metadata.title = 'A different original title';
    if (change === 'authority') metadata.authority = 'unverified_search_snippet';
    if (change === 'original_metadata') delete metadata.original_metadata;
    assert.throws(() => validateMediaSelection(fixture), /evidence identity mismatch|unsupported by retained|runtime original metadata|original item\/source metadata|authoritative evidence/, change);
  }
});

test('observed clock and ISO runtimes are checked against exact seconds rather than rounded aliases', () => {
  for (const [original, format] of [['10:00','clock'], ['00:10:00','clock'], ['PT10M','iso8601'], ['PT600S','iso8601']]) {
    const fixture = makeMediaFixture();
    const item = fixture.bundle.videos[0];
    const metadata = evidenceRecord(fixture, item, 'metadata_ref');
    Object.assign(metadata.duration, {original_value:original, format});
    // Each positive case represents a review of the deliberately changed source
    // runtime format, so bind its review to that exact retained observation.
    evidenceRecord(fixture, item, 'reader_review_ref').reviewed_evidence_sha256 = mediaReviewedEvidenceSha256(item, fixture.evidence.records);
    assert.equal(validateMediaSelection(fixture).result, 'PASS', original);
  }
  for (const [original, format] of [['9:60','clock'], ['PT','iso8601'], ['10 minutes','seconds'], ['599','seconds']]) {
    const fixture = makeMediaFixture();
    const metadata = evidenceRecord(fixture, fixture.bundle.videos[0], 'metadata_ref');
    Object.assign(metadata.duration, {original_value:original, format});
    assert.throws(() => validateMediaSelection(fixture), /runtime/, original);
  }
  const fixture = changed(({bundle}) => { bundle.videos[0].duration_minutes = 9.99; });
  assert.throws(() => validateMediaSelection(fixture), /rounded runtime alias/);
});

test('derived freshness/runtime bands and legacy date aliases cannot contradict retained originals', () => {
  for (const [field, value, error] of [
    ['freshness_band','fallback_7d',/derived freshness band/],
    ['duration_band','fallback_15m',/derived duration band/],
    ['original_date','2026-10-06',/legacy date alias/],
    ['duration_fallback_reason',reason,/must be null in preferred band/]
  ]) {
    const fixture = changed(({bundle}) => { bundle.videos[0][field] = value; });
    assert.throws(() => validateMediaSelection(fixture), error, field);
  }
});

test('evidence references must be unique, bounded and support all three reader functions', () => {
  for (const change of ['duplicate_record','too_many_records','missing_support','duplicate_support','missing_field_support','review_before_evidence']) {
    const fixture = makeMediaFixture();
    const item = fixture.bundle.videos[0];
    const support = fixture.evidence.records.find(row => row.id === item.support_refs[0]);
    if (change === 'duplicate_record') fixture.evidence.records.push(structuredClone(fixture.evidence.records[0]));
    if (change === 'too_many_records') fixture.evidence.records.push(...Array.from({length:41}, (_,n) => ({id:'excess-'+n})));
    if (change === 'missing_support') item.support_refs = [];
    if (change === 'duplicate_support') item.support_refs.push(item.support_refs[0]);
    if (change === 'missing_field_support') delete support.supports.connection_to_brief;
    if (change === 'review_before_evidence') evidenceRecord(fixture,item,'reader_review_ref').reviewed_at = '2026-10-08T00:00:01Z';
    assert.throws(() => validateMediaSelection(fixture), /duplicate evidence ID|bounded substantive|substantive support references|source support|predates supporting evidence/, change);
  }
});

test('selected and supporting URLs reject plaintext transport and embedded credentials', () => {
  for (const url of ['http://example.com/episode/one', 'https://user:secret@example.com/episode/one']) {
    const fixture = changed(({bundle}) => { bundle.podcasts[0].url = url; });
    assert.throws(() => validateMediaSelection(fixture), /credential-free HTTPS URL/);
  }
  const fixture = makeMediaFixture();
  evidenceRecord(fixture,fixture.bundle.videos[0],'metadata_ref').evidence_url = 'http://example.com/evidence';
  assert.throws(() => validateMediaSelection(fixture), /credential-free HTTPS URL/);
});

test('sealed bundle qualification verifies retained media evidence bytes before using their claims', t => {
  const fixture = writeMediaFixture(tempRoot(t));
  assert.equal(validateBundleMedia(fixture).result, 'PASS');
  assert.deepEqual(readMediaEvidence(fixture.bundle.media_evidence, fixture.repoRoot), fixture.evidence);
  const evidencePath = path.join(fixture.repoRoot, fixture.bundle.media_evidence.path);
  fs.appendFileSync(evidencePath, ' ');
  assert.throws(() => validateBundleMedia(fixture), /retained media evidence hash mismatch/);
});

test('rehashing contradictory evidence does not bypass semantic media qualification', t => {
  const fixture = makeMediaFixture();
  evidenceRecord(fixture,fixture.bundle.videos[0],'metadata_ref').duration.original_value = '599';
  const written = writeMediaFixture(tempRoot(t), fixture);
  assert.throws(() => validateBundleMedia(written), /runtime original metadata/);
});

test('retained evidence paths reject traversal, absolute paths, escaping symlinks and oversized payloads', t => {
  const fixture = writeMediaFixture(tempRoot(t));
  for (const filePath of ['../outside.json', '/tmp/outside.json', 'fixtures/./media/evidence.json', 'fixtures/../../outside.json']) {
    assert.throws(() => readMediaEvidence({...fixture.bundle.media_evidence,path:filePath}, fixture.repoRoot), /retained media evidence path\/hash/, filePath);
  }
  const outside = tempRoot(t);
  const outsideFile = path.join(outside, 'evidence.json');
  fs.writeFileSync(outsideFile, '{}');
  fs.symlinkSync(outsideFile, path.join(fixture.repoRoot, 'linked.json'));
  assert.throws(() => readMediaEvidence({path:'linked.json',sha256:mediaSha256('{}')}, fixture.repoRoot), /escapes repository root/);
  const large = Buffer.alloc(1024*1024+1, ' ');
  fs.writeFileSync(path.join(fixture.repoRoot, 'large.json'), large);
  assert.throws(() => readMediaEvidence({path:'large.json',sha256:mediaSha256(large)}, fixture.repoRoot), /exceeds bounded size/);
});

test('I03-T08 exact registered historical fixture reads preserve its old recorded contract and all original bytes', () => {
  const fixture = historicalFixture();
  const before = structuredClone(fixture);
  const result = validateHistoricalMedia(fixture);
  assert.equal(result.result, 'HISTORICAL_COMPATIBILITY');
  assert.equal(result.contract_version, 'daily-compiler-editorial-contract-v1');
  assert.equal(result.current_media_qualification, false);
  assert.equal(result.bundle_sha256, fixture.bundleDigest);
  assert.deepEqual(fixture, before);
  assert.equal(historicalFixture().bundleDigest, fixture.bundleDigest, 'historical file bytes remain unchanged');
});

test('I03-T08 new or altered bundles cannot use historical schema labels to bypass current media qualification', () => {
  for (const change of ['digest','execution','branch','edition','mixed_current_authority']) {
    const fixture = historicalFixture();
    if (change === 'digest') fixture.bundleDigest = '0'.repeat(64);
    if (change === 'execution') fixture.state.execution_id += '-new';
    if (change === 'branch') fixture.state.branch += '-new';
    if (change === 'edition') fixture.bundle.edition_date = '2026-10-09';
    if (change === 'mixed_current_authority') fixture.bundle.media_contract_version = MEDIA_CONTRACT_VERSION;
    assert.throws(() => validateHistoricalMedia(fixture), /unregistered legacy bundle|legacy bundle cannot mix/, change);
  }
});

test('I03-T08 registered terminal history cannot be reopened as active semantic production', () => {
  const registry = JSON.parse(fs.readFileSync(new URL('../contracts/media-compatibility.json', import.meta.url), 'utf8'));
  const terminalEntries = registry.entries.filter(entry => entry.purpose === 'immutable_terminal_history');
  assert.ok(terminalEntries.length > 0);
  for (const entry of terminalEntries) for (const [stateName, stage] of [['PRODUCING','CONTENT'], ['SHADOW_VERIFIED','CONTENT'], ['BUNDLE_READY','VERIFY']]) {
    // This synthetic descriptor exercises the terminal-state restriction only;
    // it does not certify the original remote bundle bytes or live media.
    const fixture = {
      bundle:{schema_version:'daily-compiler-edition-bundle-v1', editorial_contract_version:'daily-compiler-editorial-contract-v1', edition_date:entry.edition_date},
      state:{execution_id:entry.execution_id, branch:entry.branch, state:stateName, stage},
      bundleDigest:entry.bundle_sha256
    };
    assert.throws(() => validateHistoricalMedia(fixture), /terminal read\/rebuild only/, entry.source_commit + ':' + stateName + '/' + stage);
  }
});
