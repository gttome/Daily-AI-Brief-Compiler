import {esc,textBlock} from './helpers.mjs';

const rr=(x,y,w,h,fill,stroke,sw=1.7,rx=16,shadow=true)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${shadow?' filter="url(#shadow)"':''}/>`;
const chip=(x,y,w,label,fill)=>`<g><rect x="${x}" y="${y}" width="${w}" height="28" rx="14" fill="${fill}"/><text x="${x+w/2}" y="${y+19}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${esc(label)}</text></g>`;
const card=(node,x,y,w,h,c,{dark=false,titleSize=14,detailSize=9.2}={})=>{
  const fill=dark?'url(#dark)':'#fff', title=dark?'#fff':'#12233d', detail=dark?'#c8d7e4':'#526b80';
  return `<g>${rr(x,y,w,h,fill,c,2,15,true)}<rect x="${x}" y="${y}" width="9" height="${h}" rx="5" fill="${c}"/>
  <text x="${x+22}" y="${y+26}" font-size="${titleSize}" font-weight="800" fill="${title}">${esc(node.label)}</text>
  ${textBlock(x+22,y+43,node.detail,{size:detailSize,fill:detail,max:Math.floor(w/6.5),lines:3,lineHeight:10.5})}</g>`;
};
const hArrow=(x1,y,x2,c)=>`<g><line x1="${x1}" y1="${y}" x2="${x2-12}" y2="${y}" stroke="${c}" stroke-width="3" stroke-linecap="round"/><polygon points="${x2-12},${y-7} ${x2},${y} ${x2-12},${y+7}" fill="${c}"/></g>`;
const vArrow=(x,y1,y2,c)=>`<g><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2-12}" stroke="${c}" stroke-width="3" stroke-linecap="round"/><polygon points="${x-7},${y2-12} ${x},${y2} ${x+7},${y2-12}" fill="${c}"/></g>`;

function dots(spec,p,c){
 const n=spec.nodes;
 return `
 ${rr(44,112,1112,365,'#f3f8fc','#c6d7e6',1.5,26,false)}
 ${chip(64,126,160,'DELEGATED INPUTS',p.navy)}
 ${chip(830,126,220,'ACTION + CONTROL',p.navy)}
 ${rr(64,159,205,28,'#fff',p.orange,1.6,10,true)}
 <circle cx="82" cy="173" r="6" fill="${p.orange}"/><text x="96" y="177" font-size="10.5" font-weight="800" fill="${p.ink}">Events + triggers</text>
 ${card(n[0],64,203,205,72,c[0])}
 ${card(n[1],64,292,205,72,c[1])}
 ${card(n[2],64,381,205,72,c[2])}
 ${rr(330,139,420,318,'#edf5fb','#afc4d8',1.6,24,false)}
 ${chip(354,151,170,'PERSISTENT CORE',p.navy)}
 ${card({label:'Task state',detail:'Done, pending, blocked, and next action stay durable'},360,199,196,68,c[1],{dark:true,titleSize:13.5,detailSize:8.7})}
 ${card({label:'Memory + context',detail:'Prior decisions, preferences, and working facts carry forward'},360,284,196,68,c[2],{titleSize:13.5,detailSize:8.7})}
 ${card({label:'Audit trail',detail:'Actions and evidence remain inspectable across resumptions'},360,369,196,68,c[4],{titleSize:13.5,detailSize:8.7})}
 ${rr(592,196,136,205,'url(#dark)',p.green,3,68,true)}
 <text x="660" y="232" text-anchor="middle" font-size="10.5" font-weight="800" fill="#8fe0cf">PERSISTENT</text>
 <text x="660" y="270" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">ASSISTANT</text>
 <text x="660" y="306" text-anchor="middle" font-size="10.5" fill="#d7e4ef"><tspan x="660">observe</tspan><tspan x="660" dy="16">plan</tspan><tspan x="660" dy="16">act</tspan></text>
 <rect x="612" y="366" width="96" height="24" rx="12" fill="${p.green}"/><text x="660" y="382" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">RESUME</text>
 ${hArrow(556,232,592,c[1])}${hArrow(556,318,592,c[2])}
 <path d="M592 358 C575 382 570 397 556 405" fill="none" stroke="${c[4]}" stroke-width="3"/>
 ${card(n[3],803,169,317,72,c[3])}
 ${card(n[4],803,263,317,78,c[5],{dark:true})}
 ${card(n[5],803,363,317,72,c[1])}
 ${hArrow(728,232,803,c[3])}${hArrow(728,302,803,c[5])}
 <path d="M803 399 C770 399 750 399 728 399" fill="none" stroke="${c[1]}" stroke-width="3"/><polygon points="740,392 728,399 740,406" fill="${c[1]}"/>
 <path d="M269 173 H307 V190 H330" fill="none" stroke="${p.orange}" stroke-width="2.6"/><polygon points="318,183 330,190 318,197" fill="${p.orange}"/>
 <path d="M269 239 H305 V215 H330" fill="none" stroke="${c[0]}" stroke-width="3"/><polygon points="318,208 330,215 318,222" fill="${c[0]}"/>
 <path d="M269 328 H303 V260 H330" fill="none" stroke="${c[1]}" stroke-width="3"/><polygon points="318,253 330,260 318,267" fill="${c[1]}"/>
 <path d="M269 417 H304 V350 H330" fill="none" stroke="${c[2]}" stroke-width="3"/><polygon points="318,343 330,350 318,357" fill="${c[2]}"/>
 `;
}

