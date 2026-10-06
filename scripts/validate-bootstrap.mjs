import fs from 'node:fs';

const required = [
  'README.md',
  'docs/ISOLATION-BASELINE.md',
  'docs/ARCHITECTURE.md',
  'docs/EDITORIAL-CONTRACT.md',
  'contracts/compiler-state.schema.json',
  'contracts/edition-bundle.schema.json',
  'contracts/editorial-contract.json',
  'contracts/image-contract.json',
  'contracts/shadow-verification-contract.json'
];

for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`Missing required bootstrap file: ${path}`);
}

const editorial = JSON.parse(fs.readFileSync('contracts/editorial-contract.json', 'utf8'));
if (editorial.articles.count !== 6) throw new Error('articles.count must equal 6');
if (editorial.articles.agent_skills_exactly !== 1) throw new Error('exactly one Agent Skills story required');
if (editorial.media.videos.count !== 2 || editorial.media.podcasts.count !== 2) throw new Error('media counts invalid');
if (editorial.images.count !== 6) throw new Error('image count invalid');

const forbiddenRuntime = ['Supervisor', 'Watchdog Ring', 'writer lease', 'recovery lease'];
const architecture = fs.readFileSync('docs/ARCHITECTURE.md', 'utf8').toLowerCase();
for (const term of forbiddenRuntime) {
  if (!architecture.includes(term.toLowerCase())) throw new Error(`Architecture must explicitly forbid ${term}`);
}

console.log('bootstrap validation PASS');
