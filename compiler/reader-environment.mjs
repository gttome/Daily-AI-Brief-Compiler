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

export function normalizeReaderEnvironment(value,environment=readerEnvironment){
  return String(value)
    .replaceAll(environment.publicBase,environment.productionReferenceBase)
    .replaceAll(environment.baseurl,environment.productionReferenceBaseurl)
    .replaceAll(environment.analyticsNamespace,'daily-ai-brief');
}
