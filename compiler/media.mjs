import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MEDIA_CONTRACT_VERSION = 'daily-compiler-media-contract-v1';
export const MEDIA_RECORD_VERSION = 'daily-compiler-media-record-v1';
export const MEDIA_EVIDENCE_VERSION = 'daily-compiler-media-evidence-v1';
const POLICY = JSON.parse(fs.readFileSync(new URL('../contracts/media-contract.json', import.meta.url), 'utf8'));
if (POLICY.schema_version !== MEDIA_CONTRACT_VERSION) throw new Error('media policy version mismatch');
const HOUR = 3600000;
const COPY_FIELDS = ['summary', 'why_it_matters', 'connection_to_brief'];
const CHECKS = ['summary_describes_content', 'why_explains_professional_value', 'connection_identifies_selected_coverage', 'semantically_distinct'];
const fail = message => { throw new Error('media: ' + message); };
const text = (value, name, minimum = 1) => {
  if (typeof value !== 'string' || value.trim().length < minimum) fail(name + ' missing or too short');
  return value;
};
const same = (a, b) => canonical(a) === canonical(b);
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const mediaSha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const mediaCopySha256 = item => mediaSha256(canonical(Object.fromEntries(
  ['id', 'item_id', 'source_id', 'url', 'title', ...COPY_FIELDS, 'related_story_ids'].map(key => [key, item[key]])
)));
export const mediaStoryContextSha256 = stories => mediaSha256(canonical(stories.map(story => ({
  id: story.id, headline: story.headline, summary: story.summary, why_it_matters: story.why_it_matters,
  source: story.source, focus: story.focus, topics: story.topics,
  related_coverage: story.related_coverage, coverage_labels: story.coverage_labels
}))));
export function mediaReviewedEvidenceSha256(item, evidenceRecords) {
  const records = evidenceRecords instanceof Map ? evidenceRecords : new Map(evidenceRecords.map(record => [record.id, record]));
  return mediaSha256(canonical({metadata:records.get(item.metadata_ref),support:item.support_refs.map(ref => records.get(ref))}));
}

export function normalizeMediaCopy(value) {
  return String(value ?? '').replace(/&#(x[\da-f]+|\d+);/gi, (match, number) => {
    const n = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
  }).replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_, name) => ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[name.toLowerCase()]))
    .replace(/<[^>]*>/g, ' ').normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const instant = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}
