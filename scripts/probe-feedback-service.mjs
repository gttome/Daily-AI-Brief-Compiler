const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const headers={'origin':'https://gttome.github.io','referer':'https://gttome.github.io/Daily-AI-Brief-Compiler/'};
const paths=['/api/private/snapshots','/api/private/comments','/api/private/watchlist','/api/private/signals','/api/private/usage'];
const out=[];
for(const path of paths){
  for(const method of ['GET','OPTIONS']){
    const response=await fetch(base+path,{method,headers});
    const text=await response.text();
    out.push({path,method,status:response.status,body:text.slice(0,1200),allow:response.headers.get('allow'),www_authenticate:response.headers.get('www-authenticate')});
  }
}
console.log(JSON.stringify({schema_version:'feedback-service-private-surface-readonly-probe-v1',out},null,2));
