// Seven dated/permanent routes x two full-page screenshots, with diagnostic
// bounded recovery. Captures are evidence, NOT semantic 24-context approval.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const PNG=Buffer.from('89504e470d0a1a0a','hex');
const fail=(what)=>{throw Error('BROWSER14_CAPTURE_FAILED '+what);};
const validPng=p=>fs.existsSync(p)&&fs.statSync(p).size>=8&&
  fs.readFileSync(p).subarray(0,8).equals(PNG);
export function captureImageBrowser14({job,outputDir,browser=process.env.CHROME_BINARY,
  invoke=spawnSync,maxAttempts=3}){
 if(!job||!/^20\d\d-\d\d-\d\d$/.test(job.edition_date||'')||
    !Array.isArray(job.stories)||job.stories.length!==6)fail('six_dated_stories_required');
 if(!browser||typeof browser!=='string')fail('chrome_binary_required');
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)fail('retry_policy_invalid');
 const date=job.edition_date;
 const routes=['briefs/'+date+'/',...job.stories.map(story=>{
   if(typeof story?.permanent_url!=='string'||
      !story.permanent_url.startsWith(BASE+'stories/'+date+'/'))fail('unexpected_story_route');
   const relative=story.permanent_url.slice(BASE.length);
   if(!/^stories\/20\d\d-\d\d-\d\d\/[a-z0-9-]+\/$/.test(relative))
     fail('unsafe_story_route');
   return relative;
 })];
 if(new Set(routes).size!==7)fail('seven_distinct_routes_required');
 fs.mkdirSync(outputDir,{recursive:true});
 fs.writeFileSync(path.join(outputDir,'routes.txt'),routes.join('\n')+'\n');
 const captures=[],failedAttempts=[];
 const chromeFlags=['--headless=new','--no-sandbox','--disable-gpu',
   '--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',
   '--virtual-time-budget=3500'];
 const perform=(route,viewport,mode,outputPath,index)=>{
   const url=BASE+route;
   const args=[...chromeFlags];
   if(mode==='screenshot'){
     args.push('--window-size='+(viewport==='desktop'?'1440,1000':'390,844'));
     args.push('--screenshot='+path.resolve(outputPath));
   }else args.push('--dump-dom');
   args.push(url);
   for(let attempt=1;attempt<=maxAttempts;attempt++){
     fs.rmSync(outputPath,{force:true});
     const res=invoke(browser,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
     const stdout=String(res?.stdout??''),stderr=String(res?.stderr??'');
     if(mode==='dom'&&res?.status===0)fs.writeFileSync(outputPath,stdout);
     const valid=mode==='dom'?fs.existsSync(outputPath)&&
       fs.readFileSync(outputPath,'utf8').includes('dab-edition-'+date+'-')&&
       !fs.readFileSync(outputPath,'utf8').includes('Illustration pending for'):
       validPng(outputPath);
     if(!res?.error&&res?.status===0&&valid){
       captures.push({route,viewport,mode,file:path.basename(outputPath),
         attempts:attempt,result:'CAPTURED_UNREVIEWED'});
       return;
     }
     const diagnostic={route,viewport,mode,attempt,
       exit_status:res?.status??null,error_code:res?.error?.code??null,
       valid_file:valid,stderr_tail:stderr.slice(-1400),stdout_tail:mode==='dom'?stdout.slice(-250):null};
     failedAttempts.push(diagnostic);
     console.error('BROWSER14_RETRY '+JSON.stringify(diagnostic));
   }
   fail('route='+route+' viewport='+viewport+' mode='+mode+' attempts='+maxAttempts);
 };
 try{
   for(const [index,route] of routes.entries()){
     const prefix=String(index+1);
     perform(route,'desktop','screenshot',path.join(outputDir,prefix+'-desktop.png'),index);
     perform(route,'mobile','screenshot',path.join(outputDir,prefix+'-mobile.png'),index);
     perform(route,'page','dom',path.join(outputDir,prefix+'-dom.html'),index);
   }
   const screenshotCount=captures.filter(x=>x.mode==='screenshot').length;
   const domCount=captures.filter(x=>x.mode==='dom').length;
   if(screenshotCount!==14||domCount!==7)fail('incomplete_capture_counts');
   const report={schema_version:'external-image-browser14-capture-v1',
     edition_date:date,result:'BROWSER14_CAPTURED_UNREVIEWED',
     screenshot_count:screenshotCount,dom_count:domCount,route_count:routes.length,
     semantic_24_context_review:'NOT_INFERRED',captures,failed_attempts:failedAttempts};
   fs.writeFileSync(path.join(outputDir,'browser14-capture.json'),JSON.stringify(report,null,2)+'\n');
   console.log('BROWSER14_CAPTURED_UNREVIEWED: seven routes, 14 PNG screenshots, seven DOM captures');
   return report;
 }catch(error){
   fs.writeFileSync(path.join(outputDir,'browser14-failure.json'),JSON.stringify({
     schema_version:'external-image-browser14-capture-v1',edition_date:date,
     result:'BLOCKED_INCOMPLETE',reason:String(error),captures,failed_attempts:failedAttempts
   },null,2)+'\n');
   throw error;
 }
}
function main(){
 const [jobPath,outputDir]=process.argv.slice(2);
 if(!jobPath||!outputDir)fail('usage: capture-image-browser14.mjs <job.json> <output-dir>');
 const job=JSON.parse(fs.readFileSync(jobPath,'utf8'));
 captureImageBrowser14({job,outputDir});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main();
