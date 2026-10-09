// Independent byte-based GitHub Actions live audit, never a replacement for a browser review.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const OCT8_PUBLIC_BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
export const OCT8_LIVE_BASELINE=Object.freeze({
  'briefs/2026-10-08/index.html':['9ee91bbd9799bf03665b266cc90fd8e6e2ae6d32706c0b89f1b435ef51e8da84',63781],
  'stories/2026-10-08/cisco-webex-agentic-collaboration/index.html':['328af67f1f18ae5b40937c8223e6f82e2e4c45293702f4b546f99ea06c5daeee',16054],
  'stories/2026-10-08/github-agent-scale-git-infrastructure/index.html':['efddc36039fed475be323c639b5276b9aa1040e755e42069d355d6c9216101cd',16080],
  'stories/2026-10-08/google-developer-knowledge-agent-skill/index.html':['c97504ac525f54574573b5e66f0a76d6ad38f7cdf649912903787247676a2181',15868],
  'stories/2026-10-08/jump-trading-agentic-quant-research/index.html':['e655389b1997735e9624e1123f4227ad8763efb24a17256ee41499c88ac6f6f5',15645],
  'stories/2026-10-08/realtor-realassist-agent-actions/index.html':['0f9e028f9c0c14765d74ef254ad67cdc52267cfff2f685dd5bb8b554fc13194b',15295],
  'stories/2026-10-08/windows-hybrid-intelligence-copilot/index.html':['55d33a6c1601fcf118202a6d441fc2a437cac9aaebe8aa6334283e3a99cbe9cd',15857],
  'videos/2026-10-08/agent-skills/index.html':['b401d3b33535e637606b392a01c9cef89ec7ef6a2304b1654faea557c6ba38fa',11771],
  'videos/2026-10-08/general/index.html':['34eaf78504e1a369833f663844ebbc944bb1c71fa98bde9c07ba633b22c31155',12195],
  'podcasts/2026-10-08/ai-at-work/index.html':['20e7d9a5ed0cef210aaded8bfd0ece6379e7e3861d9c4096c502ad4763fb8f90',12504],
  'podcasts/2026-10-08/the-new-new-kingmakers-agents-developers-and-the-future-of-software-with-stephen-o-grady/index.html':['b913894d2be269e3772b3f328ed18d76a16f896c5497dcc49a64a3d8e41ef7c4',13881],
  'briefs/images/2026-10-08/dab-edition-2026-10-08-m01.png':['dd1dca5333a5e156880f1b575ddae3ec1c42f1656d0be5e879f253903fe1633f',789065],
  'briefs/images/2026-10-08/dab-edition-2026-10-08-m02.png':['ecf91db50db09f70fd085391494d169dfacf1209f541edd3c690d5d49f46636a',764128],
  'briefs/images/2026-10-08/dab-edition-2026-10-08-m10.png':['f40573aa30dd243bbe0a2a2ff87a1ecad5650abac75391dcb80ca95f973768d0',846785],
  'briefs/images/2026-10-08/dab-edition-2026-10-08-m11.png':['d304fce97b1d2f7d821a50edf5db2d2afb2d9411d08c0bd9a9ea5ecaa19354b1',1016747],
  'briefs/images/2026-10-08/dab-edition-2026-10-08-m12.png':['0dad7a6a1592cb28bd4ff7c0c686f1a08a92de62557c2559a8387f1bbfcebeb4',1010181],
  'briefs/images/2026-10-08/dab-edition-2026-10-08-m14.png':['28b12f2a682f071bdba33fdcb4719afb193e8e7da7e760371f9668c32b1ef768',877437]
});
export function auditOct8Response(relative,status,bytes){
  const expected=OCT8_LIVE_BASELINE[relative];
  if(!expected)throw new Error('unrecognized_oct8_route:'+relative);
  if(status!==200)throw new Error('live_http_'+status+':'+relative);
  const actual=crypto.createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==expected[1]||actual!==expected[0])
    throw new Error('live_oct8_hash_or_byte_drift:'+relative);
  return {route:relative,url:new URL(relative,OCT8_PUBLIC_BASE).href,http:200,bytes:bytes.length,sha256:actual};
}
export async function auditOct8Live({fetchImpl=fetch,outputPath=null}={}){
  const entries=Object.keys(OCT8_LIVE_BASELINE);
  if(entries.length!==17||entries.filter(s=>s.endsWith('.png')).length!==6)
    throw new Error('seventeen_pinned_objects_required');
  const rows=[];
  for(let i=0;i<entries.length;i+=5){
    const batch=await Promise.all(entries.slice(i,i+5).map(async relative=>{
      const url=new URL(relative,OCT8_PUBLIC_BASE).href;
      const res=await fetchImpl(url,{headers:{'Cache-Control':'no-cache','User-Agent':'DailyCompilerOct8PinnedIntegrityAudit/2'}});
      const bytes=Buffer.from(await res.arrayBuffer());
      return auditOct8Response(relative,res.status,bytes);
    }));
    rows.push(...batch);
  }
  const receipt={schema_version:'compiler-oct8-independent-live-audit-v1',result:'PASS',verified_at:new Date().toISOString(),
    base_url:OCT8_PUBLIC_BASE,objects:rows,objects_verified:rows.length,immutable_pngs_verified:6};
  if(outputPath){fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,JSON.stringify(receipt,null,2)+'\n');}
  return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await auditOct8Live({outputPath:process.argv[2]||'build/audits/oct8-live.json'});
  process.stdout.write(JSON.stringify(result)+'\n');
}
