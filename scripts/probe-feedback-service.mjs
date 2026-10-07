const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const headers={'origin':'https://gttome.github.io','referer':'https://gttome.github.io/Daily-AI-Brief-Compiler/'};
async function req(path){
  const r=await fetch(base+path,{headers});
  const text=await r.text();
  return {path,status:r.status,content_type:r.headers.get('content-type'),body:text.slice(0,1200)};
}
const results=[];
for(const path of ['/', '/api/private/snapshots', '/api/private/comments', '/api/private/watchlist', '/api/private/usage']) results.push(await req(path));
console.log(JSON.stringify({schema_version:'feedback-service-access-recheck-v1',checked_at:new Date().toISOString(),results},null,2));
