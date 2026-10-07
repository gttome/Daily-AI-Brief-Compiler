import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function buildAtlas(paths,outPath){
  if(!Array.isArray(paths)||paths.length!==6) throw new Error('six_benchmark_assets_required');
  const cellW=384,cellH=202,gap=12,pad=12;
  const width=pad*2+cellW*3+gap*2,height=pad*2+cellH*2+gap;
  const composites=[];
  for(let i=0;i<paths.length;i++){
    const buf=await sharp(paths[i]).resize(cellW,cellH,{fit:'contain',background:'#ffffff'}).png({compressionLevel:9,adaptiveFiltering:false,palette:false}).toBuffer();
    composites.push({input:buf,left:pad+(i%3)*(cellW+gap),top:pad+Math.floor(i/3)*(cellH+gap)});
  }
  const out=await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(composites).png({compressionLevel:9,adaptiveFiltering:false,palette:false}).toBuffer();
  fs.mkdirSync(path.dirname(outPath),{recursive:true}); fs.writeFileSync(outPath,out); return {outPath,width,height,bytes:out.length};
}
export async function buildAtlases(root='vendor/image-benchmark'){
  const sets=[
    ['sep09','atlas-sep09.png'],
    ['sep10','atlas-sep10-premium3.png']
  ];
  const results=[];
  for(const [dir,name] of sets){
    const folder=path.join(root,dir);
    const assets=fs.readdirSync(folder).filter(x=>x.endsWith('.png')).sort().map(x=>path.join(folder,x));
    results.push(await buildAtlas(assets,path.join(root,name)));
  }
  return results;
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
  console.log(JSON.stringify(await buildAtlases(process.argv[2]||'vendor/image-benchmark'),null,2));
}
