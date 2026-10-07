#!/usr/bin/env node
import fs from 'node:fs';
import {validateFutureSuggestion} from '../operations/future-brief.mjs';

const inboxPath=process.argv[2]||'config/future-brief-inbox.json';
const suggestionPath=process.argv[3];
if(!suggestionPath) throw new Error('usage: node scripts/add-future-brief-suggestion.mjs [inbox.json] <suggestion.json>');
const inbox=JSON.parse(fs.readFileSync(inboxPath,'utf8'));
const suggestion=JSON.parse(fs.readFileSync(suggestionPath,'utf8'));
const errors=validateFutureSuggestion(suggestion);
if(errors.length) throw new Error(errors.join(';'));
if(inbox.schema_version!=='daily-compiler-future-brief-inbox-v1'||!Array.isArray(inbox.suggestions)) throw new Error('future_inbox_invalid');
const duplicate=inbox.suggestions.find(x=>x.dedupe_key===suggestion.dedupe_key&&['queued','carried_forward'].includes(x.status));
if(duplicate) throw new Error('future_suggestion_duplicate:'+duplicate.suggestion_id);
inbox.suggestions.push(suggestion);
inbox.updated_at=new Date().toISOString();
fs.writeFileSync(inboxPath,JSON.stringify(inbox,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',suggestion_id:suggestion.suggestion_id,inbox:inboxPath},null,2));
