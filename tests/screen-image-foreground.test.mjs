import test from 'node:test';
import assert from 'node:assert/strict';
import {foregroundInsets} from '../scripts/screen-image-foreground.mjs';
test('reports exact inset, flags an edge mark and distinguishes an unmarked canvas',()=>{
 const data=Buffer.alloc(1200*630*3,255),image={width:1200,height:630,data};
 const mark=(x,y)=>data[(y*1200+x)*3+1]=100;
 assert.equal(foregroundInsets(image).screen,'NO_MARKS_REVIEW_REQUIRED');
 mark(60,60);mark(1100,555);
 assert.deepEqual(foregroundInsets(image).insets,{left:60,top:60,right:99,bottom:74});
 assert.equal(foregroundInsets(image).screen,'NO_DARK_MARKS_WITHIN_40PX');
 mark(1175,150);
 assert.equal(foregroundInsets(image).screen,'CLOSE_EDGE_REVIEW_REQUIRED');
});