function offsetMinutes(value) {
  if (['UTC', 'Etc/UTC', 'Z'].includes(value)) return 0;
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return null;
  const h = Number(match[2]), m = Number(match[3]);
  if (h > 14 || m > 59 || (h === 14 && m !== 0)) fail('timezone offset invalid');
  return (match[1] === '-' ? -1 : 1) * (h * 60 + m);
}
export function parseMediaInstant(value, name = 'timestamp') {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value || '');
  if (!match || !validDate(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) fail(name + ' must be a valid timezone-qualified timestamp');
  offsetMinutes(match[6]);
  const result = Date.parse(value);
  if (!Number.isFinite(result)) fail(name + ' invalid');
  return result;
}
function localParts(instant, timezone) {
  try {
    return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(new Date(instant)).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  } catch { fail('timezone invalid'); }
}
function localOffset(instant, timezone) {
  const p = localParts(instant, timezone);
  return (Date.UTC(Number(p.year), Number(p.month)-1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - Math.floor(instant / 1000) * 1000) / 60000;
}
function dayStart(date, timezone) {
  const utc = Date.parse(date + 'T00:00:00Z');
  const fixed = offsetMinutes(timezone);
  if (fixed !== null) return utc - fixed * 60000;
  let candidate = utc;
  for (let n = 0; n < 4; n++) candidate = utc - localOffset(candidate, timezone) * 60000;
  const p = localParts(candidate, timezone);
  if (`${p.year}-${p.month}-${p.day}` !== date || p.hour !== '00' || p.minute !== '00' || p.second !== '00') fail('date-only timezone boundary unresolved; obtain better evidence');
  return candidate;
}

// These are bounds on possible publication times, never a claimed publication instant.
export function publicationInterval(publication) {
  if (!publication || !['second', 'date'].includes(publication.precision)) fail('publication precision unresolved');
  if (publication.precision === 'second') {
    const instant = parseMediaInstant(publication.original_value, 'original publication');
    const zone = text(publication.timezone, 'publication timezone');
    const suffix = publication.original_value.match(/(Z|[+-]\d{2}:\d{2})$/)[1];
    const observedOffset = offsetMinutes(suffix);
    const declaredOffset = offsetMinutes(zone) ?? localOffset(instant, zone);
    if (observedOffset !== declaredOffset) fail('publication timezone conflicts with original value');
    return {earliest_ms:instant, latest_ms:instant, end_exclusive:false, original_value:publication.original_value, precision:'second', timezone:zone};
  }
  if (!validDate(publication.original_value)) fail('original publication date invalid');
  const utc = Date.parse(publication.original_value + 'T00:00:00Z');
  const nextDate = new Date(utc + 24 * HOUR).toISOString().slice(0, 10);
  const zone = publication.timezone;
  if (zone !== null && (typeof zone !== 'string' || !zone)) fail('unknown date-only timezone must be null');
  return {
    earliest_ms:zone === null ? utc - 14 * HOUR : dayStart(publication.original_value, zone),
    latest_ms:zone === null ? utc + 36 * HOUR : dayStart(nextDate, zone),
    end_exclusive:true, original_value:publication.original_value, precision:'date', timezone:zone
  };
}

export function evaluateMediaFreshness(type, publication, researchCutoff) {
  if (!['video', 'podcast'].includes(type)) fail('media type invalid');
  const cutoff = parseMediaInstant(researchCutoff, 'research cutoff');
  const interval = publicationInterval(publication);
  const maxHours = type === 'video' ? POLICY.videos.max_age_hours : POLICY.podcasts.exceptional_age_hours;
  const lower = cutoff - maxHours * HOUR;
  const tooOld = interval.end_exclusive ? interval.latest_ms <= lower : interval.latest_ms < lower;
  if (tooOld || interval.earliest_ms > cutoff) return {status:'INELIGIBLE', reason:tooOld?'too_old':'future', band:null, interval};
  if (interval.earliest_ms < lower || interval.latest_ms > cutoff) return {status:'UNRESOLVED', reason:'publication_interval_crosses_eligibility_boundary', band:null, interval};
  const oldestHours = (cutoff - interval.earliest_ms) / HOUR;
  const band = type === 'video' ? 'within_72h' : oldestHours <= POLICY.podcasts.preferred_age_hours ? 'preferred_48h' : oldestHours <= POLICY.podcasts.fallback_age_hours ? 'fallback_7d' : 'exceptional_30d';
  return {status:'ELIGIBLE', band, interval};
}
export function mediaDurationBand(type, seconds) {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) fail('observed duration_seconds required; unknown runtime remains unresolved');
  if (type === 'podcast') return 'no_ceiling';
  if (type !== 'video' || seconds > POLICY.videos.last_resort_max_seconds) fail('video duration exceeds 1200 seconds');
  return seconds <= POLICY.videos.preferred_max_seconds ? 'preferred_10m' : seconds <= POLICY.videos.fallback_max_seconds ? 'fallback_15m' : 'last_resort_20m';
}
function parseObservedDuration(duration) {
  if (!duration || typeof duration.original_value !== 'string') fail('original runtime metadata required');
  let seconds;
  if (duration.format === 'seconds' && /^\d+$/.test(duration.original_value)) seconds = Number(duration.original_value);
  if (duration.format === 'clock' && /^\d+(?::\d{2}){1,2}$/.test(duration.original_value)) {
    const parts = duration.original_value.split(':').map(Number);
    if (parts.slice(1).some(x => x >= 60)) fail('runtime clock metadata invalid');
    seconds = parts.reduce((n, part) => n * 60 + part, 0);
  }
  if (duration.format === 'iso8601') {
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration.original_value);
    if (m && m.slice(1).some(x => x !== undefined)) seconds = Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  }
  if (!Number.isSafeInteger(seconds) || seconds <= 0 || seconds !== duration.seconds) fail('runtime original metadata does not support exact seconds');
  return seconds;
}

