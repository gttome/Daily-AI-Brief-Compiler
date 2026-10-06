import {esc,textBlock} from './helpers.mjs';
export function render(spec,p,colors){
  const y0=153,h=49;
  const layers=spec.nodes.map((n,i)=>{
    const y=y0+i*52,c=colors[i];
    return `<g filter="url(#shadow)">
      <rect x="${250+i*12}" y="${y}" width="${700-i*24}" height="${h}" rx="13" fill="#fff" stroke="${c}" stroke-width="2"/>
      <rect x="${270+i*12}" y="${y+12}" width="24" height="24" rx="6" fill="${c}"/>
      <text x="${308+i*12}" y="${y+21}" font-size="14" font-weight="800" fill="${p.ink}">${esc(n.label)}</text>
      ${textBlock(308+i*12,y+37,n.detail,{size:9.2,fill:'#526b80',max:68,lines:1})}
    </g>`;
  }).join('');
  return `<rect x="165" y="125" width="870" height="365" rx="32" fill="url(#panel)" stroke="${p.line}" stroke-width="2"/>
    <rect x="183" y="145" width="46" height="325" rx="22" fill="url(#dark)"/>
    <text x="206" y="310" text-anchor="middle" transform="rotate(-90 206 310)" font-size="12" font-weight="800" fill="#fff">${esc(spec.flow_label)}</text>
    ${layers}`;
}
