#!/usr/bin/env node
// Validate every changed public reader route exactly, allowing temporary CDN staleness.
// A correction is never persisted in Pages history unless all live bytes match.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fail(message){throw new Error(message);}
function stagedRoutes(siteDir,receipt){
  if(receipt?.result!=='PASS'||!Array.isArray(receipt.changed)||receipt.changed.length<1||receipt.changed.length>150)
    fail('invalid reader-only correction receipt');
  const plans=new Map();
  for(const record of receipt.changed){
    const route=record.route;
    if(typeof route!=='string'||route.startsWith('/')||route.includes('..')||
       !/^[a-z0-9._/-]+$/i.test(route)||plans.has(route))
      fail('invalid or duplicate correction route');
    const expected=fs.readFileSync(path.join(siteDir,route));
    const hash=sha256(expected);
    if(hash!==record.current_sha256)fail('staged hash mismatch: '+route);
    plans.set(route,{route,expected,hash});
  }
  if(receipt.files_changed!==plans.size)fail('receipt changed-route count mismatch');
  return plans;
}
export async function verifyReaderLive({
  siteDir,receipt,siteUrl,revision,fetchImpl=fetch,delayImpl=delay,
  maxAttempts=36,intervalMs=5000,concurrency=8,log=console.log
}){
  if(typeof siteUrl!=='string'||!/^https:\/\/gttome\.github\.io\/Daily-AI-Brief-Compiler\/?$/.test(siteUrl))
    fail('verification must use the canonical published reader URL');
  if(typeof revision!=='string'||!/^[a-zA-Z0-9_-]{3,64}$/.test(revision))
    fail('invalid deploy revision identity');
  const plans=stagedRoutes(siteDir,receipt),pending=new Map(plans),lastFailure=new Map();
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const entries=[...pending.values()];
    for(let i=0;i<entries.length;i+=concurrency){
      await Promise.all(entries.slice(i,i+concurrency).map(async item=>{
        const url=new URL(item.route,siteUrl.endsWith('/')?siteUrl:siteUrl+'/');
        url.searchParams.set('reading-copy-revision',revision);
        url.searchParams.set('readback-attempt',String(attempt));
        try{
          const response=await fetchImpl(url.toString(),{headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
          const bytes=Buffer.from(await response.arrayBuffer());
          if(response.status===200&&bytes.equals(item.expected)){
            pending.delete(item.route);lastFailure.delete(item.route);
            log('LIVE_CORRECTED_READER_PASS '+item.route+' '+item.hash+' attempt='+attempt);
          }else lastFailure.set(item.route,'HTTP '+response.status+', live SHA256 '+sha256(bytes)+', expected '+item.hash);
        }catch(err){lastFailure.set(item.route,'request failed: '+String(err));}
      }));
    }
    if(pending.size===0){
      const report={
        schema_version:'daily-compiler-live-reader-copy-byte-review-v2',
        result:'PASS',revision,verified_routes:plans.size,attempts:attempt,
        all_staged_bytes_verified:true,all_live_bytes_verified:true
      };
      log('ALL_'+plans.size+'_READER_ROUTES_VERIFIED after '+attempt+' attempts');
      return report;
    }
    if(attempt<maxAttempts){
      log('READER_CDN_PROPAGATION_PENDING '+pending.size+' routes after attempt '+attempt);
      await delayImpl(intervalMs);
    }
  }
  const detail=[...pending.keys()].slice(0,12).map(route=>route+': '+lastFailure.get(route));
  fail('reader live readback incomplete: '+pending.size+' unverified routes. '+detail.join('; '));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [siteDir,receiptFile,siteUrl,revision,outFile]=process.argv.slice(2);
  if(!siteDir||!receiptFile||!siteUrl||!revision||!outFile)
    fail('usage: node verify-reader-live-readback.mjs <staged-site> <reader-receipt> <site-url> <revision> <out-receipt>');
  const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
  const report=await verifyReaderLive({siteDir,receipt,siteUrl,revision});
  fs.mkdirSync(path.dirname(outFile),{recursive:true});
  fs.writeFileSync(outFile,JSON.stringify(report,null,2)+'\n');
}