function safeUrl(value, name) {
  let url;
  try { url = new URL(value); } catch { fail(name + ' invalid URL'); }
  if (url.protocol !== 'https:' || url.username || url.password) fail(name + ' must be a credential-free HTTPS URL');
  return url;
}
function canonicalUrl(value) {
  const url = safeUrl(value, 'identity');
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|si$|feature$)/i.test(key)) url.searchParams.delete(key);
  return url.href.replace(/\/$/, '');
}
export function validateDirectMediaIdentity(item) {
  for (const key of ['id','item_id','source_id','source','source_url','title','url']) text(item[key], key);
  const url = safeUrl(item.url, 'selected destination');
  safeUrl(item.source_url, 'canonical source');
  if (canonicalUrl(item.url) === canonicalUrl(item.source_url)) fail('selected destination is a source/show listing');
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let parsedId = null;
  const platformSourceKeys = new Set();
  if (['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
    parsedId = host === 'youtu.be' ? /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1]
      : url.pathname === '/watch' ? (url.searchParams.getAll('v').length === 1 ? url.searchParams.get('v') : null)
      : /^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    if (!/^[\w-]{11}$/.test(parsedId || '')) fail('exact YouTube video destination required');
    if (item.type === 'video' && (!/^UC[\w-]{22}$/.test(item.source_id) || canonicalUrl(item.source_url) !== `https://youtube.com/channel/${item.source_id}`)) fail('exact YouTube channel identity required');
  } else if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    parsedId = /^\/(?:video\/)?(\d+)\/?$/.exec(url.pathname)?.[1];
    if (!parsedId) fail('exact Vimeo video destination required');
  } else if (host === 'open.spotify.com') {
    parsedId = /^\/episode\/([A-Za-z0-9]+)\/?$/.exec(url.pathname)?.[1];
    if (!parsedId || item.type !== 'podcast') fail('exact podcast episode destination required');
  } else if (host === 'podcasts.apple.com') {
    parsedId = /\/podcast\/[^/]+\/id\d+\/?$/.test(url.pathname) && url.searchParams.getAll('i').length === 1 ? url.searchParams.get('i') : null;
    if (!/^\d+$/.test(parsedId || '') || item.type !== 'podcast') fail('exact Apple podcast episode destination required');
    platformSourceKeys.add('apple:' + /\/id(\d+)\/?$/.exec(url.pathname)[1]);
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts.at(-1)?.toLowerCase();
    if (!parts.length || parts.some(part => /^(@|search$|channels?$|playlists?$)/i.test(part)) || /^(videos?|podcasts?|episodes?|shows?|latest|feed(?:\.xml)?|index\.(?:html?|php))$/.test(last) || /\/(?:shows?|podcasts?)\/[^/]+\/?$/i.test(url.pathname)) fail('generic media listing is not a selected item');
  }
  if (parsedId !== null && parsedId !== item.item_id) fail('selected URL and exact item ID disagree');
  const source = safeUrl(item.source_url, 'canonical source');
  const sourceHost = source.hostname.toLowerCase().replace(/^www\./, '');
  if (sourceHost === 'open.spotify.com') {
    const show = /^\/show\/([A-Za-z0-9]+)\/?$/.exec(source.pathname)?.[1];
    if (!show) fail('canonical Spotify show identity required');
    platformSourceKeys.add('spotify:' + show);
  } else if (sourceHost === 'podcasts.apple.com') {
    const show = /\/podcast\/[^/]+\/id(\d+)\/?$/.exec(source.pathname)?.[1];
    if (!show || source.searchParams.has('i')) fail('canonical Apple show identity required');
    platformSourceKeys.add('apple:' + show);
  }
  return {item_key:host.includes('youtu') ? 'youtube:'+item.item_id : canonicalUrl(item.url), source_key:canonicalUrl(item.source_url), platform_source_keys:[...platformSourceKeys]};
}

function recordFor(records, ref, kind, item) {
  const record = records.get(ref);
  if (!record || record.kind !== kind) fail(kind + ' evidence reference missing: ' + ref);
  for (const key of ['type','item_id','source_id','url','source_url']) if (record[key] !== item[key]) fail(kind + ' evidence identity mismatch: ' + key);
  return record;
}
function sourceObservation(record) {
  if (!['publisher','official_channel','platform'].includes(record.authority)) fail('authoritative evidence provenance missing');
  safeUrl(record.evidence_url, 'evidence destination');
  return parseMediaInstant(record.retrieved_at, 'evidence retrieval time');
}
function fallback(reason, needed, name) {
  if (needed) text(reason, name + ' documented rationale', 24);
  else if (reason !== null) fail(name + ' must be null in preferred band');
}

