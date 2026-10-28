// Validate the ACTUAL saved screenshot pixels against the actual rendered IMG.
// Metadata and a positive clipping rectangle are not evidence that image pixels
// appeared in a saved mobile capture. Pure built-in zlib; no paid/image API.
import {inflateSync} from 'node:zlib';
const SIG='89504e470d0a1a0a';
function paeth(a,b,c){
 const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
 return da<=db&&da<=dc?a:db<=dc?b:c;
}
export function decodePngRgb(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.subarray(0,8).toString('hex')!==SIG)
  throw Error('SCREENSHOT_INVALID_PNG');
 let offset=8,width=0,height=0,channels=0,chunks=[],interlace=-1;
 while(offset+12<=buffer.length){
  const len=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8);
  if(offset+12+len>buffer.length)throw Error('PNG_TRUNCATED');
  const body=buffer.subarray(offset+8,offset+8+len);
  if(type==='IHDR'){
   width=body.readUInt32BE(0);height=body.readUInt32BE(4);
   if(body[8]!==8||![2,6].includes(body[9]))throw Error('PNG_COLOR_UNSUPPORTED');
   channels=body[9]===2?3:4;interlace=body[12];
  }else if(type==='IDAT')chunks.push(body);
  offset+=len+12;
  if(type==='IEND')break;
 }
 if(!width||!height||interlace!==0||width*height>3000000||!chunks.length)
  throw Error('PNG_DIMENSIONS_OR_INTERLACE_INVALID');
 const bytes=inflateSync(Buffer.concat(chunks)),stride=width*channels;
 if(bytes.length!==(stride+1)*height)throw Error('PNG_SCANLINES_INVALID');
 const rgb=new Uint8Array(width*height*3),row=new Uint8Array(stride),above=new Uint8Array(stride);
 let pos=0;
 for(let y=0;y<height;y++){
  const filter=bytes[pos++];
  for(let x=0;x<stride;x++){
   const a=x>=channels?row[x-channels]:0,b=above[x],c=x>=channels?above[x-channels]:0;
   const f=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;
   if(!Number.isFinite(f))throw Error('PNG_FILTER_INVALID');
   row[x]=(bytes[pos++]+f)&255;
  }
  for(let x=0;x<width;x++){
   const from=x*channels,to=(y*width+x)*3;
   rgb[to]=row[from];rgb[to+1]=row[from+1];rgb[to+2]=row[from+2];
  }
  above.set(row);
 }
 return {width,height,data:rgb};
}
function ink(im,x,y){
 const i=(y*im.width+x)*3;
 return im.data[i]<225||im.data[i+1]<225||im.data[i+2]<225;
}
function similar(a,ax,ay,b,bx,by,tolerance=30){
 const ai=(ay*a.width+ax)*3,bi=(by*b.width+bx)*3;
 return Math.abs(a.data[ai]-b.data[bi])<=tolerance&&
  Math.abs(a.data[ai+1]-b.data[bi+1])<=tolerance&&
  Math.abs(a.data[ai+2]-b.data[bi+2])<=tolerance;
}
export function compareSavedImageRegion({capture,element,offsetX,offsetY}){
 if(!capture||!element||!Number.isFinite(offsetX)||!Number.isFinite(offsetY))
  throw Error('PIXEL_EVIDENCE_MISSING');
 const offsetLeft=Math.round(offsetX),offsetTop=Math.round(offsetY);
 let inkSamples=0,matchingInkSamples=0,samples=0;
 for(let gy=0;gy<24;gy++)for(let gx=0;gx<40;gx++){
  const x=Math.min(element.width-1,Math.floor(element.width*(0.08+0.84*(gx+0.5)/40)));
  const y=Math.min(element.height-1,Math.floor(element.height*(0.08+0.84*(gy+0.5)/24)));
  samples++;
  if(!ink(element,x,y))continue;
  inkSamples++;
  // A fractional CSS box or screenshot clip may change raster alignment by a
  // pixel. Search a small finite neighborhood, not the whole screenshot.
  let matched=false;
  for(let dy=-2;dy<=2&&!matched;dy++)for(let dx=-2;dx<=2&&!matched;dx++){
   const px=offsetLeft+x+dx,py=offsetTop+y+dy;
   if(px>=0&&py>=0&&px<capture.width&&py<capture.height&&
      similar(element,x,y,capture,px,py))matched=true;
  }
  if(matched)matchingInkSamples++;
 }
 const ratio=inkSamples?matchingInkSamples/inkSamples:0;
 const pass=inkSamples>=15&&ratio>=0.82;
 return {result:pass?'PASS':'BLOCKED_SCREENSHOT_IMAGE_PIXELS_MISSING',
  ink_samples:inkSamples,matching_ink_samples:matchingInkSamples,
  match_ratio:Math.round(ratio*1000)/1000,total_grid_samples:samples,
  evidence:'saved_capture_and_element_png_rgb_pixels_compared'};
}
export function verifyImageRegionInSavedPng({capturePng,elementPng,offsetX,offsetY}){
 return compareSavedImageRegion({capture:decodePngRgb(capturePng),
  element:decodePngRgb(elementPng),offsetX,offsetY});
}
