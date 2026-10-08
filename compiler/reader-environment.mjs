export const readerEnvironment=Object.freeze({
  publicBase:'https://gttome.github.io/Daily-AI-Brief-Compiler',
  baseurl:'/Daily-AI-Brief-Compiler',
  repository:'gttome/Daily-AI-Brief-Compiler',
  timezone:'America/Chicago',
  analyticsNamespace:'daily-compiler-shadow',
  feedbackBase:'https://dab-compiler-feedback.gtome.chatgpt.site',
  feedbackStore:'compiler-owned-public-v1',
  productionReferenceBase:'https://gttome.github.io/Daily-AI-Brief',
  productionReferenceBaseurl:'/Daily-AI-Brief'
});

// A destination changes generated reader URLs only. It does not approve a host,
// deploy an artifact, or change repository, feedback-store or runtime authority.
export function readerDestination({publicBase,baseurl}={}){
  const fail=()=>{throw new Error('invalid reader destination: canonical HTTPS origin and matching basepath required');};
  if(typeof publicBase!=='string'||typeof baseurl!=='string'||
    !/^(?:\/[A-Za-z0-9._~-]+)*$/.test(baseurl)||baseurl.split('/').some(part=>part==='.'||part==='..'))fail();
  let url;
  try{url=new URL(publicBase);}catch{fail();}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(url.hostname)||
    ['localhost','127.0.0.1','[::1]'].includes(url.hostname)||
    publicBase!==url.origin+baseurl||url.pathname!==(baseurl||'/'))fail();
  const legacy=new URL(readerEnvironment.productionReferenceBase);
  if(url.origin===legacy.origin&&(url.pathname===legacy.pathname||url.pathname.startsWith(legacy.pathname+'/')))
    throw new Error('legacy reader destination forbidden');
  return {publicBase,baseurl,origin:url.origin};
}

export function resolveReaderEnvironment(value=readerEnvironment){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('reader environment must be an object');
  const keys=Object.keys(readerEnvironment);
  if(Object.keys(value).some(key=>!keys.includes(key)))throw new Error('unknown reader environment field');
  if(Object.hasOwn(value,'publicBase')!==Object.hasOwn(value,'baseurl'))throw new Error('reader publicBase and baseurl must be supplied together');
  const environment={...readerEnvironment,...value};
  for(const key of keys.filter(key=>!['publicBase','baseurl'].includes(key)))
    if(environment[key]!==readerEnvironment[key])throw new Error('reader environment authority field cannot change: '+key);
  readerDestination(environment);
  return Object.freeze(environment);
}

export function normalizeReaderEnvironment(value,environment=readerEnvironment){
  environment=resolveReaderEnvironment(environment);
  let normalized=String(value).replaceAll(environment.publicBase,environment.productionReferenceBase);
  if(environment.baseurl)normalized=normalized.replaceAll(environment.baseurl,environment.productionReferenceBaseurl);
  return normalized.replaceAll(environment.analyticsNamespace,'daily-ai-brief');
}