function sage(spec,p,c){
 const n=spec.nodes;
 return `
 ${rr(46,113,1108,358,'#f5f8fc','#c7d6e5',1.5,24,false)}
 ${chip(70,130,170,'GENERAL AGENT',p.blue)}
 ${chip(70,306,170,'SKILL LAYER',p.purple)}
 ${card({label:'Coding agent',detail:'General reasoning interprets the task and coordinates tools'},70,176,168,82,c[0])}
 ${hArrow(238,217,300,p.blue)}
 ${card(n[1],300,176,185,82,c[1])}
 ${hArrow(485,217,545,p.blue)}
 ${card({label:'Option set',detail:'Candidate endpoint shapes and instance configurations'},545,176,185,82,c[3])}
 ${hArrow(730,217,790,p.blue)}
 ${card(n[4],790,176,290,82,c[4])}
 ${card(n[0],70,350,168,82,c[2],{dark:true})}
 <path d="M154 350 V258" fill="none" stroke="${p.purple}" stroke-width="3"/><polygon points="147,270 154,258 161,270" fill="${p.purple}"/>
 ${rr(300,346,255,90,'#fff',p.purple,2,14,true)}
 <text x="322" y="368" font-size="13.5" font-weight="800" fill="${p.ink}">${esc(n[2].label)}</text>
 ${textBlock(322,388,n[2].detail,{size:8.6,fill:'#526b80',max:33,lines:2,lineHeight:10})}
 <line x1="322" y1="409" x2="535" y2="409" stroke="#dbe4ed"/><line x1="375" y1="399" x2="375" y2="429" stroke="#dbe4ed"/><line x1="430" y1="399" x2="430" y2="429" stroke="#dbe4ed"/><line x1="485" y1="399" x2="485" y2="429" stroke="#dbe4ed"/>
 <text x="330" y="422" font-size="8" fill="#60758a">cfg A</text><text x="389" y="422" font-size="8" fill="#60758a">42 ms</text><text x="444" y="422" font-size="8" fill="#60758a">188 t/s</text><text x="497" y="422" font-size="8" fill="#60758a">$1.0</text>
 ${hArrow(555,392,610,p.purple)}
 ${card(n[3],610,346,175,90,c[3],{titleSize:13,detailSize:8.6})}
 ${card(n[5],835,346,245,90,c[5],{dark:true,titleSize:13.5,detailSize:8.6})}
 <path d="M700 346 V306 H920 V258" fill="none" stroke="${p.cyan}" stroke-width="2.8"/><polygon points="913,270 920,258 927,270" fill="${p.cyan}"/>
 <path d="M392 258 V346" fill="none" stroke="${p.purple}" stroke-width="2.5"/><polygon points="385,334 392,346 399,334" fill="${p.purple}"/>
 <path d="M650 258 V346" fill="none" stroke="${p.purple}" stroke-width="2.5"/><polygon points="643,334 650,346 657,334" fill="${p.purple}"/>
 <path d="M1000 258 V325 H955 V346" fill="none" stroke="${p.cyan}" stroke-width="2.8"/><polygon points="948,334 955,346 962,334" fill="${p.cyan}"/>
 `;
}

