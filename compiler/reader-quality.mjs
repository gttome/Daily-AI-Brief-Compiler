// The successful HTTP/render contract does not permit broken reader-facing semantics.
export function assertPublishedReaderQuality(html,{route='unknown',expectedDates=1}={}){
  if(typeof html!=='string')throw Error('reader_quality:missing_html:'+route);
  const actual=(html.match(/<strong>Date:<\/strong>/g)||[]).length;
  if(actual!==expectedDates)throw Error('reader_quality:date_count:'+route+':'+actual);
  if(/\b(?:NaN|Invalid Date)\b/.test(html))throw Error('reader_quality:invalid_date:'+route);
  if(/<strong>Topics:<\/strong>\s*(?:<\/p>|<br\s*\/>)/i.test(html))
    throw Error('reader_quality:empty_topics:'+route);
  const duplicate=/<p><strong>Why it matters:<\/strong> ([^<]+)<\/p>\s*<p><strong>Connection to the brief:<\/strong> \1<\/p>/g;
  if(duplicate.test(html))throw Error('reader_quality:duplicate_podcast_explanation:'+route);
  return {route,result:'PASS',dates_checked:actual};
}
