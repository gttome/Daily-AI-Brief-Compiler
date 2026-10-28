import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSavedImageRegion} from '../scripts/image-capture-pixel-match.mjs';
function solid(width,height,fill=255){
 return {width,height,data:new Uint8Array(width*height*3).fill(fill)};
}
test('actual screenshot ink must agree with expected rendered-image region',()=>{
 const image=solid(100,60),capture=solid(130,90);
 for(let y=10;y<50;y++)for(let x=10;x<90;x++){
   let i=(y*image.width+x)*3;image.data[i]=45;image.data[i+1]=95;image.data[i+2]=140;
   let o=((y+15)*capture.width+(x+15))*3;
   capture.data[o]=45;capture.data[o+1]=95;capture.data[o+2]=140;
 }
 assert.equal(compareSavedImageRegion({capture,element:image,offsetX:15,offsetY:15}).result,'PASS');
 const empty=solid(130,90);
 assert.match(compareSavedImageRegion({capture:empty,element:image,offsetX:15,offsetY:15}).result,/BLOCKED/);
});
test('all-white or near-white images cannot be falsely certified by blank white screenshots',()=>{
 const white=solid(100,60),page=solid(130,90);
 assert.match(compareSavedImageRegion({capture:page,element:white,offsetX:15,offsetY:15}).result,/BLOCKED/);
});
