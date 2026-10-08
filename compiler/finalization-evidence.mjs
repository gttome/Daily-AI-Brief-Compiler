import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';

export const readFinalizationRecord=file=>{
  const bytes=fs.readFileSync(file);
  return {bytes,record:JSON.parse(bytes.toString('utf8'))};
};
const readRecord=readFinalizationRecord;
const fail=message=>{throw new Error(message);};

// Shared by base-run and additive-correction finalization. This checks only
// mandatory product evidence and never reads or acknowledges an observer.
export function verifyFinalizationEvidence({date,pageUrl,stateSha256,bundleSha256,buildDir='build'}){
  const receipts=[
    ['reader-source/compile-receipt.json','compile-receipt.json','daily-compiler-compile-receipt-v2'],
    ['reader-source/verification-receipt.json','source-verification-receipt.json','daily-compiler-reader-source-verification-v2'],
    ['built-verification.json','built-reader-verification.json','daily-compiler-built-reader-verification-v2'],
    ['live-verification.json','live-verification.json','daily-compiler-live-verification-v2']
  ].map(([source,name,schema])=>({...readRecord(path.join(buildDir,source)),source,name,schema}));
  const [compile,sourceVerify,built,live]=receipts.map(row=>row.record);
  if(receipts.some(row=>row.record.result!=='PASS')) fail('cannot finalize without source, built-reader and live parity PASS');
  if(receipts.some(row=>row.record.schema_version!==row.schema)) fail('verification receipt schema mismatch');
  for(const receipt of [compile,sourceVerify,built,live]){
    if(receipt.edition_date!==date) fail('verification receipt edition mismatch');
  }
  if(compile.reader_parity_gate?.result!=='PASS'||sourceVerify.reader_parity_gate!=='PASS') fail('canonical reader parity is not PASS');
  if(canonicalSha(compile.verification)!==canonicalSha(sourceVerify)) fail('source verification differs from compiled receipt');
  if(bundleSha256!==compile.bundle_sha256) fail('state/bundle changed during compile');
  if(stateSha256!==compile.state_sha256) fail('state bytes changed during compile');
  const manifest=readRecord(path.join(buildDir,'reader-source','build-manifest.json')).record;
  if(manifest.schema_version!=='daily-compiler-canonical-reader-source-v1'||manifest.edition_date!==date) fail('reader source manifest identity mismatch');
  if(manifest.bundle_sha256!==compile.bundle_sha256) fail('reader source manifest bundle mismatch');
  const manifestDigest=canonicalSha(manifest);
  if(canonicalSha(compile.source_manifest)!==manifestDigest) fail('reader source manifest changed during compile');
  for(const receipt of [built,live]){
    if(receipt.bundle_sha256!==compile.bundle_sha256) fail('verification receipt bundle mismatch');
    if(receipt.source_manifest_sha256!==manifestDigest) fail('verification receipt source manifest mismatch');
    if(receipt.production_reader_source_sha!==compile.production_reader_source_sha) fail('verification receipt reader source mismatch');
  }
  if(live.base_url!==pageUrl) fail('live verification URL mismatch');
  const history=readRecord(path.join(buildDir,'history-merge-receipt.json'));
  if(history.record.result!=='PASS') fail('reader history merge is not PASS');
  if(history.record.schema_version!=='daily-compiler-history-merge-v2'||history.record.current_date!==date) fail('reader history merge identity mismatch');
  if(history.record.bundle_sha256!==compile.bundle_sha256||history.record.source_manifest_sha256!==manifestDigest) fail('reader history merge source binding mismatch');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(history.record.latest_date||'')||history.record.latest_date<date) fail('reader history latest date invalid');
  if(live.history_merge_sha256!==canonicalSha(history.record)||live.latest_edition_date!==history.record.latest_date) fail('live verification history binding mismatch');
  receipts.push({...history,source:'history-merge-receipt.json',name:'history-merge-receipt.json'});
  return {compile,sourceVerify,built,live,history:history.record,manifest,manifestDigest,receipts};
}