// The same gate is used during CONTENT selection and by the sealed bundle compiler.
// Structural checks bind retained observations; their factual truth still requires source review.
export function validateMediaSelection({bundle, state, evidence}) {
  if (bundle.media_contract_version !== MEDIA_CONTRACT_VERSION) fail('current media contract required');
  parseMediaInstant(bundle.research_cutoff_at, 'research cutoff');
  if (!state || state.edition_date !== bundle.edition_date) fail('selection must match the persisted edition identity');
  if (!state || state.research_cutoff_at !== bundle.research_cutoff_at) fail('cutoff must match original persisted state');
  if (evidence?.schema_version !== MEDIA_EVIDENCE_VERSION || evidence.research_cutoff_at !== bundle.research_cutoff_at || evidence.edition_date !== bundle.edition_date) fail('evidence contract/edition/cutoff mismatch');
  if (!Array.isArray(evidence.records) || evidence.records.length > POLICY.evidence.maximum_records) fail('bounded substantive evidence records required');
  const records = new Map();
  for (const record of evidence.records) {
    text(record.id, 'evidence ID');
    if (records.has(record.id)) fail('duplicate evidence ID');
    records.set(record.id, record);
  }
  if (!Array.isArray(bundle.videos) || bundle.videos.length !== 2 || !Array.isArray(bundle.podcasts) || bundle.podcasts.length !== 2) fail('exactly two videos and two podcasts required; no reduced-count fallback');
  if (!Array.isArray(bundle.stories) || bundle.stories.length !== 6) fail('selected story context required');
  const storyIds = new Set(bundle.stories.map(x => x.id));
  if (storyIds.size !== 6 || [...storyIds].some(id => typeof id !== 'string' || !id)) fail('selected story identities must be unique');
  const seen = new Set(), sourceIds = new Set(), sourceUrls = new Set(), sourceNames = new Set(), platformSources = new Set();
  const results = [];
  for (const [type, items] of [['video',bundle.videos], ['podcast',bundle.podcasts]]) for (const item of items) {
    if (item.schema_version !== MEDIA_RECORD_VERSION || item.type !== type) fail('media record version/type mismatch');
    if (item.research_cutoff_at !== bundle.research_cutoff_at) fail('selected media cutoff changed');
    const identity = validateDirectMediaIdentity(item);
    for (const key of ['id:'+item.id, 'item:'+identity.item_key, 'exact:'+type+':'+item.item_id]) {
      if (seen.has(key)) fail('duplicate selected media identity');
      seen.add(key);
    }
    if (type === 'podcast') {
      const name = normalizeMediaCopy(item.source);
      if (sourceIds.has(item.source_id) || sourceUrls.has(identity.source_key) || sourceNames.has(name) || identity.platform_source_keys.some(key => platformSources.has(key))) fail('podcasts require two distinct canonical shows');
      sourceIds.add(item.source_id); sourceUrls.add(identity.source_key); sourceNames.add(name);
      identity.platform_source_keys.forEach(key => platformSources.add(key));
      if (!Number.isSafeInteger(item.written_reading_time_minutes) || item.written_reading_time_minutes < 1) fail('written podcast page reading time required');
    } else text(item.focus, 'video focus');
    const normalized = COPY_FIELDS.map(field => normalizeMediaCopy(text(item[field], field, 24)));
    if (normalized.some(x => !x) || new Set(normalized).size !== 3) fail('Summary, Why and Connection must be distinct normalized reader fields');
    if (!Array.isArray(item.related_story_ids) || !item.related_story_ids.length || new Set(item.related_story_ids).size !== item.related_story_ids.length || item.related_story_ids.some(id => !storyIds.has(id))) fail('Connection must bind selected story identities');
    const freshness = evaluateMediaFreshness(type, item.publication, bundle.research_cutoff_at);
    if (freshness.status !== 'ELIGIBLE') fail('freshness '+freshness.status+': '+freshness.reason);
    if (item.freshness_band !== freshness.band) fail('derived freshness band mismatch');
    const durationBand = mediaDurationBand(type, item.duration_seconds);
    if (item.duration_band !== durationBand) fail('derived duration band mismatch');
    fallback(item.freshness_fallback_reason, ['fallback_7d','exceptional_30d'].includes(freshness.band), 'freshness fallback');
    fallback(item.duration_fallback_reason, ['fallback_15m','last_resort_20m'].includes(durationBand), 'duration fallback');
    if (item.original_date !== undefined && item.original_date !== item.publication.original_value) fail('legacy date alias conflicts with original metadata');
    if (item.duration_minutes !== undefined && item.duration_minutes !== item.duration_seconds / 60) fail('rounded runtime alias conflicts with exact seconds');
    const metadata = recordFor(records, item.metadata_ref, 'metadata', item);
    let observedAt = sourceObservation(metadata);
    if (!same(metadata.publication, item.publication)) fail('publication unsupported by retained original metadata');
    if (parseObservedDuration(metadata.duration) !== item.duration_seconds) fail('duration unsupported by retained original metadata');
    for (const key of ['type','item_id','source_id','url','source_url','title','source']) if (metadata.original_metadata?.[key] !== item[key]) fail('original item/source metadata missing or conflicting: '+key);
    if (!Array.isArray(item.support_refs) || !item.support_refs.length || item.support_refs.length > 6 || new Set(item.support_refs).size !== item.support_refs.length) fail('substantive support references required');
    for (const ref of item.support_refs) {
      const support = recordFor(records, ref, 'content_support', item);
      observedAt = Math.max(observedAt, sourceObservation(support));
      text(support.source_excerpt, 'substantive source excerpt', 80);
      for (const field of COPY_FIELDS) text(support.supports?.[field], field+' source support', 24);
    }
    const review = recordFor(records, item.reader_review_ref, 'reader_value_review', item);
    if (review.scope !== 'existing_content_pass' || review.result !== 'PASS' || CHECKS.some(key => review.checks?.[key] !== true)) fail('bounded semantic reader-value review required');
    if (parseMediaInstant(review.reviewed_at, 'reader review timestamp') < observedAt) fail('reader review predates supporting evidence');
    if (review.reviewed_copy_sha256 !== mediaCopySha256(item) || review.selected_story_context_sha256 !== mediaStoryContextSha256(bundle.stories)) fail('reader review is stale or bound to different copy/coverage');
    if (review.reviewed_evidence_sha256 !== mediaReviewedEvidenceSha256(item, records)) fail('reader review is stale or bound to different source evidence');
    if (!same(review.support_refs, item.support_refs)) fail('reader review support bindings mismatch');
    for (const field of COPY_FIELDS) text(review.rationale?.[field], field+' semantic rationale', 24);
    if (new Set(COPY_FIELDS.map(field => normalizeMediaCopy(review.rationale[field]))).size !== 3) fail('reader review repeats its distinctness rationale');
    results.push({id:item.id,type,freshness_band:freshness.band,duration_band:durationBand,publication_interval:freshness.interval});
  }
  return {result:'PASS',contract_version:MEDIA_CONTRACT_VERSION,research_cutoff_at:bundle.research_cutoff_at,items:results,live_source_availability_certified:false};
}

