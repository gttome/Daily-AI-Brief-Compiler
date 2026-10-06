import {card,textBlock} from './helpers.mjs';
export function render(spec,p,colors){
  const cx=600,cy=300,rx=360,ry=145,w=175,h=74;
  const pts=spec.nodes.map((_,i)=>{
    const a=(-Math.PI/2)+(i*Math.PI*2/6);
    return {x:cx+rx*Math.cos(a)-w/2,y:cy+ry*Math.sin(a)-h/2};
  });
  const edges=pts.map((pt,i)=>{
    const next=pts[(i+1)%pts.length];
    return `<path d="M${pt.x+w/2} ${pt.y+h/2} Q${cx} ${cy} ${next.x+w/2} ${next.y+h/2}" fill="none" stroke="${colors[i]}" stroke-width="3.2" opacity=".78" marker-end="url(#arrow)"/>`;
  }).join('');
  const nodes=pts.map((pt,i)=>card(p,colors,pt.x,pt.y,w,h,spec.nodes[i],i,i===3)).join('');
  return `${edges}
    <circle cx="${cx}" cy="${cy}" r="92" fill="url(#dark)" stroke="${p.green}" stroke-width="3" filter="url(#shadow)"/>
    <text x="${cx}" y="${cy-8}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">FEEDBACK</text>
    ${textBlock(cx,cy+12,spec.flow_label,{size:9.2,fill:'#c4d4e2',weight:700,max:22,lines:3,lineHeight:11,anchor:'middle'})}
    ${nodes}`;
}
