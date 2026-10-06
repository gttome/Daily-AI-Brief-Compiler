import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

test('history merge preserves prior dated and permanent story pages',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-history-'));
  const history=path.join(root,'history'),current=path.join(root,'current'),out=path.join(root,'out');
  fs.mkdirSync(path.join(history,'briefs','2026-10-06'),{recursive:true});
  fs.mkdirSync(path.join(history,'stories','2026-10-06','old-story'),{recursive:true});
  fs.writeFileSync(path.join(history,'briefs','2026-10-06','index.html'),'<html>old edition</html>');
  fs.writeFileSync(path.join(history,'stories','2026-10-06','old-story','index.html'),'<html>old story</html>');
  fs.writeFileSync(path.join(history,'feed.json'),JSON.stringify({
    version:'daily-ai-brief-feed-v1',latest:'2026-10-06',
    editions:[{date:'2026-10-06',route:'briefs/2026-10-06/',stories:[{headline:'Old story',focus:'Technical AI Engineering',route:'stories/2026-10-06/old-story/'}]}]
  }));

  fs.mkdirSync(path.join(current,'briefs','2026-10-07'),{recursive:true});
  fs.mkdirSync(path.join(current,'stories','2026-10-07','new-story'),{recursive:true});
  fs.writeFileSync(path.join(current,'index.html'),'<html>latest</html>');
  fs.writeFileSync(path.join(current,'latest.html'),'<html>latest alias</html>');
  fs.writeFileSync(path.join(current,'briefs','2026-10-07','index.html'),'<html>new edition</html>');
  fs.writeFileSync(path.join(current,'stories','2026-10-07','new-story','index.html'),'<html>new story</html>');
  fs.writeFileSync(path.join(current,'build-manifest.json'),'{}');
  fs.writeFileSync(path.join(current,'feed.json'),JSON.stringify({
    version:'daily-ai-brief-feed-v1',latest:'2026-10-07',
    editions:[{date:'2026-10-07',route:'briefs/2026-10-07/',stories:[{headline:'New story',focus:'Agents for Everyone',route:'stories/2026-10-07/new-story/'}]}]
  }));

  execFileSync(process.execPath,['scripts/merge-shadow-history.mjs',history,current,out]);
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-06','index.html')));
  assert.ok(fs.existsSync(path.join(out,'stories','2026-10-06','old-story','index.html')));
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-07','index.html')));
  assert.ok(fs.existsSync(path.join(out,'stories','2026-10-07','new-story','index.html')));
  const feed=JSON.parse(fs.readFileSync(path.join(out,'feed.json'),'utf8'));
  assert.deepEqual(feed.editions.map(x=>x.date),['2026-10-07','2026-10-06']);
  const archive=fs.readFileSync(path.join(out,'archive','index.html'),'utf8');
  assert.match(archive,/2026-10-07/);
  assert.match(archive,/2026-10-06/);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'history-merge-receipt.json'),'utf8'));
  assert.equal(receipt.permanent_history,true);
  assert.equal(receipt.preserved_prior_editions,1);
});
