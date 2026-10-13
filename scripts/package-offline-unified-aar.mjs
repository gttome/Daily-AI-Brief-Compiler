// Offline companion to the unified AAR: package the six *original* released PNGs
// from protected Git, not scraped pages or rendered screenshots. No network/actions.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const DATE=/^20\d\d-\d\d-\d\d$/;
const PNG_SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
function readJSON(file){
 try{return JSON.parse(fs.readFileSync(file,'utf8'));}
 catch(e){if(e.code==='ENOENT')return null;throw e;}
}
function editionFromCycle(cycle){
 if(!DATE.test(cycle)||new Date(cycle+'T00:00:00Z').toISOString().slice(0,10)!==cycle)throw Error('invalid cycle');
 const d=new Date(cycle+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);
 return d.toISOString().slice(0,10);
}
export function createOfflinePackage(cycle,markdownFile,evidenceDirectory,outputDirectory,{repositoryMainRef='refs/remotes/origin/main',cwd=process.cwd()}={}){
 const edition=editionFromCycle(cycle);
 const release=readJSON(path.join(evidenceDirectory,'image-release.json'));
 const manifest=readJSON(path.join(evidenceDirectory,'image-manifest.json'));
 if(release?.result!=='RELEASED_VERIFIED'||release.edition_date!==edition||
    manifest?.edition_date!==edition||release.images?.length!==6||manifest.images?.length!==6){
   return {result:'SKIPPED_RELEASE_NOT_VERIFIED',cycle_date:cycle,edition_date:edition};
 }
 const images=release.images;
 if(new Set(images.map(x=>x.story_id)).size!==6)throw Error('six unique released stories required');
 if(!fs.existsSync(markdownFile))throw Error('combined report missing: '+markdownFile);
 const original=fs.readFileSync(markdownFile,'utf8');
 if(/img\.shields\.io/i.test(original))throw Error('external decorative image badges are forbidden');
 const output=path.resolve(outputDirectory);
 fs.mkdirSync(path.join(output,'images'),{recursive:true});
 let modified=original;
 const receipt=[];
 for(const im of images){
  const match=manifest.images.find(x=>x.story_id===im.story_id&&x.sha256===im.sha256&&x.accepted_locked===true);
  if(!match)throw Error('manifest/release mismatch: '+im.story_id);
  const base='external-image-packages/'+edition+'/images/';
  const gitPath=match.path;
  if(!gitPath?.startsWith(base)||!/^[-a-zA-Z0-9_.]+\.png$/.test(gitPath.slice(base.length)))
    throw Error('unsafe or unbound package image: '+gitPath);
  const bname=path.posix.basename(im.route||'');
  if(!im.route?.startsWith('briefs/images/'+edition+'/')||!/^[-a-zA-Z0-9_.]+\.png$/.test(bname))
    throw Error('unsafe release image route');
  const data=execFileSync('git',['show',repositoryMainRef+':'+gitPath],{cwd,encoding:'buffer',maxBuffer:8*1024*1024});
  if(!Buffer.isBuffer(data)||data.length!==im.bytes||sha256(data)!==im.sha256)
    throw Error('original Git PNG does not match published SHA-256/bytes: '+im.story_id);
  if(data.length<26||!data.subarray(0,8).equals(PNG_SIGNATURE)||data.readUInt32BE(16)!==1200||
      data.readUInt32BE(20)!==630||data[24]!==8||![2,6].includes(data[25]))
    throw Error('original RGB/RGBA 1200x630 PNG signature/IHDR invalid: '+im.story_id);
  fs.writeFileSync(path.join(output,'images',bname),data);
  // Keep clicked links online, but make embedded report images work fully offline.
  const sourceUrl='https://gttome.github.io/Daily-AI-Brief-Compiler/'+im.route;
  const embedded='<img src="'+sourceUrl+'"';
  if(!modified.includes(embedded))throw Error('expected exact embedded image not present in report: '+im.story_id);
  modified=modified.replaceAll(embedded,'<img src="images/'+bname+'"');
  receipt.push({story_id:im.story_id,image_file:bname,sha256:im.sha256,bytes:im.bytes});
 }
 if(/<img src="https?:\/\//i.test(modified))throw Error('external embedded PNG source remains');
 fs.writeFileSync(path.join(output,'combined.md'),modified);
 fs.writeFileSync(path.join(output,'README.txt'),[
  'DAILY AI BRIEF — OFFLINE UNIFIED AFTER-ACTION REPORT',
  'Edition: '+edition,
  '',
  '1. Extract the complete archive before opening the report.',
  '2. Open combined.md in Typora or another Markdown reader.',
  '3. Keep the images/ folder beside combined.md; six authentic 1200×630 RGB/RGBA PNGs are included.',
  '4. No remote badge images are required. Headings, status symbols, tables and images work offline.',
  '5. Online source links still require internet. Mermaid diagrams display in editors that support Mermaid.',
  '6. The enclosed six PNGs match the published release SHA-256 values.',
  ''
 ].join('\n'));
 fs.writeFileSync(path.join(output,'image-integrity.json'),JSON.stringify({
  schema_version:'daily-compiler-offline-aar-image-integrity-v1',
  cycle_date:cycle,edition_date:edition,images:receipt
 },null,2)+'\n');
 return {result:'OFFLINE_PACKAGE_READY',edition_date:edition,cycle_date:cycle,images:receipt.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const [cycle,markdownFile,evidenceDirectory,outputDirectory]=process.argv.slice(2);
 if(!outputDirectory)throw Error('usage: node scripts/package-offline-unified-aar.mjs YYYY-MM-DD report.md evidence_dir output_dir');
 console.log(JSON.stringify(createOfflinePackage(cycle,markdownFile,evidenceDirectory,outputDirectory)));
}
