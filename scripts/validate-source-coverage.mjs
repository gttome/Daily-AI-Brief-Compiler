#!/usr/bin/env node
// Independent source-coverage certification. Never rewrites semantic bundle.
import fs from 'node:fs';
import {validateSourceCoverageReceipt} from '../operations/source-coverage.mjs';
import {validateEditorialSourceCensus} from '../operations/source-item-census.mjs';

const [routeReceipt,editorialReceipt,registryFile='config/resource-registry.json']=process.argv.slice(2);
if(!routeReceipt||!editorialReceipt)throw Error(
  'usage: node scripts/validate-source-coverage.mjs <route-coverage.json> <editorial-census.json> [registry.json]');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const registry=read(registryFile),route=read(routeReceipt),editorial=read(editorialReceipt);
if(route.edition_date!==editorial.edition_date||route.execution_id!==editorial.execution_id)
 throw new Error('SOURCE_COVERAGE_RECEIPTS_DIFFERENT_EDITION_OR_EXECUTION');
const checks={
  routes:validateSourceCoverageReceipt(registry,route,{requireAllAttempts:true}),
  editorial:validateEditorialSourceCensus(registry,editorial,{requireAllVisited:true})
};
console.log(JSON.stringify({result:'ALL_SOURCES_ACCOUNTED',edition_date:route.edition_date,
  execution_id:route.execution_id,
  source_route_attempts:checks.routes.attempted,
  route_reachable:checks.routes.reachable,
  route_blocked:checks.routes.blocked,
  route_failed:checks.routes.failures,
  editorial_source_visits:checks.editorial.attempted,
  editorial_candidates_discovered_sources:checks.editorial.candidates_found,
  content_item_publication_admission:'SEPARATE_EXISTING_GATES',
  evidence_caveat:'Source receipts certify accounting and supplied route/index observations, not factual truth of author claims or complete audiovisual playback.'}));
