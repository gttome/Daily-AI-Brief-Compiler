import fs from 'node:fs';
import {validateSetReview,setReviewGate} from '../image-capsules/set-review.mjs';
const file=process.argv[2];
if(!file) throw new Error('usage: node scripts/verify-image-set.mjs <set-review.json>');
const review=JSON.parse(fs.readFileSync(file,'utf8')),errors=validateSetReview(review);
console.log(JSON.stringify({result:errors.length?'FAIL':'PASS',gate:setReviewGate(review),errors},null,2));
if(errors.length) process.exitCode=1;
