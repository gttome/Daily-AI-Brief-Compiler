import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

test('history merge preserves only missing prior permanent pages and never rewrites canonical current reader surfaces',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-history-'));
  const history=path.join(root,'history'),current=path.join(root,'current'),out=path.join(root,'out'),receipt=path.join(root,'receipt.json');

  fs.mkdirSync(path.join(history,'briefs','2026-10-06'),{recursive:true});
  fs.mkdirSync(path.join(history,'stories','2026-10-06','old-story'),{recursive:true});
  fs.mkdirSync(path.join(history,'archive'),{recursive:true});
  fs.writeFileSync(path.join(history,'briefs','2026-10-06','index.html'),'<html>old edition</html>');
  fs.writeFileSync(path.join(history,'stories','2026-10-06','old-story','index.html'),'<html>old story</html>');
  fs.writeFileSync(path.join(history,'archive','index.html'),'<html>legacy custom archive</html>');

  fs.mkdirSync(path.join(current,'briefs','2026-10-07'),{recursive:true});
  fs.mkdirSync(path.join(current,'stories','2026-10-07','new-story'),{recursive:true});
  fs.mkdirSync(path.join(current,'briefs-archive'),{recursive:true});
  fs.writeFileSync(path.join(current,'index.html'),'<html>canonical latest</html>');
  fs.writeFileSync(path.join(current,'briefs','2026-10-07','index.html'),'<html>new edition</html>');
  fs.writeFileSync(path.join(current,'stories','2026-10-07','new-story','index.html'),'<html>new story</html>');
  fs.writeFileSync(path.join(current,'briefs-archive','index.html'),'<html>canonical archive</html>');
  fs.writeFileSync(path.join(current,'feed.json'),'{"version":"https://jsonfeed.org/version/1.1","items":[]}');

  execFileSync(process.execPath,['scripts/merge-shadow-history.mjs',history,current,out,'2026-10-07',receipt]);
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-06','index.html')));
  assert.ok(fs.existsSync(path.join(out,'stories','2026-10-06','old-story','index.html')));
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-07','index.html')));
  assert.equal(fs.readFileSync(path.join(out,'briefs-archive','index.html'),'utf8'),'<html>canonical archive</html>');
  assert.equal(fs.readFileSync(path.join(out,'feed.json'),'utf8'),'{"version":"https://jsonfeed.org/version/1.1","items":[]}');
  assert.ok(!fs.existsSync(path.join(out,'archive','index.html')));
  const data=JSON.parse(fs.readFileSync(receipt,'utf8'));
  assert.deepEqual(data.preserved_prior_editions,['2026-10-06']);
  assert.equal(data.archive_and_feeds_rewritten,false);
});
