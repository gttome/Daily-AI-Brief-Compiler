import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const vendor=path.join(root,'vendor','production-reader');
const snapshot=path.join(vendor,'snapshot');
const provenance=JSON.parse(fs.readFileSync(path.join(vendor,'PROVENANCE.json'),'utf8'));

test('pinned reader snapshot is complete and independent',async()=>{
  assert.equal(provenance.status,'VENDORED');
  assert.equal(provenance.source_sha,'912248e5add14b2ec08d7a5eefed43cbf3af485f');
  assert.ok(provenance.imported_file_count>=790);
  for(const p of [
    '_layouts/default.html',
    '_generator/lib/render.mjs',
    '_generator/lib/reader.mjs',
    'assets/css/archive.css',
    'assets/js/archive.js',
    '_data/book-reading.json',
    '_data/reading-support.json',
    '_data/watchlist.json',
    'briefs/2026-10-06.md',
    'stories/2026-10-06/copilot-moves-from-chat-into-desktop-computer-use.md',
    'videos/2026-10-06/general.md',
    'podcasts/2026-10-06/hard-fork-2026-10-02-ai-agents.md',
    'calendar.ics','daily-feed.xml','feed.xml','feed.json'
  ]) assert.ok(fs.existsSync(path.join(snapshot,p)),p);
  assert.ok(!fs.existsSync(path.join(snapshot,'_generator/lib/book-selection.mjs')));
  assert.ok(!fs.existsSync(path.join(snapshot,'_generator/lib/run-supervisor.mjs')));
  assert.ok(!fs.existsSync(path.join(snapshot,'_records/edition-execution')));
  const render=await import(pathToFileURL(path.join(snapshot,'_generator/lib/render.mjs')));
  const reader=await import(pathToFileURL(path.join(snapshot,'_generator/lib/reader.mjs')));
  assert.equal(typeof render.generatedFiles,'function');
  assert.equal(typeof reader.readerFoundationFiles,'function');
});

test('golden October 6 deployed image is exact',()=>{
  const p=path.join(snapshot,'briefs/images/2026-10-06/dab-edition-2026-10-06-m01.png');
  const bytes=fs.readFileSync(p);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'97bcd4e2e559573678725331ed7185014b19ffb7e119cc49a7e11b261646a90b');
});
