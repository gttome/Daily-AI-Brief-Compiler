// A historical article is never selected by broad focus/category from a frozen reader
// snapshot. Only a story-authored relation to an actual previously published archive
// record may appear in the reader. The semantic relationship still needs editorial review.
const ROUTE=/^\/stories\/(20\d{2}-\d{2}-\d{2})\/[a-z0-9][a-z0-9-]*\/$/;
const TYPES=new Set(['builds_on','contrasts','updates','applies']);
const GENERIC=/\b(?:other october \d+ stories|other october \d+ edition articles|see companion october|earlier coverage provides useful context|other stories examine|related coverage generally)\b/i;
const words=s=>String(s).trim().split(/\s+/).filter(Boolean);

export function verifiedHistoricalRelation({candidate,editionDate,archive,publicBase}){
  if(candidate==null)return null; // Absence means no "Earlier Brief" panel.
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
    throw Error('historical_related must be an explicit verified relation object');
  const {url,headline,relationship,connection}=candidate;
  const route=typeof url==='string'&&url.match(ROUTE);
  if(!route||route[1]>=editionDate)
    throw Error('historical_related must reference a previous dated article route');
  if(typeof headline!=='string'||!headline.trim())
    throw Error('historical_related requires an exact prior headline');
  if(!TYPES.has(relationship))throw Error('historical_related relationship type is invalid');
  if(typeof connection!=='string'||words(connection).length<16||
     !/[.!?]$/.test(connection.trim())||GENERIC.test(connection))
    throw Error('historical_related explanation is generic or insufficiently specific');
  if(!archive||archive.schema_version!=='1.0.0'||!Array.isArray(archive.stories))
    throw Error('historical_related requires the verified published archive index');
  const matches=archive.stories.filter(item=>
    item.url===url&&item.content_type==='Article'&&item.brief_date===route[1]&&
    item.headline===headline&&item.availability_status==='available');
  if(matches.length!==1)throw Error('historical_related route and headline not verified in published history');
  if(typeof publicBase!=='string'||!/^https:\/\/gttome\.github\.io\/Daily-AI-Brief-Compiler\/?$/.test(publicBase))
    throw Error('historical_related cannot use an unapproved reader origin');
  return {
    label:'Earlier Brief',
    title:matches[0].headline,
    brief_date:matches[0].brief_date,
    url:publicBase.replace(/\/$/,'')+matches[0].url,
    connection:connection.trim()
  };
}