function ironclad(spec,p,c){
 const n=spec.nodes;
 const xs=[55,260,465,670,875];
 const nodes=[n[0],n[1],n[2],n[4],n[5]];
 return `
 <rect x="52" y="112" width="1096" height="52" rx="16" fill="${p.navy}"/>
 <text x="78" y="142" font-size="10.5" font-weight="800" fill="#a9d1ff">BUSINESS RULE SPINE</text>
 <text x="220" y="142" font-size="10.5" font-weight="600" fill="#fff">parties • clauses • thresholds • approvers • required evidence • acceptance criteria</text>
 ${nodes.map((node,i)=>card(node,xs[i],205,170,82,c[i],{titleSize:13.2,detailSize:8.7})).join('')}
 ${hArrow(225,246,260,c[1])}${hArrow(430,246,465,c[2])}${hArrow(635,246,670,c[3])}${hArrow(840,246,875,c[4])}
 ${[140,345,550,755,960].map(x=>`<line x1="${x}" y1="164" x2="${x}" y2="205" stroke="#7e93a8" stroke-width="2"/><circle cx="${x}" cy="181" r="4" fill="${p.navy}"/>`).join('')}
 ${chip(660,320,180,'EXCEPTION PATH',p.orange)}
 <path d="M755 287 V320" fill="none" stroke="${p.orange}" stroke-width="3"/><polygon points="748,308 755,320 762,308" fill="${p.orange}"/>
 ${card(n[3],575,370,175,80,c[3],{titleSize:13,detailSize:8.5})}
 ${card({label:'Corrective action',detail:'Human or agent revises one bounded state, then re-enters the flow'},790,370,175,80,c[5],{titleSize:13,detailSize:8.5})}
 ${hArrow(750,410,790,c[5])}
 <path d="M875 450 V480 H550 V287" fill="none" stroke="${p.purple}" stroke-width="3"/>
 <polygon points="543,299 550,287 557,299" fill="${p.purple}"/>
 <path d="M960 287 V320 H1040" fill="none" stroke="${p.green}" stroke-width="2.6"/>
 <line x1="1040" y1="320" x2="1040" y2="323" stroke="${p.green}" stroke-width="2.6"/><polygon points="1033,323 1040,335 1047,323" fill="${p.green}"/>
 ${rr(995,335,145,135,'#f1f5fa','#b8c8d8',1.2,14,false)}
 <text x="1015" y="357" font-size="10" font-weight="800" fill="${p.navy}">FINAL GATE</text>
 ${['Rules preserved','Approvals complete','Exceptions closed'].map((t,i)=>`<circle cx="1022" cy="${386+i*28}" r="5" fill="${p.green}"/><text x="1036" y="${389+i*28}" font-size="8.8" font-weight="600" fill="${p.ink}">${t}</text>`).join('')}
 `;
}

