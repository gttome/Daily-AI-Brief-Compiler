import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=path.resolve(process.argv[2]||path.join(repoRoot,'.reader-source'));
const vendorRoot=path.join(repoRoot,'vendor','production-reader');
const snapshotRoot=path.join(vendorRoot,'snapshot');
const allow=JSON.parse(fs.readFileSync(path.join(vendorRoot,'ALLOWLIST.json'),'utf8'));
const provenancePath=path.join(vendorRoot,'PROVENANCE.json');
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    if(e.name==='.git')return [];
    return e.isDirectory()?walk(p):[p];
  });
}
function globMatch(pattern,value){
  const escaped=pattern.replace(/[.+^$(){}|[\]\\]/g,'\\$&').replace(/\*\*/g,'.*').replace(/\*/g,'[^/]*');
  return new RegExp('^'+escaped+'$').test(value);
}
const allowed=[...allow.classes.READER_PURE,...allow.classes.READER_DATA,...allow.classes.READER_BROWSER];
const isAllowed=p=>allowed.some(pattern=>globMatch(pattern,p));
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');

function patchReaderSource(sourcePath,bytes){
  if(sourcePath!=='_generator/lib/book-reading.mjs')return {bytes,patches:[]};
  let text=bytes.toString('utf8');
  const original=text;
  text=text.replace("import {BOOK_COVERAGE_DATE,selectBookReferences} from './book-selection.mjs';","const BOOK_COVERAGE_DATE='2026-09-30';");
  text=text.replace(/\n    }else\{\n      const result=selectBookReferences\(edition,data,data\.selection_reviews\?\.\[edition\.brief_date\]\);\n      if\(canonicalBookRows\(result\.selections\)!==canonicalBookRows\(selections\)\)throw Error\('Book mappings must match the full-catalog semantic selection'\);\n    }/,"\n    }");
  if(text===original)throw new Error('book-reading reader-only patch did not apply');
  return {bytes:Buffer.from(text,'utf8'),patches:[{
    source_path:sourcePath,
    reason:'Remove EDITORIAL_RESEARCH book-selection dependency while preserving reader rendering and frozen-reader validation.',
    source_sha256:sha256(bytes),
    vendored_sha256:sha256(Buffer.from(text,'utf8'))
  }]};
}

fs.rmSync(snapshotRoot,{recursive:true,force:true});
fs.mkdirSync(snapshotRoot,{recursive:true});
const sourceMap={};
const imported={};
const patches=[];
for(const absolute of walk(sourceRoot)){
  const sourcePath=path.relative(sourceRoot,absolute).replaceAll(path.sep,'/');
  if(!isAllowed(sourcePath))continue;
  const original=fs.readFileSync(absolute);
  const patched=patchReaderSource(sourcePath,original);
  const dest=path.join(snapshotRoot,sourcePath);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,patched.bytes);
  const vendored='snapshot/'+sourcePath;
  sourceMap[vendored]=sourcePath;
  imported[vendored]={
    source_path:sourcePath,
    source_sha256:sha256(original),
    vendored_sha256:sha256(patched.bytes),
    bytes:patched.bytes.length
  };
  patches.push(...patched.patches);
}
for(const required of [
  '_generator/lib/render.mjs','_generator/lib/reader.mjs','_layouts/default.html',
  'assets/css/archive.css','assets/js/archive.js','_data/book-reading.json',
  '_data/reading-support.json','_data/watchlist.json','briefs/2026-10-06.md'
]){
  if(!isAllowed(required)||!sourceMap['snapshot/'+required])throw new Error('required reader file not imported: '+required);
}
fs.writeFileSync(path.join(vendorRoot,'SOURCE-MAP.json'),JSON.stringify(sourceMap,null,2)+'\n');
Object.assign(provenance,{
  imported_at:new Date().toISOString(),
  status:'VENDORED',
  imported_file_count:Object.keys(imported).length,
  imported_files:imported,
  patches
});
fs.writeFileSync(provenancePath,JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({imported:Object.keys(imported).length,bytes:Object.values(imported).reduce((n,x)=>n+x.bytes,0),patches},null,2));
