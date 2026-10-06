import {card,esc} from './helpers.mjs';
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
    <rect x="505" y="260" width="190" height="31" rx="15" fill="#fff" stroke="${p.orange}" stroke-width="2"/>
    <text x="600" y="281" text-anchor="middle" font-size="11" font-weight="800" fill="${p.orange}">${esc(spec.flow_label)}</text>`;
}
