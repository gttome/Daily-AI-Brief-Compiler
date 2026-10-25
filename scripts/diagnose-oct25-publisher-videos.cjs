'use strict';
// READ-ONLY preflight of five official publisher-hosted educational videos.
// Never confuses visible metadata or preview with actual advancing full-episode playback.
const {chromium}=require('/tmp/browser/node_modules/playwright-core');
const {proveVideo}=require('./verify-selected-video-playback.cjs');
const list=[
  {title:"Putting AI to work for talent",url:"https://www.ibm.com/think/videos/ai-academy/generative-ai-for-talent",seconds:496},
  {title:"Put AI to work for Observability",url:"https://www.ibm.com/think/videos/ai-academy/ai-powered-observability",seconds:393},
  {title:"Put AI to work for IT operations",url:"https://www.ibm.com/think/videos/ai-academy/ai-itops",seconds:245},
  {title:"Uniting security and governance for the future of AI",url:"https://www.ibm.com/think/videos/ai-academy/governance-security-future-ai",seconds:331},
  {title:"Putting AI to work for customer service",url:"https://www.ibm.com/think/videos/ai-academy/generative-ai-for-customer-service",seconds:693}
];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{for(let i=0;i<list.length;i++){let c=list[i];try{let r=await proveVideo(browser,{index:i+1,title:c.title,url:c.url,expected_seconds:c.seconds},{maxAttempts:9,pollingMs:1000});process.stdout.write('DIAGNOSTIC_PASS '+JSON.stringify({title:c.title,url:c.url,seconds:c.seconds,result:r.result,observed:r.observed_duration_seconds})+'\n');}catch(e){process.stdout.write('DIAGNOSTIC_UNVERIFIED '+JSON.stringify({title:c.title,url:c.url,seconds:c.seconds,error:e.message.slice(0,900)})+'\n');}}}
finally{await browser.close()}})().catch(e=>{console.error('DIAGNOSTIC_ERROR',e.message);process.exitCode=1});
