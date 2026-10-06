import {card,esc,textBlock} from './helpers.mjs';
export function render(spec,p,colors){
  const labels=Array.isArray(spec.group_labels)&&spec.group_labels.length===2?spec.group_labels:['MODEL A','MODEL B'];
  const left=spec.nodes.slice(0,3).map((n,i)=>card(p,colors,95,180+i*92,350,75,n,i,false)).join('');
  const right=spec.nodes.slice(3).map((n,i)=>card(p,colors,755,180+i*92,350,75,n,i+3,true)).join('');
  return `<rect x="60" y="130" width="420" height="355" rx="28" fill="#eef6ff" stroke="${p.blue}" stroke-width="2"/>
    <rect x="720" y="130" width="420" height="355" rx="28" fill="#f1f7f5" stroke="${p.green}" stroke-width="2"/>
    <rect x="170" y="145" width="200" height="30" rx="15" fill="${p.blue}"/>
    <text x="270" y="165" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${esc(labels[0])}</text>
    <rect x="830" y="145" width="200" height="30" rx="15" fill="${p.green}"/>
    <text x="930" y="165" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${esc(labels[1])}</text>
    ${left}${right}
    <path d="M485 305 C550 305,650 305,715 305" fill="none" stroke="${p.orange}" stroke-width="7" marker-end="url(#arrow)"/>
    <rect x="490" y="252" width="220" height="46" rx="18" fill="#fff" stroke="${p.orange}" stroke-width="2"/>
    ${textBlock(600,270,spec.flow_label,{size:9.5,fill:p.orange,weight:800,max:28,lines:2,lineHeight:11,anchor:'middle'})}`;
}
