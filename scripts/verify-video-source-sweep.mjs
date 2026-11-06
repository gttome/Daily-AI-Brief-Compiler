// Checks the actual per-source observation ledger before a new edition seal.
// Reading a plan or directory does not constitute a source attempt.
import fs from 'node:fs';
import {validateVideoSourceSweep} from '../operations/video-source-sweep.mjs';

const [bundleFile,registryFile]=process.argv.slice(2);
if(!bundleFile||!registryFile)
  throw Error('Usage: verify-video-source-sweep.mjs <draft-or-sealed-bundle.json> <resource-registry.json>');
const bundle=JSON.parse(fs.readFileSync(bundleFile,'utf8'));
const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
const result=validateVideoSourceSweep({editionDate:bundle.edition_date,
  registry,sweep:bundle.video_source_sweep,
  selectionLockedAt:bundle.editorial_provenance?.selection_locked_at});
console.log(JSON.stringify(result));
