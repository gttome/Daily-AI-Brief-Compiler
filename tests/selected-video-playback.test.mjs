import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {safeUrl,durationOk,youtubePlayabilityStatus,validateBundle} = require('../scripts/verify-selected-video-playback.cjs');
test('Public-only HTTPS URLs',()=>{
 assert.equal(safeUrl('https://www.youtube.com/watch?v=abc'),'https://www.youtube.com/watch?v=abc');
 for(const url of ['http://example.com','https://localhost/page','https://127.0.0.1/watch','https://10.20.1.2/','https://user:pw@example.com/video'])assert.throws(()=>safeUrl(url));
});
test('Full-episode duration must match declared duration',()=>{
 assert.ok(durationOk(478,478.447));
 assert.ok(durationOk(355,355));
 assert.equal(durationOk(478,19),false);
 assert.equal(durationOk(478,900),false);
 assert.equal(durationOk(478,NaN),false);
});
test('YouTube metadata never substitutes for actual proof',()=>{
 assert.equal(youtubePlayabilityStatus({playabilityStatus:{status:'UNPLAYABLE'}}),'UNPLAYABLE');
 assert.equal(youtubePlayabilityStatus({playabilityStatus:{status:'OK'}}),'OK');
 assert.equal(youtubePlayabilityStatus(null),'UNOBSERVED');
});
test('Exactly two distinct valid candidate identities',()=>{
 const base={edition_date:'2026-10-18',videos:[{title:'one',url:'https://youtube.com/watch?v=1',duration_minutes:5.9},{title:'two',url:'https://ibm.com/example',duration_minutes:7.96}]};
 assert.equal(validateBundle(base).length,2);
 assert.throws(()=>validateBundle({...base,videos:[base.videos[0]]}));
 assert.throws(()=>validateBundle({...base,videos:[base.videos[0],{...base.videos[1],duration_minutes:28}]}));
 assert.throws(()=>validateBundle({...base,videos:[base.videos[0],{...base.videos[0]}]}));
});
