const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const paths=['/','/api/health','/api/items','/api/register','/api/ratings','/api/comments','/api/watchlist'];
async function get(path){
  const r=await fetch(base+path,{headers:{'origin':'https://gttome.github.io','referer':'https://gttome.github.io/Daily-AI-Brief-Compiler/'}});
  const text=await r.text();
  return {path,status:r.status,content_type:r.headers.get('content-type'),body:text.slice(0,600)};
}
const results=[];
for(const p of paths)results.push(await get(p));
const root=results[0].body;
console.log(JSON.stringify({schema_version:'feedback-service-surface-probe-v1',results},null,2));
