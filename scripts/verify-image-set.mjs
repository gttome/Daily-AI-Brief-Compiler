import fs from 'node:fs';
import {validateSetReview} from '../image-capsules/set-review.mjs';

const p=process.argv[2];
if(!p) throw new Error('usage: node scripts/verify-image-set.mjs <set-review.json>');
const review=JSON.parse(fs.readFileSync(p,'utf8')),errors=validateSetReview(review);
console.log(JSON.stringify({result:errors.length?'FAIL':'PASS',errors},null,2));
if(errors.length) process.exitCode=1;
