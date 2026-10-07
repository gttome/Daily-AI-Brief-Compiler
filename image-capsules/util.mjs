import crypto from 'node:crypto';

export const sha256=data=>crypto.createHash('sha256').update(Buffer.isBuffer(data)?data:Buffer.from(String(data))).digest('hex');
export const gitBlobSha=bytes=>{
  const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
};
export function stableStringify(value){
  if(value===null||typeof value!=='object') return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(stableStringify).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
}
export const canonicalSha=value=>sha256(stableStringify(value));
export const nonempty=v=>typeof v==='string'&&v.trim()===v&&v.length>0;
export const hex=(v,n)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
