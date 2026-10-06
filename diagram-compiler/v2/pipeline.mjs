import {card,esc} from './helpers.mjs';
export function render(spec,p,colors){
  const xs=[55,240,425,610,795,980],ys=[190,285,190,285,190,285],w=165,h=85;
  const nodes=spec.nodes.map((n,i)=>card(p,colors,xs[i],ys[i],w,h,n,i,i===5)).join('');
  const edges=[0,1,2,3,4].map(i=>{
    const x1=xs[i]+w,y1=ys[i]+h/2,x2=xs[i+1],y2=ys[i+1]+h/2;
    return `<path d="M${x1} ${y1} C${x1+35} ${y1},${x2-35} ${y2},${x2} ${y2}" fill="none" stroke="${colors[i]}" stroke-width="4" marker-end="url(#arrow)"/>`;
  }).join('');
  return `<rect x="38" y="135" width="1124" height="335" rx="28" fill="url(#panel)" stroke="${p.line}" stroke-width="2"/>${edges}${nodes}
    <rect x="470" y="420" width="260" height="32" rx="16" fill="${p.navy}"/>
    <text x="600" y="441" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${esc(spec.flow_label)}</text>`;
}
