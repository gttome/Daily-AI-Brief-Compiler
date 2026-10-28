#!/usr/bin/env node
// Pre-deployment check against the exact production reader Watchlist validator.
// Read-only: no semantic reseal, renderer output, published data or state mutation.
import fs from 'node:fs';
import {adaptCompilerBundle} from '../compiler/reader-adapter.mjs';
import {validateWatchlist} from '../vendor/production-reader/snapshot/_generator/lib/watchlist.mjs';

export const EFFECTIVE_DATE='2026-10-29';
export function verifyWatchlistBeforeDeploy(bundle,priorWatchlist){
  const adapted=adaptCompilerBundle(bundle,{priorWatchlist}).watchlist;
  const errors=validateWatchlist(adapted);
  if(errors.length)throw Error('PREDEPLOY_WATCHLIST_BLOCKED: '+errors.join('; '));
  return {result:'PASS',edition_date:bundle.edition_date,topics_checked:adapted.topics.length,
    prior_continuity_checked:priorWatchlist!==null,
    validator:'canonical_published_reader_watchlist'};
}
function main(){
  const [bundlePath,priorPath]=process.argv.slice(2);
  if(!bundlePath)throw Error('Usage: validate-release-readiness.mjs <bundle.json> [prior-watchlist.json]');
  const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
  if(bundle.edition_date<EFFECTIVE_DATE){
    console.log(JSON.stringify({result:'SKIPPED_HISTORICAL',edition_date:bundle.edition_date}));return;
  }
  if(!priorPath||!fs.existsSync(priorPath))throw Error('PREDEPLOY_WATCHLIST_BLOCKED: missing immutable prior Watchlist');
  const prior=JSON.parse(fs.readFileSync(priorPath,'utf8'));
  if(prior.edition_date>=bundle.edition_date)throw Error('PREDEPLOY_WATCHLIST_BLOCKED: prior Watchlist is not earlier');
  console.log(JSON.stringify(verifyWatchlistBeforeDeploy(bundle,prior)));
}
if(process.argv[1]?.endsWith('/validate-release-readiness.mjs'))main();
