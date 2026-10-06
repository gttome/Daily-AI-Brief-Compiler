import {card,esc,textBlock} from './helpers.mjs';
export function render(spec,p,colors){
  const cx=600,cy=292,w=185,h=76;
  const pts=[{x:507,y:235},{x:105,y:175},{x:110,y:330},{x:910,y:175},{x:905,y:330},{x:505,y:405}];
  const lines=pts.slice(1).map((pt,i)=>`<path d="M${cx} ${cy} C${cx+(pt.x<cx?-120:120)} ${cy},${pt.x+w/2} ${pt.y+h/2},${pt.x+w/2} ${pt.y+h/2}" fill="none" stroke="${colors[i+1]}" stroke-width="4" opacity=".72"/>`).join('');
  const hub=`<g filter="url(#shadow)">
    <rect x="470" y="218" width="260" height="150" rx="28" fill="url(#dark)" stroke="${p.blue}" stroke-width="3"/>
    <text x="600" y="263" text-anchor="middle" font-size="19" font-weight="800" fill="#fff">${esc(spec.nodes[0].label)}</text>
    ${textBlock(600,290,spec.nodes[0].detail,{size:11,fill:'#c8d9e7',max:34,lines:3,lineHeight:14,anchor:'middle'})}
    <rect x="520" y="328" width="160" height="26" rx="13" fill="${p.green}"/>
    <text x="600" y="346" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${esc(spec.flow_label)}</text>
  </g>`;
  const spokes=pts.slice(1).map((pt,i)=>card(p,colors,pt.x,pt.y,w,h,spec.nodes[i+1],i+1,false)).join('');
  return lines+hub+spokes;
}
