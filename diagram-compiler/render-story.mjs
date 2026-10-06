import fs from 'node:fs';
import sharp from 'sharp';
import {validateSpec,palette,defs,calloutRail,esc,sha256,gitBlobSha} from './v2/helpers.mjs';
import {render as pipeline} from './v2/pipeline.mjs';
import {render as layeredSystem} from './v2/layered-system.mjs';
import {render as controlLoop} from './v2/control-loop.mjs';
import {render as hubSpoke} from './v2/hub-spoke.mjs';
import {render as comparison} from './v2/comparison.mjs';
import {render as stateMachine} from './v2/state-machine.mjs';

const specPath=process.argv[2],outDir=process.argv[3];
if(!specPath||!outDir) throw new Error('usage: node diagram-compiler/render-story.mjs <spec.json> <outdir>');

const specText=fs.readFileSync(specPath,'utf8');
const spec=JSON.parse(specText);
validateSpec(spec);

const p=palette(spec);
const colors=[p.blue,p.green,p.purple,p.orange,p.cyan,p.red];
const renderers={
  pipeline,
  layered_system:layeredSystem,
  control_loop:controlLoop,
  hub_spoke:hubSpoke,
  comparison,
  state_machine:stateMachine
};

const mechanism=renderers[spec.grammar](spec,p,colors);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
${defs(p)}
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="600" cy="300" r="250" fill="${p.blue}" opacity=".035"/>
<g font-family="DejaVu Sans, Arial, sans-serif">
<text x="600" y="44" text-anchor="middle" font-size="27" font-weight="800" fill="${p.ink}">${esc(spec.title)}</text>
<text x="600" y="70" text-anchor="middle" font-size="12.5" fill="#587089">${esc(spec.subtitle)}</text>
${mechanism}
${calloutRail(spec,p,colors)}
<text x="600" y="616" text-anchor="middle" font-size="9.5" fill="#7b91a4">${esc(spec.footer)}</text>
</g></svg>`;

fs.mkdirSync(outDir,{recursive:true});
const svgPath=outDir+'/proof.svg',pngPath=outDir+'/proof.png';
fs.writeFileSync(svgPath,svg);

await sharp(Buffer.from(svg)).png({compressionLevel:9,adaptiveFiltering:true}).toFile(pngPath);
const png=fs.readFileSync(pngPath);
const meta=await sharp(png).metadata();
if(meta.format!=='png'||meta.width!==1200||meta.height!==630) throw new Error('rendered PNG identity invalid');
if(png.length<60000) throw new Error('rendered PNG suspiciously small');

const receipt={
  schema_version:'daily-compiler-diagram-render-v2',
  result:'PASS',
  renderer:'proposal1r-grammar-set-v2.2',
  grammar:spec.grammar,
  story_id:spec.story_id,
  source_spec:specPath,
  source_spec_sha256:sha256(Buffer.from(specText)),
  png_path:pngPath,
  svg_path:svgPath,
  png_bytes:png.length,
  png_sha256:sha256(png),
  git_blob_sha:gitBlobSha(png),
  dimensions:{width:meta.width,height:meta.height},
  deterministic:true,
  owner_intervention:false
};
fs.writeFileSync(outDir+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
