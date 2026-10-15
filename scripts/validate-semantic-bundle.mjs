// Read-only preseal check: the same deterministic gate used for production.
// Does not compile, write state, signal BUNDLE_READY, dispatch or publish.
import {validateEdition} from '../compiler/compile.mjs';
const [statePath,bundlePath]=process.argv.slice(2);
if(!statePath||!bundlePath)throw Error('Usage: node scripts/validate-semantic-bundle.mjs <state.json> <edition-bundle.json>');
const result=validateEdition({statePath,bundlePath,repoRoot:'.',allowPendingImages:true,release1Production:true});
console.log(JSON.stringify({result:'PASS',edition_date:result.bundle.edition_date,bundle_sha256:result.bundleDigest,scope:'deterministic validation only; no production execution or publication'}));
