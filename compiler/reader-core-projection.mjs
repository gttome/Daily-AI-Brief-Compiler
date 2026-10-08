import fs from 'node:fs';
import path from 'node:path';
import {sha256} from '../image-capsules/util.mjs';

// Exact imported reader source from the immutable 912248e5 baseline. The
// required reader-markup producers remain unchanged by this narrow cut.
const RENDERER_SHA256='aaba3ef0ec315b9bf413a0ff67082d4a18d7bbad4dcd8e2749f5aa3268549673';
const TRENDS_SHA256='727d36ef8756e325bd6b06fdb08d4195be27de27fae3d07dce57ff0d6fbfd888';
const OMITTED_FILES=new Set(['_generator/lib/analytics.mjs','_generator/lib/quality.mjs']);
const OMITTED_DIRECTORIES=['_records/analytics','_records/editorial-feedback','_records/qa','data/qa','qa'];
const OPTIONAL_OUTPUTS=[
  '  const analyticsPath=`_records/analytics/${edition.brief_date}.json`;',
  '  if(!fs.existsSync(path.join(repoRoot,analyticsPath)))files.set(analyticsPath,JSON.stringify(publicAnalyticsEvidence(edition),null,2));',
  '  // current-edition is a post-live-verification projection. Candidate rendering must never advance it.',
  "  files.set('qa/index.md', renderQaDashboard(repoRoot));",
  "  files.set('data/qa/30-day.json', JSON.stringify(qaAggregate(loadQaRecords(repoRoot)), null, 2));"
].join('\n')+'\n';

export function includeCoreReaderPath(relative){
  const name=relative.split(path.sep).join('/');
  return !OMITTED_FILES.has(name)&&!OMITTED_DIRECTORIES.some(prefix=>name===prefix||name.startsWith(prefix+'/'));
}

// Patch the throwaway materialized copy before importing it. The production
// snapshot, reader browser analytics/ratings/share/comments and all product
// validation remain intact. No optional module/data is imported or evaluated.
export function prepareCoreReaderRenderer(outDir){
  const cuts=[
    ['render.mjs',RENDERER_SHA256,[
      "import {publicAnalyticsEvidence} from './analytics.mjs';\n",
      "import {loadQaRecords, qaAggregate, renderQaDashboard} from './quality.mjs';\n",
      OPTIONAL_OUTPUTS
    ]],
    ['trends.mjs',TRENDS_SHA256,[
      "  const feedbackPath = path.join(repoRoot, '_records', 'editorial-feedback', `${edition.brief_date.slice(0, 7)}.json`);\n"+
      "  const feedback = fs.existsSync(feedbackPath) ? JSON.parse(fs.readFileSync(feedbackPath, 'utf8')) : buildEditorialFeedback(repoRoot, edition.brief_date, radar, edition.published_at);\n",
      '    [`_records/editorial-feedback/${edition.brief_date.slice(0, 7)}.json`, JSON.stringify(feedback, null, 2)]\n'
    ]]
  ];
  for(const [name,expected,blocks] of cuts){
    const file=path.join(outDir,'_generator','lib',name);
    let source=fs.readFileSync(file,'utf8');
    if(sha256(source)!==expected)throw new Error('reader core projection source integrity mismatch: '+name);
    for(const block of blocks){
      if(source.split(block).length!==2)throw new Error('reader core projection expected source block missing or duplicated: '+name);
      source=source.replace(block,'');
    }
    fs.writeFileSync(file,source);
  }
}
