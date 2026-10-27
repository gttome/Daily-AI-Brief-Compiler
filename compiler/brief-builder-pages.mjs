// Pure, bounded website navigation and content changes.
// The underlying editorial edition and all accepted images remain immutable.
export const BRIEF_BUILDER_URL='/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/';
export const BRIEF_BUILDER_ROUTE='build-your-own-brief-compiler/index.html';
export const BRIEF_BUILDER_MD='site-content/build-your-own-brief-compiler.md';
const TARGET='Build Your Own Brief';

function replaceUnique(value,existing,addition,label){
  if(value.split(existing).length!==2)throw Error('brief_builder_template_'+label+'_changed');
  return value.replace(existing,existing+addition);
}
export function addBuilderToPublishedNavigation(html,{requireBoth=true}={}){
  const link='<li><a href="'+BRIEF_BUILDER_URL+'">'+TARGET+'</a></li>';
  const footer='<a href="'+BRIEF_BUILDER_URL+'">'+TARGET+'</a>';
  if(html.includes(BRIEF_BUILDER_URL))throw Error('brief_builder_nav_already_added');
  const header='<li><a href="/Daily-AI-Brief-Compiler/sources/">Sources</a></li>';
  let output=replaceUnique(html,header,'\n            '+link,'public_header');
  if(requireBoth){
    const oldFooter='<a href="/Daily-AI-Brief-Compiler/sources/">Sources</a>';
    output=replaceUnique(output,oldFooter,'\n          '+footer,'public_footer');
  }
  return output;
}
export function addBuilderToJekyllLayout(layout){
  const header='<li><a href="{{ \'/sources/\' | relative_url }}">Sources</a></li>';
  const footer='<a href="{{ \'/sources/\' | relative_url }}">Sources</a>';
  if(layout.includes("'/build-your-own-brief-compiler/'"))throw Error('brief_builder_nav_already_added');
  const newHeader='<li><a href="{{ \'/build-your-own-brief-compiler/\' | relative_url }}">'+TARGET+'</a></li>';
  const newFooter='<a href="{{ \'/build-your-own-brief-compiler/\' | relative_url }}">'+TARGET+'</a>';
  return replaceUnique(replaceUnique(layout,header,'\n            '+newHeader,'jekyll_header'),
    footer,'\n          '+newFooter,'jekyll_footer');
}
export function assertBuilderMarkdown(markdown){
  const text=String(markdown);
  if(!text.startsWith('---\nlayout: default\n')||
     !text.includes('permalink: /build-your-own-brief-compiler/')||
     !text.includes('## The second product: a living knowledge system')||
     !text.includes('Generative AI Professional Series')||
     !text.includes('## How to start with a Brief Compiler for your own field')||
     (text.match(/class="brief-builder-anchor"/g)||[]).length!==5)
    throw Error('brief_builder_web_content_incomplete');
  for(const sector of ['manufacturing','healthcare','cybersecurity','education','government'])
    if(!text.includes('id="use-case-'+sector+'"'))throw Error('brief_builder_missing_'+sector);
  for(const book of ['genaipromptingguide','genaipro','GenAILearn','reliable-context-engineering'])
    if(!text.includes('https://leanpub.com/'+book))
      throw Error('brief_builder_book_mapping_missing_'+book);
  if(text.includes('sandbox:/')||text.includes('file:///'))
    throw Error('brief_builder_document_links_not_for_website');
  return {result:'PASS',scenarios:5};
}
