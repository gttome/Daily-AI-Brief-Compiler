const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const origin='https://gttome.github.io';
const paths=['/api/ratings','/api/comments','/api/watchlist','/api/private/snapshots','/api/private/comments','/api/private/watchlist'];
const results=[];
for(const path of paths){
  const r=await fetch(base+path,{method:'OPTIONS',headers:{
    'origin':origin,
    'access-control-request-method':'POST',
    'access-control-request-headers':'content-type,x-operation-id,x-rating-revision'
  }});
  results.push({
    path,status:r.status,
    allow:r.headers.get('allow'),
    cors_origin:r.headers.get('access-control-allow-origin'),
    cors_methods:r.headers.get('access-control-allow-methods'),
    cors_headers:r.headers.get('access-control-allow-headers'),
    www_authenticate:r.headers.get('www-authenticate')
  });
}
console.log(JSON.stringify({schema_version:'feedback-service-options-probe-v1',results},null,2));
