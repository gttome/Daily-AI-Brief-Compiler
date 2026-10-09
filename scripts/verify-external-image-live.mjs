// Independent public HTTP/byte/SHA verification of an actual Pages replacement.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditOct8Live,OCT8_PUBLIC_BASE} from './audit-oct8-live.mjs';

const fail=s=>{throw new Error('external_image_live:'+s);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const slash=p=>p.replaceAll('\\','/');
function localHash(dir,relative){
  if(relative.includes('..')||relative.startsWith('/'))fail('unsafe_relative_path');
  const p=path.join(dir,relative);
  if(!fs.existsSync(p))fail('required_file_missing:'+relative);
  const bytes=fs.readFileSync(p);
  return {route:relative,sha256:sha(bytes),bytes:bytes.length};
}
function essentialControls(historyRoot,date,changed){
  const fixed=['index.html','briefs-archive/index.html','watchlist/index.html','watchlist/research/index.html','daily-feed.xml','feed.xml','feed.json','feedback/index.html','sources/index.html','subscribe/index.html'];
  const dated=[];
  for(const kind of ['videos','podcasts']){
    const dir=path.join(historyRoot,kind,date);
    if(fs.existsSync(dir)){
      for(const sub of fs.readdirSync(dir,{withFileTypes:true})){
        if(!sub.isDirectory())continue;
        const route=kind+'/'+date+'/'+sub.name+'/index.html';
        if(fs.existsSync(path.join(historyRoot,route)))dated.push(route);
      }
    }
  }
  if(dated.filter(x=>x.startsWith('videos/')).length!==2||dated.filter(x=>x.startsWith('podcasts/')).length!==2)fail('published_media_route_count');
  return [...new Set([...fixed,...dated])].filter(relative=>!changed.has(relative));
}
export async function checkLiveBinary({route,sha256,bytes,baseUrl=OCT8_PUBLIC_BASE,fetchImpl=fetch}){
  const url=new URL(route,baseUrl).href;
  const res=await fetchImpl(url,{headers:{'Cache-Control':'no-cache','User-Agent':'DailyCompilerExternalImageExactLiveReadback/1'}});
  if(res.status!==200)fail('live_http_'+res.status+':'+route);
  const received=Buffer.from(await res.arrayBuffer());
  const found=sha(received);
  if(found!==sha256||received.length!==bytes)fail('live_byte_or_sha256_mismatch:'+route);
  return {route,url,http:200,bytes:received.length,sha256:found};
}
export async function verifyExternalImageLive({receipt,stagedSiteRoot,priorHistoryRoot,baseUrl=OCT8_PUBLIC_BASE,fetchImpl=fetch}){
  if(receipt?.schema_version!=='external-compiler-image-only-replacement-preparation-v1'||
    receipt.result!=='PREPARED_ONLY'||receipt.publication_verified!==false||
    receipt.images?.length!==6||receipt.oct8_pinned_count!==17||
    receipt.changed_paths?.length<13||receipt.changed_paths.length>14||
    receipt.changed_count!==receipt.changed_paths.length||receipt.semantic_rework!==0||
    receipt.accepted_image_regenerations!==0)fail('unqualified_preparation');
  if(baseUrl!==OCT8_PUBLIC_BASE)fail('wrong_public_repository');
  const date=receipt.edition_date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<='2026-10-08')fail('invalid_edition');
  const changed=new Map(receipt.changed_paths.map(row=>[row.route,row]));
  if(changed.size!==receipt.changed_paths.length)fail('duplicate_changed_file');
  const images=receipt.images;
  for(const img of images){
    if(!changed.has(img.route)||changed.get(img.route).sha256!==img.sha256||
      changed.get(img.route).bytes!==img.bytes||!img.url.startsWith(OCT8_PUBLIC_BASE+img.route+'?v='))fail('changed_png_missing');
  }
  const dated='briefs/'+date+'/index.html';
  if(!changed.has(dated))fail('dated_reader_must_change');
  const pageRoutes=new Set([dated,...images.map(img=>'stories/'+date+'/')]); // matched exactly below
  const stories=receipt.changed_paths.filter(row=>row.route.startsWith('stories/'+date+'/')&&row.route.endsWith('/index.html'));
  if(stories.length!==6||new Set(stories.map(s=>s.route)).size!==6)fail('six_story_page_routes');
  const allowed=new Set([dated,'index.html',...stories.map(x=>x.route),...images.map(x=>x.route)]);
  if([...changed.keys()].some(x=>!allowed.has(x)))fail('unapproved_route_in_patch');
  const controls=essentialControls(priorHistoryRoot,date,new Set(changed.keys()));
  const required=[...receipt.changed_paths,...controls.map(route=>localHash(priorHistoryRoot,route))];
  for(const row of receipt.changed_paths){
    const candidate=localHash(stagedSiteRoot,row.route);
    if(candidate.sha256!==row.sha256||candidate.bytes!==row.bytes)fail('staged_site_changed_since_approval:'+row.route);
  }
  for(const route of controls){
    const before=localHash(priorHistoryRoot,route),after=localHash(stagedSiteRoot,route);
    if(before.sha256!==after.sha256||before.bytes!==after.bytes)fail('staged_control_changed:'+route);
  }
  const readbacks=[];
  for(let i=0;i<required.length;i+=6){
    const group=required.slice(i,i+6);
    readbacks.push(...await Promise.all(group.map(row=>checkLiveBinary({...row,baseUrl,fetchImpl}))));
  }
  const october8=await auditOct8Live({fetchImpl});
  const seen=new Set(readbacks.map(row=>row.route));
  if(seen.size!==required.length||october8.objects_verified!==17||
    october8.immutable_pngs_verified!==6)fail('incomplete_live_verification');
  return {schema_version:'external-compiler-image-live-verification-v1',result:'PASS',
    edition_date:date,execution_id:receipt.execution_id,source_bundle_sha256:receipt.source_bundle_sha256,
    source_commit_sha:receipt.source_commit_sha,job_sha256:receipt.job_sha256,
    staged_package_head:receipt.staged_package_head,expected_pages_history_head:receipt.expected_pages_history_head,
    verified_at:new Date().toISOString(),changed_checked:receipt.changed_paths.length,
    controls_checked:controls.length,oct8_checked:17,total_http_sha256_checks:readbacks.length+17,
    image_sha256s:images.map(img=>({story_id:img.story_id,route:img.route,sha256:img.sha256,bytes:img.bytes})),
    live_changed_and_control_checks:readbacks,oct8_live_checks:october8.objects,
    independent_network_byte_checks:true,visual_browser_review_separate:true,
    semantic_rework:0,accepted_image_regenerations:0};
}
async function main(){
  const [receiptPath,stagedSiteRoot,priorHistoryRoot,outPath]=process.argv.slice(2);
  if(!outPath)fail('usage: node scripts/verify-external-image-live.mjs <prepared-receipt.json> <staged-site> <prior-history-site> <output-receipt>');
  const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  const result=await verifyExternalImageLive({receipt,stagedSiteRoot,priorHistoryRoot});
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  process.stdout.write(JSON.stringify({result:result.result,edition_date:result.edition_date,total_http_sha256_checks:result.total_http_sha256_checks,oct8_checked:17})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
