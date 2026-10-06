import fs from 'node:fs';
import crypto from 'node:crypto';

const baseUrl=process.argv[2];
const editionDate=process.argv[3];
if(!baseUrl || !editionDate) throw new Error('usage: node scripts/verify-live.mjs <base-url> <edition-date>');

const manifest=JSON.parse(fs.readFileSync('build/fixture/build-manifest.json','utf8'));
if(manifest.edition_date!==editionDate) throw new Error('edition mismatch');

const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fetchOk=async url=>{
  const res=await fetch(url,{headers:{'cache-control':'no-cache'}});
  if(!res.ok) throw new Error(url+' returned '+res.status);
  return res;
};

async function verifyOnce(){
  const checked=[];
  for(const route of manifest.routes){
    const url=new URL(route,baseUrl).href;
    const res=await fetchOk(url);
    const text=await res.text();
    if(route.endsWith('.html') && !/<html/i.test(text)) throw new Error('HTML marker missing for '+url);
    checked.push({url,status:res.status});
  }
  for(const image of manifest.images){
    const url=new URL(image.asset,baseUrl).href;
    const res=await fetchOk(url);
    const bytes=Buffer.from(await res.arrayBuffer());
    const actual=sha256(bytes);
    if(actual!==image.sha256) throw new Error('deployed image hash mismatch '+url);
    checked.push({url,status:res.status,sha256:actual});
  }
  const editionUrl=new URL('briefs/'+editionDate+'/index.html',baseUrl).href;
  const edition=await (await fetchOk(editionUrl)).text();
  if((edition.match(/data-rating=/g)||[]).length!==30) throw new Error('live rating controls mismatch');
  if((edition.match(/data-share=/g)||[]).length!==6) throw new Error('live share controls mismatch');
  return checked;
}

let lastError;
for(let attempt=1;attempt<=18;attempt++){
  try{
    const checked=await verifyOnce();
    const receipt={
      schema_version:'daily-compiler-live-verification-v1',
      result:'PASS',
      base_url:baseUrl,
      edition_date:editionDate,
      bundle_sha256:manifest.bundle_sha256,
      checked_routes:checked.length,
      owner_intervention:false
    };
    fs.writeFileSync('build/fixture/live-verification.json',JSON.stringify(receipt,null,2)+'\n');
    console.log(JSON.stringify(receipt));
    process.exit(0);
  }catch(error){
    lastError=error;
    console.log('live verification attempt '+attempt+' failed: '+error.message);
    if(attempt<18) await sleep(10000);
  }
}
throw lastError;
