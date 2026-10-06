import {card,textBlock} from './helpers.mjs';
export function render(spec,p,colors){
  const xs=[55,240,425,610,795,980],ys=[190,285,190,285,190,285],w=165,h=85;
  const nodes=spec.nodes.map((n,i)=>card(p,colors,xs[i],ys[i],w,h,n,i,i===5)).join('');
  const edges=[0,1,2,3,4].map(i=>{
    const x1=xs[i]+w,y1=ys[i]+h/2,x2=xs[i+1],y2=ys[i+1]+h/2;
    return `<path d="M${x1} ${y1} C${x1+35} ${y1},${x2-35} ${y2},${x2} ${y2}" fill="none" stroke="${colors[i]}" stroke-width="4" marker-end="url(#arrow)"/>`;
  }).join('');
  return `<rect x="38" y="135" width="1124" height="335" rx="28" fill="url(#panel)" stroke="${p.line}" stroke-width="2"/>${edges}${nodes}
    <rect x="440" y="412" width="320" height="46" rx="18" fill="${p.navy}"/>
    ${textBlock(600,431,spec.flow_label,{size:10.2,fill:'#fff',weight:800,max:36,lines:2,lineHeight:11,anchor:'middle'})}`;
}
