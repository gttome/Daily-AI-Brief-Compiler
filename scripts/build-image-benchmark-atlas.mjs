import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const SOURCE_SHA='081d9f635b361ac164aa46feb31dda58794a6480';
const sourceRoot='vendor/production-reader/snapshot/briefs/images';
const targetRoot='vendor/image-benchmark';
const sets=[
  {key:'sep09',date:'2026-09-09',atlas:'atlas-sep09.png',files:[
    ['01-enterprise-managed-sandbox.png','1030a361d38d430a74ae43f99c7f85eadfcb646a'],
    ['02-portable-agent-skills-v2.png','97270fa529d053572045a4aaf79a4e75407e86d9'],
    ['03-chatgpt-images-25-v2.png','924881acc6201eeb96b130466b5c2e9d7e7c15e9'],
    ['04-quantum-agent-loop-v2.png','1668535d77dc91deddc6529c8454b07f1a93b93e'],
    ['05-personal-agent-architecture.png','a45725a79431aee12a1cfba0a9eb7be06c2dc22a'],
    ['06-copilot-support-search.png','30660a1d95710250e1b63674d7627f14c3b6857e']
  ]},
  {key:'sep10',date:'2026-09-10',atlas:'atlas-sep10-premium3.png',files:[
    ['01-anthropic-containment-premium3.png','1379579a97694bd18e68fc9fce8f8c1801ad4320'],
    ['02-github-agent-permissions-premium3.png','a2d22beeccb8a4d89872a14906ad3ea69db82912'],
    ['03-adobe-document-agent-premium3.png','40ceccd22d97da8c7aec241ee8ce042cfe8ba09e'],
    ['04-microsoft-work-value-premium3.png','c40e5e541e4a580dcd467f79bca011053b421782'],
    ['05-google-opal-web-errands-premium3.png','a5748ecbf7b8d91f73e7b83d5f62e2b8ad75aabb'],
    ['06-skillmd-portability-premium3.png','b73f02ab2b39dea793b40a32cfe9b14693e362f0']
  ]}
];
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
fs.mkdirSync(targetRoot,{recursive:true});
const provenance={schema_version:'daily-compiler-image-benchmark-provenance-v1',profile_id:'sep09-sep10-premium3-v1',source_repository:'gttome/Daily-AI-Brief',source_sha:SOURCE_SHA,assets:[]};
for(const set of sets){
  const dir=path.join(targetRoot,set.key); fs.mkdirSync(dir,{recursive:true});
  const composites=[];
  for(let i=0;i<set.files.length;i++){
    const [name,expectedBlob]=set.files[i],src=path.join(sourceRoot,set.date,name);
    const bytes=fs.readFileSync(src);
    if(blob(bytes)!==expectedBlob) throw new Error('benchmark blob mismatch: '+name);
    const dst=path.join(dir,name); fs.copyFileSync(src,dst);
    const resized=await sharp(bytes).resize(400,315,{fit:'contain',background:'#ffffff'}).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
    composites.push({input:resized,left:(i%3)*400,top:Math.floor(i/3)*315});
    provenance.assets.push({set:set.key,source_path:'briefs/images/'+set.date+'/'+name,target_path:dst.replaceAll('\\','/'),git_blob_sha:expectedBlob,sha256:sha256(bytes),bytes:bytes.length,copied_byte_identity:true});
  }
  const atlas=await sharp({create:{width:1200,height:630,channels:3,background:'#ffffff'}}).composite(composites).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
  fs.writeFileSync(path.join(targetRoot,set.atlas),atlas);
  provenance[set.key+'_atlas']={path:path.join(targetRoot,set.atlas).replaceAll('\\','/'),sha256:sha256(atlas),width:1200,height:630,deterministic:true};
}
fs.writeFileSync(path.join(targetRoot,'PROVENANCE.json'),JSON.stringify(provenance,null,2)+'\n');
fs.writeFileSync(path.join(targetRoot,'benchmark-profile-v1.json'),JSON.stringify({
  schema_version:'daily-compiler-image-benchmark-profile-v1',profile_id:'sep09-sep10-premium3-v1',status:'required',
  comparison_dimensions:['professional_finish','meaningful_detail','explanatory_mechanism','annotation_richness','visual_depth','hierarchy','composition','story_specificity','differentiation'],
  minimum_evidence:{meaningful_components_per_image:8,unique_composition_signatures:6,minimum_distinct_layout_signatures:4,minimum_distinct_diagram_grammars:4,minimum_distinct_hierarchy_signatures:4,minimum_distinct_annotation_patterns:3,opaque_single_score_is_sufficient:false},
  acceptance_principle:'Candidate must sit beside the locked September 9 and September 10 premium3 benchmark without noticeable downgrade in visual quality, explanatory depth, professional finish, or instructional richness.'
},null,2)+'\n');
console.log(JSON.stringify({result:'PASS',assets:provenance.assets.length,atlases:2}));