export function readMediaEvidence(reference, repoRoot) {
  if (!reference || !/^[a-f0-9]{64}$/.test(reference.sha256 || '') || typeof reference.path !== 'string' || path.isAbsolute(reference.path) || reference.path.split(/[\\/]/).some(x => x === '..' || x === '.') || !reference.path.endsWith('.json')) fail('retained media evidence path/hash required');
  const root = fs.realpathSync(repoRoot), file = fs.realpathSync(path.resolve(root, reference.path));
  if (!file.startsWith(root + path.sep)) fail('media evidence escapes repository root');
  const bytes = fs.readFileSync(file);
  if (bytes.length > POLICY.evidence.maximum_bytes) fail('media evidence exceeds bounded size');
  if (mediaSha256(bytes) !== reference.sha256) fail('retained media evidence hash mismatch');
  return JSON.parse(bytes);
}
export function validateHistoricalMedia({bundle, state, bundleDigest}) {
  const registry = JSON.parse(fs.readFileSync(new URL('../contracts/media-compatibility.json', import.meta.url), 'utf8'));
  const entry = registry.entries.find(x => x.bundle_sha256 === bundleDigest && x.edition_date === bundle.edition_date && x.execution_id === state.execution_id && x.branch === state.branch);
  if (!entry || bundle.schema_version !== 'daily-compiler-edition-bundle-v1' || bundle.editorial_contract_version !== 'daily-compiler-editorial-contract-v1') fail('unregistered legacy bundle cannot bypass current media contract');
  if (entry.purpose !== 'immutable_test_fixture' && (state.state !== 'SHADOW_VERIFIED' || state.stage !== 'VERIFY')) fail('historical compatibility is terminal read/rebuild only');
  if (bundle.media_contract_version !== undefined || bundle.media_evidence !== undefined || bundle.research_cutoff_at !== undefined) fail('legacy bundle cannot mix current media authority');
  return {result:'HISTORICAL_COMPATIBILITY',contract_version:bundle.editorial_contract_version,bundle_sha256:bundleDigest,source_commit:entry.source_commit,current_media_qualification:false};
}
export function validateBundleMedia({bundle, state, bundleDigest, repoRoot='.'}) {
  if (bundle.schema_version === 'daily-compiler-edition-bundle-v1') return validateHistoricalMedia({bundle,state,bundleDigest});
  if (bundle.schema_version !== 'daily-compiler-edition-bundle-v2' || bundle.editorial_contract_version !== 'daily-compiler-editorial-contract-v2') fail('bundle/editorial media version mismatch');
  return validateMediaSelection({bundle,state,evidence:readMediaEvidence(bundle.media_evidence, repoRoot)});
}
