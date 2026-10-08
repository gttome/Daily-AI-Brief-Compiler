import crypto from 'node:crypto';
import {deflateSync} from 'node:zlib';

// TEST_ONLY complete PNG byte streams. These are structural-integrity fixtures,
// never reader artwork, a native generation, or a quality-review assertion.
const crc=b=>{let n=0xffffffff;for(const v of b){n^=v;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;}return (n^0xffffffff)>>>0;};
const chunk=(name,data)=>{const type=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([type,data])),data.length+8);return out;};
const pngs=new Map();
function png(index){
  if(!pngs.has(index)){const header=Buffer.alloc(13);header.writeUInt32BE(1200);header.writeUInt32BE(630,4);header[8]=8;header[9]=2;const rows=Buffer.alloc((1200*3+1)*630,index+220);for(let y=0;y<630;y++)rows[y*(1200*3+1)]=0;pngs.set(index,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));}return Buffer.from(pngs.get(index));
}

export function imageCorrectionFixture(ids=['s1']) {
  const bundle={edition_date:'2026-10-08',stories:Array.from({length:6},(_,i)=>({id:'s'+(i+1),text:'keep '+i})),images:Array.from({length:6},(_,i)=>({story_id:'s'+(i+1),path:'old'+(i+1)+'.png',sha256:(i+10).toString(16).repeat(64),accepted:true,accepted_locked:true})),videos:['unchanged'],podcasts:['unchanged podcast'],watchlist:{new:['unchanged']},book_mappings:[{book:'unchanged'}],producer_receipt:{bound_image_strategy:'proposal1r_legacy'}};
  const assets={}, corrections=ids.map((id,index)=>{
    const bytes=png(index);
    assets[id]=bytes;
    const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
    const git_blob_sha=crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    return {schema_version:'daily-compiler-post-publication-correction-v1',correction_id:'c-'+id,edition_date:bundle.edition_date,requested_at:'2026-10-08T01:00:00Z',requested_by:'owner',correction_type:'replace_image',target:{story_id:id,expected_sha256:bundle.images.find(x=>x.story_id===id).sha256},replacement:{image:{story_id:id,path:'corrections/'+id+'.png',sha256,git_blob_sha,bytes:bytes.length,width:1200,height:630,format:'png',accepted:true,accepted_locked:true,visual_review:{result:'PASS',reviewed_sha256:sha256,quality_gate_location:'fresh_regular_chat_per_story'}}},reason:'Owner image correction',status:'VALIDATED',semantic_scope:'image_only',correction_revision:1,preserve_original:true,new_execution_allowed:false,protected_pr_required:true,live_verification_required:true};
  });
  return {bundle,assets,corrections,request:{schema_version:'daily-compiler-image-correction-request-v1',request_id:'r1',edition_date:bundle.edition_date,status:'READY_TO_APPLY',story_ids:ids,preserve_original:true,new_execution_allowed:false}};
}
