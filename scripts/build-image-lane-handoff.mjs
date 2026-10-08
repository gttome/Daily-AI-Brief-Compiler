import fs from 'node:fs';
import {buildImageLaneHandoff} from '../operations/image-lane-handoff.mjs';
const [inputPath,outputPath]=process.argv.slice(2);
if(!outputPath) throw new Error('usage: node scripts/build-image-lane-handoff.mjs input.json output.json');
const result=buildImageLaneHandoff(JSON.parse(fs.readFileSync(inputPath,'utf8')));
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
