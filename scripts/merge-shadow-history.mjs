import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';

const CATEGORIES=['briefs','stories','videos','podcasts'];
const SHARED_ROUTES=['index.html','latest.md','latest.html','latest/index.html','briefs-archive/index.html','feed.json','feed.xml','daily-feed.xml','data/archive-index.json','data/compiler-feedback-registry.json'];
const isDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const available=root=>root&&root!=='-'&&fs.existsSync(root);
function copyDir(src,dst){
  if(!available(src))return;
  fs.mkdirSync(dst,{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:true});
}
function copyMissing(src,dst){
  if(!available(src))return;
  fs.mkdirSync(dst,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const from=path.join(src,entry.name),to=path.join(dst,entry.name);
    if(entry.isDirectory())copyMissing(from,to);
    else if(!fs.existsSync(to))fs.copyFileSync(from,to);
  }
}
function dateDirs(root,category){
  const dir=path.join(root,category);
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()&&isDate(e.name)).map(e=>e.name);
}
function readManifest(root){
  const file=path.join(root,'build-manifest.json');
  if(!fs.existsSync(file))return null;
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!isDate(manifest.edition_date))throw new Error('history reader manifest edition invalid');
  return manifest;
}
function sharedEvidence(root){
  return SHARED_ROUTES.filter(route=>fs.existsSync(path.join(root,route))).map(route=>({route,sha256:sha256(fs.readFileSync(path.join(root,route)))}));
}

// The newest published reader owns every shared surface. Rebuilding an older
// edition may update only its dated/permanent routes and derived image aliases.
// Existing versioned assets and other permanent routes are never removed.
export function mergeShadowHistory({historyDir,currentDir,outDir,currentDate,receiptPath=null}){
  if(!currentDir||!outDir||!isDate(currentDate))throw new Error('usage: node scripts/merge-shadow-history.mjs <history-site-or-dash> <current-site> <out-site> <current-date> [receipt]');
  if(!fs.existsSync(currentDir)||!fs.statSync(currentDir).isDirectory())throw new Error('current built reader missing');
  const output=path.resolve(outDir);
  for(const input of [currentDir,...(available(historyDir)?[historyDir]:[])]){
    const source=path.resolve(input);
    if(source===output||source.startsWith(output+path.sep)||output.startsWith(source+path.sep))throw new Error('history merge inputs and output must be disjoint');
  }
  const currentManifest=readManifest(currentDir);
  if(currentManifest&&currentManifest.edition_date!==currentDate)throw new Error('history merge current manifest edition mismatch');
  if(!fs.existsSync(path.join(currentDir,'briefs',currentDate,'index.html')))throw new Error('current dated reader route missing');
  const hasHistory=available(historyDir),historyManifest=hasHistory?readManifest(historyDir):null;
  const dates=hasHistory?dateDirs(historyDir,'briefs'):[];
  if(historyManifest)dates.push(historyManifest.edition_date);
  const historyLatest=[...dates].sort().at(-1)||null;
  const historical=historyLatest!==null&&historyLatest>currentDate;
  const latestDate=historical?historyLatest:currentDate;
  const protectedShared=historical?sharedEvidence(historyDir):null;
  const overlaid=[];

  fs.rmSync(outDir,{recursive:true,force:true});
  fs.mkdirSync(outDir,{recursive:true});
  copyDir(historical?historyDir:currentDir,outDir);
  const preserved=new Set();
  if(historical){
    // Do not copy the older build's root, feeds, feedback registry, Watchlist,
    // source catalogue, shared runtimes or archive over the newer reader.
    for(const category of CATEGORIES){
      const relative=path.posix.join(category,currentDate);
      if(fs.existsSync(path.join(currentDir,relative))){copyDir(path.join(currentDir,relative),path.join(outDir,relative));overlaid.push(relative+'/');}
    }
    const images=path.posix.join('briefs','images',currentDate);
    if(fs.existsSync(path.join(currentDir,images))){copyDir(path.join(currentDir,images),path.join(outDir,images));overlaid.push(images+'/');}
    for(const date of dates)if(date!==currentDate)preserved.add(date);
    if(canonicalSha(sharedEvidence(outDir))!==canonicalSha(protectedShared))throw new Error('historical correction changed a shared reader route');
  }else if(hasHistory){
    for(const category of CATEGORIES){
      for(const date of dateDirs(historyDir,category)){
        const source=path.join(historyDir,category,date),dest=path.join(outDir,category,date);
        if(date===currentDate)copyMissing(source,dest);
        else if(date<currentDate){copyDir(source,dest);preserved.add(date);}
      }
    }
    // Keep historical asset versions even when the current build contains the
    // date directory already. Only the current edition's alias may supersede.
    for(const date of dateDirs(historyDir,'briefs/images')){
      const source=path.join(historyDir,'briefs','images',date),dest=path.join(outDir,'briefs','images',date);
      if(date===currentDate)copyMissing(source,dest);
      else if(date<currentDate)copyDir(source,dest);
    }
  }

  const receipt={
    schema_version:'daily-compiler-history-merge-v2',result:'PASS',
    current_date:currentDate,latest_date:latestDate,historical_correction:historical,
    bundle_sha256:currentManifest?.bundle_sha256??null,
    source_manifest_sha256:currentManifest?canonicalSha(currentManifest):null,
    published_shared_routes:sharedEvidence(outDir),
    historical_scope:historical?'dated_edition_routes_and_assets':null,
    overlaid_target_routes:overlaid,
    preserved_prior_editions:[...preserved].filter(date=>date<currentDate).sort(),
    preserved_editions:[...preserved].sort(),
    permanent_history:true,canonical_current_reader_preserved:true,
    homepage_latest_preserved:historical,archive_and_feeds_rewritten:false
  };
  if(receiptPath){fs.mkdirSync(path.dirname(receiptPath),{recursive:true});fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');}
  return receipt;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  console.log(JSON.stringify(mergeShadowHistory({historyDir:process.argv[2],currentDir:process.argv[3],outDir:process.argv[4],currentDate:process.argv[5],receiptPath:process.argv[6]||null})));
}
