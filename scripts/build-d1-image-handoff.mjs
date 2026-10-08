#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {buildD1ImageLaneHandoff} from '../operations/image-lane-handoff.mjs';

const [inputPath,requestPath,evidencePath,outputPath] = process.argv.slice(2);
if (!inputPath || !requestPath || !evidencePath || !outputPath) throw new Error('usage: node scripts/build-d1-image-handoff.mjs input.json request.json source-evidence.json output.json');
if ([inputPath,requestPath,evidencePath].some(value => path.resolve(value) === path.resolve(outputPath)) || fs.existsSync(outputPath)) throw new Error('handoff_output_must_be_new');
const read = value => JSON.parse(fs.readFileSync(value,'utf8'));
const input = read(inputPath);
if (path.resolve(input.requestPath || '') !== path.resolve(requestPath) || path.resolve(input.sourceEvidencePath || '') !== path.resolve(evidencePath)) throw new Error('handoff_input_locator_mismatch');
const result = buildD1ImageLaneHandoff({...input,specifications:read(requestPath),sourceEvidence:read(evidencePath)});
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
