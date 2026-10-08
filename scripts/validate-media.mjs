import fs from 'node:fs';
import { readMediaEvidence, validateMediaSelection } from '../compiler/media.mjs';

const [statePath, contentPath, repoRoot = '.'] = process.argv.slice(2);
if (!statePath || !contentPath) throw new Error('usage: node scripts/validate-media.mjs state.json content.json [repo-root]');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const bundle = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const evidence = readMediaEvidence(bundle.media_evidence, repoRoot);
console.log(JSON.stringify(validateMediaSelection({bundle,state,evidence}), null, 2));
