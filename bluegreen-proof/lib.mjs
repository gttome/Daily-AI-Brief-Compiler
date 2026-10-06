import fs from 'node:fs';
import crypto from 'node:crypto';

export function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  fs.mkdirSync(new URL('.', 'file://' + process.cwd() + '/' + path).pathname, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function sha256Object(value) {
  return sha256Bytes(Buffer.from(stableJson(value), 'utf8'));
}

export function immutableProjection(fixture) {
  return {
    edition_date: fixture.edition_date,
    published_render_sha256: fixture.published_render_sha256,
    stories: fixture.stories.map(story => ({
      story_id: story.story_id,
      headline: story.headline,
      focus: story.focus,
      agent_skill: story.agent_skill,
      image_sha256: story.image_sha256,
      accepted_locked: story.accepted_locked
    }))
  };
}

export async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'daily-ai-brief-bluegreen-portability-proof/1.0' }
  });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
