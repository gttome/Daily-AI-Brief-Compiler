// Compiler-owned reader-copy guard. Does not edit immutable semantic bundles or vendored source.
export const READING_COPY_EFFECTIVE='2026-10-14';

const SUPPORT_BLOCK=/<p><strong>([^<]+):<\/strong> ([\s\S]*?)<\/p><div class="learning-outcome"><strong>What you’ll learn<\/strong><p>([\s\S]*?)<\/p><\/div>/;
const ASIDE=/<aside class="reading-context" aria-label="Reading context">([\s\S]*?)<\/aside>/g;
const SUMMARY=/<p><strong>Summary:<\/strong> ([\s\S]*?)<\/p>/;
const WHY=/<p><strong>Why it matters:<\/strong> ([\s\S]*?)<\/p>/;

export function comparableReaderText(value){
  return String(value??'')
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&(?:apos|#39);/g,"'")
    .replace(/&quot;/g,'"').replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}

// Only removes an introductory context/learning pair if it is a word-for-word
// duplicate of the nearby canonical Summary/Why it matters content.
export function removeRedundantReadingCopy(source,{editionDate,requireCopies=false}={}){
  if(typeof source!=='string')throw new Error('compiled HTML must be a string');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(editionDate||''))throw new Error('editionDate required');
  if(editionDate<READING_COPY_EFFECTIVE)return {html:source,removed:0};
  let removed=0;
  const html=source.replace(ASIDE,(whole,inner,offset)=>{
    const block=inner.match(SUPPORT_BLOCK);
    if(!block)return whole;
    const nearby=source.slice(offset+whole.length,offset+whole.length+6500);
    const summary=nearby.match(SUMMARY);
    const why=nearby.match(WHY);
    if(!summary||!why)throw new Error('reading-context copy has no neighboring Summary/Why; refusing destructive correction');
    if(comparableReaderText(block[2])!==comparableReaderText(summary[1])||
       comparableReaderText(block[3])!==comparableReaderText(why[1]))
      throw new Error('reading-context text is editorially distinct; refusing to remove it');
    removed++;
    return whole.replace(block[0],'');
  });
  if(requireCopies&&removed===0)throw new Error('no duplicate reading-context blocks found on expected route');
  if(/<aside class="reading-context"[^>]*>[\s\S]*?<div class="learning-outcome">[\s\S]*?<\/aside>/.test(html))
    throw new Error('unexpected remaining learning-outcome content; investigate before publishing');
  return {html,removed};
}

export function assertCleanReadingCopy(html,{editionDate}){
  if(editionDate<READING_COPY_EFFECTIVE)return;
  if(/<div class="learning-outcome">/.test(html))
    throw new Error('duplicate-support-prone What you’ll learn section in new reader edition');
}