function atlassian(spec,p,c){
 const n=spec.nodes;
 return `
 ${chip(58,100,190,'GOVERNANCE BOUNDARY',p.navy)}
 ${chip(936,100,200,'EVIDENCE / AUDIT TRAIL',p.navy)}
 ${rr(55,135,1090,340,'#f3f7fb','#c4d2e1',1.5,25,false)}
 ${n.map((node,i)=>{
   const x=90+i*20,y=154+i*51,w=1020-i*40,col=c[i%6];
   return `${rr(x,y,w,43,'#fff',col,2,13,true)}<circle cx="${x+28}" cy="${y+21.5}" r="13" fill="${col}"/><text x="${x+28}" y="${y+25}" text-anchor="middle" font-size="9" font-weight="800" fill="#fff">${i+1}</text><text x="${x+55}" y="${y+19}" font-size="12.8" font-weight="800" fill="${p.ink}">${esc(node.label)}</text>${textBlock(x+55,y+34,node.detail,{size:8.7,fill:'#526b80',max:94-i*4,lines:1})}`;
 }).join('')}
 <line x1="1118" y1="160" x2="1118" y2="446" stroke="#70869c" stroke-width="3"/>
 ${[175,226,277,328,379,430].map(y=>`<line x1="1098" y1="${y}" x2="1118" y2="${y}" stroke="#70869c" stroke-width="2"/><circle cx="1118" cy="${y}" r="4" fill="#70869c"/>`).join('')}
 ${[197,248,299,350,401].map(y=>vArrow(600,y,y+9,p.navy)).join('')}
 `;
}

function embedding(spec,p,c){
 const n=spec.nodes;
 return `
 ${rr(44,120,521,360,'#f5f8fc','#9bb8da',1.5,24,false)}
 ${rr(635,120,521,360,'#f2fbf8','#8fd1ba',1.5,24,false)}
 ${chip(67,138,180,'CLOUD-CENTRIC',p.blue)}
 ${chip(658,138,205,'ON-DEVICE MULTIMODAL',p.green)}
 ${card({label:'Local data',detail:'Text, images, audio, and video begin on the device'},75,195,142,72,c[0],{titleSize:12.8,detailSize:8.3})}
 ${hArrow(217,231,250,p.blue)}
 ${card({label:'Network',detail:'Upload plus round-trip latency'},250,195,135,72,c[3],{titleSize:12.8,detailSize:8.3})}
 ${hArrow(385,231,408,p.blue)}
 ${card({label:'Cloud embedding',detail:'Remote model creates semantic representation'},408,195,127,72,c[2],{titleSize:10.4,detailSize:8.0})}
 ${vArrow(478,267,305,p.blue)}
 ${card(n[0],350,310,185,75,c[4],{titleSize:12.5,detailSize:8.3})}
 <path d="M350 348 H305" fill="none" stroke="${p.blue}" stroke-width="3"/><polygon points="317,341 305,348 317,355" fill="${p.blue}"/>
 ${card({label:'Return result',detail:'Response travels back across the network to the device'},80,310,225,75,c[1],{titleSize:12.5,detailSize:8.3})}
 ${chip(110,420,390,'network + remote inference + hosted search',p.navy)}
 <text x="675" y="198" font-size="9.5" font-weight="800" fill="${p.green}">INPUTS</text>
 ${['TXT','IMG','AUD','VID'].map((t,i)=>`<rect x="${675+i*80}" y="215" width="62" height="34" rx="9" fill="#fff" stroke="${c[i]}" stroke-width="1.5"/><text x="${706+i*80}" y="237" text-anchor="middle" font-size="9" font-weight="800" fill="${c[i]}">${t}</text>`).join('')}
 ${card(n[2],675,280,150,88,c[1],{dark:true,titleSize:12.5,detailSize:8.2})}
 ${vArrow(750,249,280,p.green)}
 ${hArrow(825,324,865,p.green)}
 ${card(n[3],865,280,250,68,c[2],{titleSize:12.5,detailSize:8.3})}
 ${vArrow(990,348,388,p.green)}
 ${card(n[4],865,388,250,68,c[4],{titleSize:12.5,detailSize:8.3})}
 ${card(n[5],675,388,150,68,c[5],{titleSize:12.2,detailSize:7.8})}
 ${chip(535,212,130,'REMOVES',p.orange)}
 ${hArrow(565,260,635,p.orange)}
 <text x="600" y="286" text-anchor="middle" font-size="10" font-weight="800" fill="${p.orange}">round trip</text>
 `;
}

