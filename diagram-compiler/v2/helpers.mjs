import crypto from 'node:crypto';

export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

export function wrap(value,max=28,lines=2){
  const words=String(value??'').trim().split(/\s+/);
  const out=[]; let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(next.length<=max) line=next;
    else {
      if(line) out.push(line);
      line=word;
      if(out.length===lines-1) break;
    }
  }
  if(line&&out.length<lines) out.push(line);
  const consumed=out.join(' ').length;
  if(String(value??'').trim().length>consumed&&out.length){
    out[out.length-1]=out[out.length-1].replace(/[…\.]*$/,'')+'…';
  }
  return out;
}

export function textBlock(x,y,value,opt={}){
  const {size=11,fill='#4d647a',weight=400,max=28,lines=2,lineHeight=13,anchor='start'}=opt;
  const ls=wrap(value,max,lines);
  return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'" text-anchor="'+anchor+'">'+
    ls.map((l,i)=>'<tspan x="'+x+'" dy="'+(i?lineHeight:0)+'">'+esc(l)+'</tspan>').join('')+'</text>';
}

export function palette(spec){
  const p={
    ink:'#12233d',navy:'#16375b',blue:'#1477e6',cyan:'#25b5e9',
    green:'#14a673',orange:'#f18a2b',purple:'#7656d8',red:'#df5e62',
    light:'#f7fbff',line:'#c9d8e7'
  };
  if(spec.palette?.accent1) p.blue=spec.palette.accent1;
  if(spec.palette?.accent2) p.green=spec.palette.accent2;
  if(spec.palette?.accent3) p.purple=spec.palette.accent3;
  return p;
}

export function defs(p){
  return `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef6fb"/></linearGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#edf5fb"/></linearGradient>
  <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#193b5d"/><stop offset="1" stop-color="#0b2037"/></linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#334f6a" flood-opacity=".18"/></filter>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${p.blue}"/></marker>
  <marker id="arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${p.green}"/></marker>
  </defs>`;
}

export function card(p,colors,x,y,w,h,node,i,dark=false){
  const c=colors[i%colors.length];
  const fill=dark?'url(#dark)':'#fff';
  const title=dark?'#fff':p.ink;
  const detail=dark?'#c4d4e2':'#526b80';
  return `<g filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="15" fill="${fill}" stroke="${c}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="10" height="${h}" rx="5" fill="${c}"/>
    <text x="${x+24}" y="${y+27}" font-size="14.5" font-weight="800" fill="${title}">${esc(node.label)}</text>
    ${textBlock(x+24,y+43,node.detail,{size:8.9,fill:detail,max:Math.floor(w/6.7),lines:3,lineHeight:10})}
  </g>`;
}

export function calloutRail(spec,p,colors){
  const xs=[82,420,758];
  return spec.callouts.map((c,i)=>{
    const x=xs[i],col=colors[(i+1)%colors.length];
    return `<g filter="url(#shadow)">
      <rect x="${x}" y="510" width="300" height="74" rx="17" fill="#fff" stroke="${col}" stroke-width="1.7"/>
      <circle cx="${x+25}" cy="535" r="10" fill="${col}"/>
      <path d="M${x+20},535 l4,4 l8,-10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <text x="${x+44}" y="538" font-size="13" font-weight="800" fill="${p.ink}">${esc(c.label)}</text>
      ${textBlock(x+20,557,c.detail,{size:9.3,fill:'#526b80',max:42,lines:2,lineHeight:11})}
    </g>`;
  }).join('');
}

export function validateSpec(spec){
  const fail=m=>{throw new Error(m);};
  const req=(name,v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max) fail(name+' invalid');};
  if(spec.schema_version!=='daily-compiler-diagram-spec-v2') fail('schema_version mismatch');
  if(!['pipeline','layered_system','control_loop','hub_spoke','comparison','state_machine'].includes(spec.grammar)) fail('grammar invalid');
  req('story_id',spec.story_id,80);req('title',spec.title,60);req('subtitle',spec.subtitle,110);req('flow_label',spec.flow_label,44);req('footer',spec.footer,90);
  if(!Array.isArray(spec.nodes)||spec.nodes.length!==6) fail('exactly six nodes required');
  if(!Array.isArray(spec.callouts)||spec.callouts.length!==3) fail('exactly three callouts required');
  spec.nodes.forEach((n,i)=>{req('node '+i+' id',n.id,24);req('node '+i+' label',n.label,28);req('node '+i+' detail',n.detail,64);});
  spec.callouts.forEach((n,i)=>{req('callout '+i+' label',n.label,26);req('callout '+i+' detail',n.detail,68);});
}

export const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
export const gitBlobSha=data=>{
  const b=Buffer.isBuffer(data)?data:Buffer.from(data);
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
};
