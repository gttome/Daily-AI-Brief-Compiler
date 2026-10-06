import {card,esc} from './helpers.mjs';
export function render(spec,p,colors){
  const pts=[{x:65,y:175},{x:350,y:175},{x:635,y:175},{x:920,y:175},{x:635,y:330},{x:350,y:330}],w=215,h=90;
  const nodes=pts.map((pt,i)=>`<g>${card(p,colors,pt.x,pt.y,w,h,spec.nodes[i],i,i===5)}
    <circle cx="${pt.x+190}" cy="${pt.y+18}" r="14" fill="${colors[i]}"/>
    <text x="${pt.x+190}" y="${pt.y+23}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${i+1}</text>
  </g>`).join('');
  const connections=[[0,1],[1,2],[2,3],[3,4],[4,5]].map(([a,b],i)=>{
    const A=pts[a],B=pts[b];
    return `<path d="M${A.x+w} ${A.y+h/2} C${A.x+w+45} ${A.y+h/2},${B.x-45} ${B.y+h/2},${B.x} ${B.y+h/2}" fill="none" stroke="${colors[i]}" stroke-width="4" marker-end="url(#arrow)"/>`;
  }).join('');
  const feedback=`<path d="M350 375 C220 450,150 325,172 275" fill="none" stroke="${p.purple}" stroke-width="4" stroke-dasharray="9 7" marker-end="url(#arrow2)"/>`;
  return connections+feedback+nodes+`
    <rect x="465" y="440" width="270" height="32" rx="16" fill="${p.navy}"/>
    <text x="600" y="461" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff">${esc(spec.flow_label)}</text>`;
}
