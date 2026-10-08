import {inflateSync} from 'node:zlib';

const need=(ok,label)=>{if(!ok)throw new Error('canonical_png_'+label);};
const crcTable=Uint32Array.from({length:256},(_,index)=>{
  let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;
});
const crc=bytes=>{let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;};

// A digest authenticates bytes, not a decodable file. Check the complete PNG
// container and decompressed scanlines before accepting a canonical asset.
// This performs no resize, pixel alteration, visual review or native generation.
export function validateCanonicalPng(input){
  const bytes=Buffer.isBuffer(input)?input:Buffer.from(input);
  need(bytes.length>=45&&bytes.length<=64*1024*1024&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a','signature_or_size');
  const idat=[];let offset=8,header=null,palette=false,ended=false,dataEnded=false;
  while(offset<bytes.length){
    need(offset+12<=bytes.length,'truncated_chunk');
    const length=bytes.readUInt32BE(offset),end=offset+length+12;
    need(end<=bytes.length,'truncated_chunk');
    const type=bytes.subarray(offset+4,offset+8).toString('ascii'),data=bytes.subarray(offset+8,end-4);
    need(/^[A-Za-z]{4}$/.test(type)&&/[A-Z]/.test(type[2]),'chunk_type');
    need(crc(bytes.subarray(offset+4,end-4))===bytes.readUInt32BE(end-4),'crc');
    if(!header){need(type==='IHDR'&&length===13,'header');header=data;}
    else if(type==='IHDR')need(false,'duplicate_header');
    else if(type==='PLTE'){need(!palette&&!idat.length&&length>0&&length<=768&&length%3===0,'palette');palette=true;}
    else if(type==='IDAT'){need(!dataEnded,'data_order');idat.push(data);}
    else if(type==='IEND'){need(length===0&&idat.length>0&&end===bytes.length,'end');ended=true;}
    else {need(type[0]===type[0].toLowerCase(),'unknown_critical_chunk');if(idat.length)dataEnded=true;}
    offset=end;
  }
  need(ended,'missing_end');
  const width=header.readUInt32BE(0),height=header.readUInt32BE(4),depth=header[8],color=header[9],interlace=header[12];
  need(width===1200&&height===630,'dimensions');
  const depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]},channels={0:1,2:3,3:1,4:2,6:4};
  need(depths[color]?.includes(depth)&&header[10]===0&&header[11]===0&&[0,1].includes(interlace),'encoding');
  need(color!==3||palette,'missing_palette');
  need(![0,4].includes(color)||!palette,'unexpected_palette');
  const passes=interlace?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
  const rows=passes.map(([x,y,dx,dy])=>({width:Math.ceil(Math.max(0,width-x)/dx),height:Math.ceil(Math.max(0,height-y)/dy)})).filter(pass=>pass.width&&pass.height).map(pass=>({...pass,stride:Math.ceil(pass.width*depth*channels[color]/8)+1}));
  const size=rows.reduce((total,pass)=>total+pass.stride*pass.height,0);
  let raw;try{raw=inflateSync(Buffer.concat(idat),{maxOutputLength:size+1});}catch{need(false,'invalid_compressed_data');}
  need(raw.length===size,'scanline_length');
  let position=0;for(const pass of rows)for(let y=0;y<pass.height;y++){need(raw[position]<=4,'scanline_filter');position+=pass.stride;}
  return {width,height};
}
