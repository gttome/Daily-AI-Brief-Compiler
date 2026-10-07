import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Compiler reader makes Watchlist interest selection visually immediate',()=>{
  const source=fs.readFileSync(path.join(root,'vendor','production-reader','snapshot','assets','js','watchlist.js'),'utf8');
  const materializer=fs.readFileSync(path.join(root,'compiler','reader-materializer.mjs'),'utf8');
  const verifier=fs.readFileSync(path.join(root,'scripts','verify-built-reader.mjs'),'utf8');

  assert.ok(source.includes("article.querySelectorAll('[data-choice]').forEach(b=>b.disabled=true);status.textContent='Saving…';"));
  assert.ok(materializer.includes("b.setAttribute('aria-pressed',String(b.dataset.choice===choice));b.disabled=true;"));
  assert.ok(materializer.includes('patchWatchlistImmediateSelection(outDir);'));
  assert.ok(verifier.includes("watchlist_immediate_selection:true"));
});
