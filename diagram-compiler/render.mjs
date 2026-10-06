import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';

const specPath = process.argv[2] || 'proof/f1d/diagram-spec.json';
const outDir = process.argv[3] || 'proof/f1r';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

function fail(message) { throw new Error(message); }
function esc(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
function requireText(name, value, max=120) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be non-empty text`);
  if (value.length > max) fail(`${name} exceeds ${max} chars`);
}
function requireArray(name, arr, n) {
  if (!Array.isArray(arr) || arr.length !== n) fail(`${name} must contain exactly ${n} items`);
}
if (spec.schema_version !== 'daily-compiler-diagram-spec-v1') fail('schema_version mismatch');
requireText('story_id', spec.story_id, 80);
requireText('title', spec.title, 52);
requireText('subtitle', spec.subtitle, 100);
for (const section of ['producer','bundle','compiler','evidence']) {
  if (!spec[section] || typeof spec[section] !== 'object') fail(`${section} missing`);
  requireText(`${section}.title`, spec[section].title, 34);
}
requireArray('producer.items', spec.producer.items, 4);
requireArray('bundle.layers', spec.bundle.layers, 4);
requireArray('compiler.stages', spec.compiler.stages, 4);
requireArray('evidence.items', spec.evidence.items, 4);
if (!spec.flow_labels || typeof spec.flow_labels !== 'object') fail('flow_labels missing');

for (const [name, arr] of [
  ['producer.items', spec.producer.items],
  ['bundle.layers', spec.bundle.layers],
  ['compiler.stages', spec.compiler.stages],
  ['evidence.items', spec.evidence.items]
]) {
  arr.forEach((item,i) => {
    requireText(`${name}[${i}].label`, item.label, 24);
    requireText(`${name}[${i}].detail`, item.detail, 42);
  });
}

const palette = {
  ink:'#12233d',
  navy:'#16375b',
  blue:'#1477e6',
  cyan:'#2bb8ef',
  green:'#13ad75',
  mint:'#7de3bb',
  orange:'#f58a2c',
  purple:'#7c56d8',
  light:'#f7fbff',
  line:'#ccdae8',
  ...spec.palette
};

const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff"/>
    <stop offset="1" stop-color="#eef6fc"/>
  </linearGradient>
  <linearGradient id="bluePanel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#eaf5ff"/>
    <stop offset="0.55" stop-color="#c9e7ff"/>
    <stop offset="1" stop-color="#90c7f6"/>
  </linearGradient>
  <linearGradient id="bundleBody" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e7fff6"/>
    <stop offset="0.45" stop-color="#8fe5c2"/>
    <stop offset="1" stop-color="#2e9d7c"/>
  </linearGradient>
  <linearGradient id="darkPanel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#183958"/>
    <stop offset="1" stop-color="#0c2138"/>
  </linearGradient>
  <linearGradient id="evidencePanel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f2edff"/>
    <stop offset="1" stop-color="#d6c8ff"/>
  </linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
    <feDropShadow dx="0" dy="9" stdDeviation="10" flood-color="#2d4663" flood-opacity="0.20"/>
  </filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="5"/>
  </filter>
  <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.blue}"/>
  </marker>
  <marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.green}"/>
  </marker>
  <marker id="arrowPurple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.purple}"/>
  </marker>
</defs>`;

function producerItems() {
  return spec.producer.items.map((item,i) => {
    const y=170+i*72;
    const colors=[palette.blue,palette.green,palette.purple,palette.orange];
    const c=colors[i];
    return `
      <g filter="url(#shadow)">
        <rect x="70" y="${y}" width="250" height="58" rx="15" fill="#fff" stroke="${c}" stroke-width="2"/>
        <rect x="70" y="${y}" width="14" height="58" rx="7" fill="${c}"/>
        <circle cx="105" cy="${y+29}" r="15" fill="${c}" opacity=".15"/>
        <circle cx="105" cy="${y+29}" r="7" fill="${c}"/>
        <text x="130" y="${y+24}" font-size="15" font-weight="700" fill="${palette.ink}">${esc(item.label)}</text>
        <text x="130" y="${y+43}" font-size="11.5" fill="#49647e">${esc(item.detail)}</text>
      </g>`;
  }).join('');
}

function bundleLayers() {
  return spec.bundle.layers.map((item,i) => {
    const y=226+i*48;
    const c=[palette.blue,palette.cyan,palette.green,palette.purple][i];
    return `
      <g>
        <rect x="445" y="${y}" width="270" height="36" rx="9" fill="#fff" fill-opacity=".92" stroke="${c}" stroke-width="1.8"/>
        <rect x="458" y="${y+8}" width="16" height="20" rx="4" fill="${c}" opacity=".85"/>
        <text x="486" y="${y+16}" font-size="13" font-weight="700" fill="${palette.ink}">${esc(item.label)}</text>
        <text x="486" y="${y+29}" font-size="9.8" fill="#4e647a">${esc(item.detail)}</text>
      </g>`;
  }).join('');
}

function compilerStages() {
  return spec.compiler.stages.map((item,i) => {
    const y=170+i*72;
    const c=[palette.blue,palette.green,palette.orange,palette.purple][i];
    return `
      <g filter="url(#shadow)">
        <rect x="880" y="${y}" width="250" height="58" rx="15" fill="url(#darkPanel)" stroke="${c}" stroke-width="2"/>
        <rect x="894" y="${y+13}" width="34" height="32" rx="8" fill="${c}" opacity=".93"/>
        <text x="911" y="${y+35}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${i+1}</text>
        <text x="941" y="${y+24}" font-size="15" font-weight="700" fill="#fff">${esc(item.label)}</text>
        <text x="941" y="${y+43}" font-size="11.5" fill="#bdd0df">${esc(item.detail)}</text>
      </g>`;
  }).join('');
}

function evidenceItems() {
  return spec.evidence.items.map((item,i) => {
    const x=250+i*185;
    const c=[palette.blue,palette.green,palette.orange,palette.purple][i];
    return `
      <g>
        <rect x="${x}" y="526" width="165" height="58" rx="13" fill="#fff" stroke="${c}" stroke-width="1.6"/>
        <circle cx="${x+22}" cy="546" r="8" fill="${c}"/>
        <path d="M${x+18},546 l3,3 l6,-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${x+38}" y="548" font-size="12.5" font-weight="700" fill="${palette.ink}">${esc(item.label)}</text>
        <text x="${x+16}" y="570" font-size="9.6" fill="#566d83">${esc(item.detail)}</text>
      </g>`;
  }).join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
${defs}
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="600" cy="300" r="235" fill="#91d7ff" opacity=".06"/>
<circle cx="600" cy="300" r="180" fill="#54d6a1" opacity=".05"/>

<text x="600" y="46" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="800" fill="${palette.ink}">${esc(spec.title)}</text>
<text x="600" y="72" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="13" fill="#54708a">${esc(spec.subtitle)}</text>

<!-- semantic producer -->
<g font-family="DejaVu Sans, Arial, sans-serif">
  <rect x="42" y="112" width="306" height="382" rx="28" fill="url(#bluePanel)" stroke="#77b4e6" stroke-width="2" filter="url(#shadow)"/>
  <rect x="58" y="126" width="274" height="42" rx="13" fill="${palette.navy}"/>
  <text x="195" y="153" text-anchor="middle" font-size="19" font-weight="800" fill="#fff">${esc(spec.producer.title)}</text>
  ${producerItems()}
  <path d="M320 199 C365 199, 375 215, 408 235" fill="none" stroke="${palette.blue}" stroke-width="5" opacity=".22"/>
  <path d="M320 271 C370 271, 378 270, 415 280" fill="none" stroke="${palette.green}" stroke-width="5" opacity=".22"/>
  <path d="M320 343 C365 343, 380 328, 415 330" fill="none" stroke="${palette.purple}" stroke-width="5" opacity=".22"/>
  <path d="M320 415 C365 415, 378 380, 415 380" fill="none" stroke="${palette.orange}" stroke-width="5" opacity=".22"/>
</g>

<!-- central bundle -->
<g font-family="DejaVu Sans, Arial, sans-serif" filter="url(#shadow)">
  <ellipse cx="580" cy="171" rx="172" ry="45" fill="#b9f1dc" stroke="${palette.green}" stroke-width="2.5"/>
  <rect x="408" y="171" width="344" height="270" fill="url(#bundleBody)" stroke="${palette.green}" stroke-width="2.5"/>
  <ellipse cx="580" cy="441" rx="172" ry="45" fill="#4fb894" stroke="${palette.green}" stroke-width="2.5"/>
  <ellipse cx="580" cy="171" rx="142" ry="31" fill="#f8fffc" stroke="#8edabd" stroke-width="1.6"/>
  <text x="580" y="162" text-anchor="middle" font-size="18" font-weight="800" fill="${palette.ink}">${esc(spec.bundle.title)}</text>
  <text x="580" y="184" text-anchor="middle" font-size="10.5" fill="#4d6d63">ONE SEALED, PORTABLE EDITION STATE</text>
  ${bundleLayers()}
  <g transform="translate(667 394)">
    <circle cx="0" cy="0" r="28" fill="${palette.green}" stroke="#fff" stroke-width="4"/>
    <path d="M-13 0 l8 8 l18 -20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="580" y="471" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${esc(spec.bundle.seal_label || 'IMMUTABLE BUNDLE')}</text>
</g>

<!-- compiler -->
<g font-family="DejaVu Sans, Arial, sans-serif">
  <rect x="852" y="112" width="306" height="382" rx="28" fill="#eaf0f6" stroke="#9fb5c9" stroke-width="2" filter="url(#shadow)"/>
  <rect x="868" y="126" width="274" height="42" rx="13" fill="${palette.navy}"/>
  <text x="1005" y="153" text-anchor="middle" font-size="19" font-weight="800" fill="#fff">${esc(spec.compiler.title)}</text>
  ${compilerStages()}
</g>

<!-- primary routed flows -->
<g fill="none" stroke-linecap="round">
  <path d="M348 258 C385 258 389 260 410 270" stroke="#fff" stroke-width="14" opacity=".9"/>
  <path d="M348 258 C385 258 389 260 410 270" stroke="${palette.blue}" stroke-width="5" marker-end="url(#arrowBlue)"/>
  <path d="M752 275 C790 275 816 258 852 258" stroke="#fff" stroke-width="14" opacity=".9"/>
  <path d="M752 275 C790 275 816 258 852 258" stroke="${palette.green}" stroke-width="5" marker-end="url(#arrowGreen)"/>
  <path d="M1004 494 C1004 509 927 508 850 508 C740 508 720 506 700 506" stroke="#fff" stroke-width="12" opacity=".9"/>
  <path d="M1004 494 C1004 509 927 508 850 508 C740 508 720 506 700 506" stroke="${palette.purple}" stroke-width="4" marker-end="url(#arrowPurple)"/>
</g>

<g font-family="DejaVu Sans, Arial, sans-serif">
  <rect x="339" y="222" width="145" height="28" rx="14" fill="#fff" stroke="${palette.blue}" stroke-width="1.5"/>
  <text x="411" y="241" text-anchor="middle" font-size="11.5" font-weight="700" fill="${palette.blue}">${esc(spec.flow_labels.semantic)}</text>
  <rect x="718" y="222" width="145" height="28" rx="14" fill="#fff" stroke="${palette.green}" stroke-width="1.5"/>
  <text x="790" y="241" text-anchor="middle" font-size="11.5" font-weight="700" fill="${palette.green}">${esc(spec.flow_labels.compile)}</text>
</g>

<!-- evidence rail -->
<g font-family="DejaVu Sans, Arial, sans-serif">
  <rect x="216" y="502" width="768" height="99" rx="24" fill="url(#evidencePanel)" stroke="#b7a6e8" stroke-width="2" filter="url(#shadow)"/>
  <rect x="481" y="490" width="238" height="31" rx="15" fill="${palette.purple}"/>
  <text x="600" y="511" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">${esc(spec.evidence.title)}</text>
  ${evidenceItems()}
</g>

<!-- subtle data pins -->
<g fill="#fff" stroke="${palette.line}" stroke-width="1.5">
  <circle cx="376" cy="258" r="5"/><circle cx="391" cy="263" r="5"/>
  <circle cx="790" cy="268" r="5"/><circle cx="806" cy="263" r="5"/>
</g>

<text x="600" y="616" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="9.5" fill="#7790a5">Deterministic layout • exact persisted PNG • no runtime composition drift</text>
</svg>`;

fs.mkdirSync(outDir, {recursive:true});
const svgPath=`${outDir}/proof.svg`;
const pngPath=`${outDir}/proof.png`;
fs.writeFileSync(svgPath, svg);

await sharp(Buffer.from(svg)).png({compressionLevel:9, adaptiveFiltering:true}).toFile(pngPath);
const png=fs.readFileSync(pngPath);
const meta=await sharp(png).metadata();
if (meta.format !== 'png') fail('rendered file is not PNG');
if (meta.width !== 1200 || meta.height !== 630) fail(`unexpected dimensions ${meta.width}x${meta.height}`);
if (png.length < 100000) fail(`PNG suspiciously small: ${png.length} bytes`);

const receipt={
  schema_version:'daily-compiler-f1r-v1',
  result:'PASS',
  renderer:'proposal1r-qualified-grammar-v1',
  source_spec:specPath,
  story_id:spec.story_id,
  png_path:pngPath,
  svg_path:svgPath,
  dimensions:{width:meta.width,height:meta.height},
  png_bytes:png.length,
  png_sha256:crypto.createHash('sha256').update(png).digest('hex'),
  svg_sha256:crypto.createHash('sha256').update(Buffer.from(svg)).digest('hex'),
  deterministic:true,
  owner_intervention:false,
  native_image_generation_used:false,
  low_quality_fallback_used:false
};
fs.writeFileSync(`${outDir}/receipt.json`, JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
