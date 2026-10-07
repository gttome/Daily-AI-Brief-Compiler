#!/usr/bin/env node
import fs from 'node:fs';
import {nextFusedProofOperation} from '../image-capsules/fused-proof-state.mjs';

const statePath=process.argv[2],manifestPath=process.argv[3],routeMatrixPath=process.argv[4]||'contracts/d0-p0a-route-matrix.json';
if(!statePath||!manifestPath) throw new Error('usage: node scripts/next-d0-fused-proof-operation.mjs <execution-state.json> <manifest.json> [route-matrix.json]');
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const routeMatrix=JSON.parse(fs.readFileSync(routeMatrixPath,'utf8'));
console.log(JSON.stringify(nextFusedProofOperation(state,{manifest,routeMatrix}),null,2));
