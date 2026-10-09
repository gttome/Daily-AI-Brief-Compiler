import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const OCT8_PREFIX='2026-10-08';
const stories=['cisco-webex-agentic-collaboration','github-agent-scale-git-infrastructure','google-developer-knowledge-agent-skill','jump-trading-agentic-quant-research','realtor-realassist-agent-actions','windows-hybrid-intelligence-copilot'];
const media=['videos/2026-10-08/agent-skills/index.html','videos/2026-10-08/general/index.html','podcasts/2026-10-08/ai-at-work/index.html','podcasts/2026-10-08/the-new-new-kingmakers-agents-developers-and-the-future-of-software-with-stephen-o-grady/index.html'];
const pinned={
 m01:'dd1dca5333a5e156880f1b575ddae3ec1c42f1656d0be5e879f253903fe1633f',
 m02:'ecf91db50db09f70fd085391494d169dfacf1209f541edd3c690d5d49f46636a',
 m10:'f40573aa30dd243bbe0a2a2ff87a1ecad5650abac75391dcb80ca95f973768d0',
 m11:'d304fce97b1d2f7d821a50edf5db2d2afb2d9411d08c0bd9a9ea5ecaa19354b1',
 m12:'0dad7a6a1592cb28bd4ff7c0c686f1a08a92de62557c2559a8387f1bbfcebeb4',
 m14:'28b12f2a682f071bdba33fdcb4719afb193e8e7da7e760371f9668c32b1ef768'
};
export const preservedOctober8Paths=Object.freeze([
 'briefs/2026-10-08/index.html',
 ...stories.map(s=>'stories/2026-10-08/'+s+'/index.html'),
 ...media,
 ...Object.keys(pinned).map(id=>'briefs/images/2026-10-08/dab-edition-2026-10-08-'+id+'.png')
]);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fail(s){throw new Error('Release 1 public preservation: '+s);}
const read=(root,relative)=>{
 const file=path.join(root,relative);
 if(!fs.existsSync(file))fail('missing protected byte path '+relative+' in '+root);
 return fs.readFileSync(file);
};
export function verifyLocalPreservation(historyDir,siteDir){
 if(preservedOctober8Paths.length!==17)fail('protected path set must be exactly 17');
 const seen=new Set();
 const results=preservedOctober8Paths.map(relative=>{
  if(seen.has(relative))fail('duplicate protected path '+relative);
  seen.add(relative);
  const base=read(historyDir,relative),current=read(siteDir,relative);
  const hash=sha(base);
  if(!current.equals(base))fail('oct8 history byte mismatch '+relative);
  const hit=/dab-edition-2026-10-08-(m\d+)\.png/.exec(relative);
  if(hit && pinned[hit[1]]!==hash)fail('oct8 accepted PNG pinned SHA mismatch '+relative);
  return {route:relative,sha256:hash,bytes:base.length};
 });
 if(results.filter(x=>x.route.endsWith('.png')).length!==6)fail('six historic accepted PNGs required');
 return results;
}
export function currentRoutes(manifest){
 if(!Array.isArray(manifest.required_routes)||manifest.required_routes.length<20)fail('canonical reader required routes missing');
 if(manifest.image_representation!=='images_pending')fail('strict placeholder publication audit requires pending image state');
 if(manifest.current_images?.length!==6 || manifest.current_images.some(x=>x.accepted!==false||x.status!=='pending'))fail('six honest pending figures required');
 if(new Set(manifest.current_images.map(x=>x.route)).size!==1)fail('exactly one shared placeholder asset required');
 return [...new Set([...manifest.required_routes,...manifest.current_images.map(x=>x.route)])];
}
const publicUrl=(baseUrl,route)=>new URL(route.endsWith('/index.html')?route.slice(0,-10):route,baseUrl.endsWith('/')?baseUrl:baseUrl+'/').href;
async function fetchChecks(entries,baseUrl){
 const collected=[];
 for(let i=0;i<entries.length;i+=6){
  const group=entries.slice(i,i+6);
  const rows=await Promise.all(group.map(async x=>{
   const url=publicUrl(baseUrl,x.route);
   const response=await fetch(url,{headers:{'Cache-Control':'no-cache','User-Agent':'DailyCompilerReleaseOneIntegrityAudit'}});
   if(response.status!==200)fail('live '+response.status+' '+url);
   const bytes=Buffer.from(await response.arrayBuffer());
   const found=sha(bytes);
   if(found!==x.sha256||bytes.length!==x.bytes)fail('live byte/SHA-256 mismatch '+url);
   return {url,status:200,sha256:found,bytes:bytes.length};
  }));
  collected.push(...rows);
 }
 return collected;
}
export async function verifyProductionPublication({mode,historyDir,siteDir,manifestPath,baseUrl}){
 if(mode!=='preflight'&&mode!=='postdeploy')fail('unknown audit mode');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const old=verifyLocalPreservation(historyDir,siteDir);
 if(manifest.edition_date<=OCT8_PREFIX)fail('pending production must not overwrite historic October 8 or earlier editions');
 const routes=currentRoutes(manifest);
 const current=routes.map(route=>({route,sha256:sha(read(siteDir,route)),bytes:read(siteDir,route).length}));
 const targets=mode==='preflight'?old:[...old,...current];
 const byUrl=new Map(targets.map(r=>[publicUrl(baseUrl,r.route),r]));
 if(mode==='postdeploy'&&byUrl.size!==targets.length)fail('new edition routes collide with historic URLs');
 const checks=await fetchChecks([...byUrl.values()],baseUrl);
 return {
  schema_version:'daily-compiler-public-preservation-v1',
  result:'PASS',mode,edition_date:manifest.edition_date,
  oct8_protected_count:17,oct8_sha256:old,
  current_required_routes:current.length,live_checked:checks.length,
  live_http_and_sha256:checks,verified_at:new Date().toISOString()
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,historyDir,siteDir,manifestPath,baseUrl,receiptPath]=process.argv.slice(2);
 if(!receiptPath)fail('usage: node scripts/verify-publication-preservation.mjs <preflight|postdeploy> <history-dir> <site-dir> <build-manifest> <public-base-url> <receipt>');
 const result=await verifyProductionPublication({mode,historyDir,siteDir,manifestPath,baseUrl});
 fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
 fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({result:result.result,mode,edition_date:result.edition_date,oct8_protected_count:17,current_required_routes:result.current_required_routes,live_checked:result.live_checked}));
}