function astra(spec,p,c){
 const n=spec.nodes;
 const pts=[[585,135],[770,205],[805,365],[585,455],[365,365],[400,205]];
 const cardSvg=pts.map((pt,i)=>card(n[i],pt[0]-83,pt[1]-37,166,74,c[i],{titleSize:12.8,detailSize:8.2})).join('');
 const arrows=pts.map((pt,i)=>{
   const nx=pts[(i+1)%pts.length];
   const x1=pt[0],y1=pt[1],x2=nx[0],y2=nx[1];
   return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.navy}" stroke-width="3" stroke-linecap="round"/>`;
 }).join('');
 return `
 ${rr(48,145,197,297,'#fff','#c5d1de',1.5,20,false)}
 ${chip(70,165,152,'INFRASTRUCTURE',p.navy)}
 <text x="70" y="232" font-size="13" font-weight="800" fill="${p.ink}">Blackwell + inference</text><text x="70" y="249" font-size="13" font-weight="800" fill="${p.ink}">optimization</text>
 <rect x="72" y="292" width="135" height="13" rx="6" fill="${p.red}"/><rect x="72" y="324" width="105" height="13" rx="6" fill="${p.orange}"/><rect x="72" y="356" width="75" height="13" rx="6" fill="${p.green}"/>
 ${textBlock(70,397,'NVIDIA reports up to 8x faster token generation vs Astra Standard.',{size:9,fill:'#5b7186',max:23,lines:4,lineHeight:11})}
 ${arrows}${cardSvg}
 ${rr(485,235,200,130,'url(#dark)',p.green,3,65,true)}
 <text x="585" y="270" text-anchor="middle" font-size="10" font-weight="800" fill="#8fe0cf">LOWER</text><text x="585" y="302" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">MODEL LATENCY</text><text x="585" y="330" text-anchor="middle" font-size="9.5" fill="#d7e4ef">repeats at every model turn</text>
 ${hArrow(245,295,330,p.green)}
 ${rr(925,145,227,297,'#fff','#c5d1de',1.5,20,false)}
 ${chip(950,165,178,'WORKFLOW EFFECT',p.navy)}
 <text x="950" y="232" font-size="12" font-weight="800" fill="${p.ink}">Every loop pays:</text>
 ${[['model delay',c[0]],['tool delay',c[2]],['check delay',c[3]]].map((a,i)=>`<rect x="950" y="${260+i*42}" width="175" height="28" rx="8" fill="#fff" stroke="${a[1]}"/><text x="963" y="${278+i*42}" font-size="9" font-weight="700" fill="${a[1]}">${a[0]}</text>`).join('')}
 ${textBlock(950,399,'Total wall time = sum of repeated passes',{size:9.2,fill:'#5b7186',max:25,lines:2,lineHeight:11})}
 `;
}

export function render(spec,p,colors){
 switch(spec.story_id){
  case 'dots-always-on-agents': return dots(spec,p,colors);
  case 'sagemaker-agent-skill': return sage(spec,p,colors);
  case 'ironclad-computer-use': return ironclad(spec,p,colors);
  case 'atlassian-openai-enterprise-context': return atlassian(spec,p,colors);
  case 'embeddinggemma2-edge-retrieval': return embedding(spec,p,colors);
  case 'astra-ultrafast-blackwell': return astra(spec,p,colors);
  default: throw new Error('oct7 textbook profile unsupported story '+spec.story_id);
 }
}
