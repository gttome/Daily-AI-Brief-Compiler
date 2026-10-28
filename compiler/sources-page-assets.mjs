// Source directory presentation is real CSS/JavaScript, not raw Markdown.
// Render CSS and interaction from canonical files in the correct DOM locations.
import crypto from 'node:crypto';

export const SOURCE_CSS='site-content/sources-transparency.css';
export const SOURCE_JS='site-content/sources-transparency.js';
export const PUBLIC_CSS='assets/css/sources-transparency.css';
export const PUBLIC_JS='assets/js/sources-transparency.js';
const PREFIX='/Daily-AI-Brief-Compiler/';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,12);
const fail=x=>{throw Error('source_assets:'+x);};

export function validateSourceAssets(css,js){
  const style=String(css),script=String(js);
  for(const marker of ['.srcx{','.src-source-card[hidden]','@media(max-width:540px)'])
    if(!style.includes(marker))fail('style_missing_'+marker);
  for(const marker of ["querySelector('#sources-transparency')",'var count=24',"more.addEventListener('click'","var eligible=cards.filter"])
    if(!script.includes(marker))fail('script_missing_'+marker);
  if(/<\/?style|<\/?script/i.test(style)||/<\/?script/i.test(script))fail('raw_tag_embedded_in_asset');
  return {cssHash:sha(style),jsHash:sha(script)};
}
export function appendSourcesAssetsToJekyllLayout(layout){
  let s=String(layout);
  if(s.includes("'/assets/css/sources-transparency.css")||s.includes("'/assets/js/sources-transparency.js"))fail('jekyll_already_enhanced');
  if(s.split('</head>').length!==2||s.split('</body>').length!==2)fail('jekyll_head_or_body_missing');
  const style='    {% if page.permalink == \'/sources/\' %}<link rel="stylesheet" href="{{ \'/assets/css/sources-transparency.css?v=1\' | relative_url }}">{% endif %}\n';
  const script='    {% if page.permalink == \'/sources/\' %}<script defer src="{{ \'/assets/js/sources-transparency.js?v=1\' | relative_url }}"></script>{% endif %}\n';
  s=s.replace('</head>',style+'</head>');
  return s.replace('</body>',script+'</body>');
}
export function assertSourcesPageAssets(html){
  const s=String(html);
  const head=s.slice(s.indexOf('<head'),s.indexOf('</head>')+7);
  if(!head.includes(PREFIX+PUBLIC_CSS)||s.split(PREFIX+PUBLIC_CSS).length!==2)
    fail('source_css_not_in_document_head_once');
  if(!s.includes(PREFIX+PUBLIC_JS)||s.split(PREFIX+PUBLIC_JS).length!==2)
    fail('source_js_script_not_linked_once');
  if(s.includes('&lt;style>')||s.includes('&lt;script>')||
     s.includes("var root=document.querySelector('#sources-transparency')")||
     s.includes(".srcx{--ink:"))fail('visible_style_or_script_source');
  if(!s.includes('id="sources-transparency"')||!s.includes('id="src-search"')||
     !s.includes('id="src-show-more"')||!s.includes('id="source-builder"'))
    fail('source_directory_or_explainer_missing');
  return true;
}
export function repairPublishedSourceMarkup(html,{css,js}){
  const source=String(html);
  const digest=validateSourceAssets(css,js);
  const mainStart=source.indexOf('<main id="content"');
  if(mainStart<0||source.includes(PREFIX+PUBLIC_CSS)||source.includes(PREFIX+PUBLIC_JS))
    fail('public_sources_already_fixed_or_layout_missing');
  let output=source;
  const style=/&lt;style>\s*([\s\S]*?)\s*<\/style>\s*/g;
  const script=/&lt;script>\s*([\s\S]*?)\s*<\/script>\s*/g;
  const cssMatches=[...output.matchAll(style)],jsMatches=[...output.matchAll(script)];
  if(cssMatches.length!==1||jsMatches.length!==1||
     cssMatches[0].index<mainStart||jsMatches[0].index<mainStart)
    fail('raw_style_or_script_not_once_inside_main');
  if(cssMatches[0][1].trim()!==String(css).trim()||jsMatches[0][1].trim()!==String(js).trim())
    fail('published_raw_code_drift_from_protected_assets');
  output=output.replace(style,'\n').replace(script,'\n');
  if(output.split('</head>').length!==2||output.split('</body>').length!==2)
    fail('closing_document_tag_missing');
  const styleRef='    <link rel="stylesheet" href="'+PREFIX+PUBLIC_CSS+'?v='+digest.cssHash+'">\n';
  const jsRef='    <script defer src="'+PREFIX+PUBLIC_JS+'?v='+digest.jsHash+'"></script>\n';
  output=output.replace('</head>',styleRef+'</head>').replace('</body>',jsRef+'</body>');
  assertSourcesPageAssets(output);
  return output;
}
