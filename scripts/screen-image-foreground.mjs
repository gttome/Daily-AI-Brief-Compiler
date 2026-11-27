// Conservative saved-pixel screen, not proof of source fidelity or art quality.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {decodePngRgb} from './image-capture-pixel-match.mjs';

export function foregroundInsets({width,height,data},threshold=225){
 if(width!==1200||height!==630||data.length!==width*height*3)throw Error('expected_1200x630_rgb');
 let left=width, right=-1, top=height, bottom=-1, marked=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*3;
  if(Math.min(data[p],data[p+1],data[p+2])>=threshold)continue;
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);marked++;
 }
 const insets=marked?{left,top,right:width-1-right,bottom:height-1-bottom}:null;
 return {insets,marked_pixels:marked,threshold,screen:!insets?'NO_MARKS_REVIEW_REQUIRED':
  Math.min(...Object.values(insets))<40?'CLOSE_EDGE_REVIEW_REQUIRED':'NO_DARK_MARKS_WITHIN_40PX'};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.length!==3)throw Error('usage: node scripts/screen-image-foreground.mjs IMAGE.png');
 const bytes=readFileSync(process.argv[2]);
 console.log(JSON.stringify({sha256:createHash('sha256').update(bytes).digest('hex'),
  ...foregroundInsets(decodePngRgb(bytes))}));
}
