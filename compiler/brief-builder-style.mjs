// A single page-scoped CSS source, included in the real HTML <head>.
// Jekyll escapes raw <style> pasted inside website Markdown into visible text.
// Keep styling in the layout (future editions) or the published head (repair).
export const BUILDER_CSS_PATH='site-content/brief-builder-styles.css';
export const BUILDER_CSS_ID='brief-compiler-builder-style';
const fail=s=>{throw Error('brief_builder_style:'+s);};
function validCss(css){
 const source=String(css);
 if(!source.includes('.brief-builder-jump')||!source.includes('.main-content h2')||
    !source.includes('@media(max-width:480px)')||
    /<\/?style|<\/head|<script/i.test(source))fail('unexpected_css_contract');
 return source.trimEnd();
}
function styleTag(css){
 return '<style id="'+BUILDER_CSS_ID+'">\n'+validCss(css)+'\n</style>';
}
export function styleBuilderJekyllLayout(layout,css){
 const source=String(layout),closing='</head>';
 if(source.split(closing).length!==2||source.includes('id="'+BUILDER_CSS_ID+'"'))
  fail('layout_head_missing_or_already_styled');
 const condition="{% if page.permalink == '/build-your-own-brief-compiler/' %}";
 const snippet=condition+'\n    '+styleTag(css)+'\n    {% endif %}\n';
 return source.replace(closing,snippet+closing);
}
export function repairPublishedBuilderStyle(html,css){
 const source=String(html),closing='</head>';
 if(source.split(closing).length!==2||
    source.includes('<style id="'+BUILDER_CSS_ID+'">'))fail('published_head_missing_or_already_repaired');
 const escaped=/\n[ \t]*&lt;style id="brief-compiler-builder-style">([\s\S]*?)<\/style>\r?\n/;
 const m=source.match(escaped);
 if(!m||source.match(/&lt;style id="brief-compiler-builder-style">/g)?.length!==1)
  fail('original_visible_css_not_found_once');
 if(m[1].trim()!==validCss(css).trim())fail('visible_css_differs_from_canonical');
 const without=source.replace(m[0],'\n');
 const fixed=without.replace(closing,'    '+styleTag(css)+'\n'+closing);
 if(fixed.includes('&lt;style id=')||
    fixed.indexOf('<style id="'+BUILDER_CSS_ID+'">')>fixed.indexOf('</head>')||
    fixed.indexOf('<style id="'+BUILDER_CSS_ID+'">')<fixed.indexOf('<head'))
  fail('css_is_not_inside_head');
 if(fixed.match(/id="brief-compiler-builder-style"/g)?.length!==1)
  fail('style_missing_or_repeated');
 return fixed;
}
export function validateBuiltBuilderHead(html){
 const source=String(html),head=source.match(/<head>[\s\S]*?<\/head>/)?.[0];
 if(!head?.includes('<style id="'+BUILDER_CSS_ID+'">')||
    source.includes('&lt;style id="'+BUILDER_CSS_ID+'">')||
    source.split('<style id="'+BUILDER_CSS_ID+'">').length!==2)
  fail('missing_head_style_or_raw_visible_css');
 return true;
}
