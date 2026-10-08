import fs from 'node:fs';
import path from 'node:path';
import {safeCorrectionAssetPath} from './correction-apply.mjs';

export function readCorrectionAsset(root,relative){
  if(!safeCorrectionAssetPath(relative)) throw new Error('unsafe_asset_path');
  const base=fs.realpathSync(root),full=fs.realpathSync(path.resolve(base,relative)),rel=path.relative(base,full);
  if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||!fs.statSync(full).isFile()) throw new Error('asset_outside_root');
  return fs.readFileSync(full);
}

// One directory rename publishes a complete staged revision. Existing output is
// immutable; a byte-identical transport retry is a no-op, never a partial rewrite.
export function writeCorrectionDirectory({outDir,files,protectedPaths=[]}){
  const output=path.resolve(outDir),names=Object.keys(files);
  if(!names.length||names.some(name=>!safeCorrectionAssetPath(name))) throw new Error('correction_output_names');
  const encoded=Object.fromEntries(names.map(name=>[name,Buffer.isBuffer(files[name])?files[name]:Buffer.from(files[name])]));
  for(const input of protectedPaths){
    const original=fs.realpathSync(input);
    if(names.some(name=>path.resolve(output,name)===original)) throw new Error('correction_original_overwrite_forbidden');
  }
  if(fs.existsSync(output)){
    if(fs.lstatSync(output).isSymbolicLink()||!fs.statSync(output).isDirectory()) throw new Error('correction_output_conflict');
    const existing=[];
    const walk=(directory,prefix='')=>{
      for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
        const relative=prefix+entry.name;
        if(entry.isSymbolicLink()) throw new Error('correction_output_conflict');
        if(entry.isDirectory()) walk(path.join(directory,entry.name),relative+'/');
        else if(entry.isFile()) existing.push(relative);
        else throw new Error('correction_output_conflict');
      }
    };
    walk(output);existing.sort();
    if(existing.length!==names.length||existing.some((name,i)=>name!==[...names].sort()[i])) throw new Error('correction_output_conflict');
    for(const name of names){
      const file=path.join(output,name);
      if(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile()||!fs.readFileSync(file).equals(encoded[name])) throw new Error('correction_output_conflict');
    }
    return 'UNCHANGED';
  }
  const parent=path.dirname(output);
  // The caller chooses an existing staging parent; no original run path is made
  // into a revision directory as a side effect of validation.
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()) throw new Error('correction_output_parent_required');
  const staged=fs.mkdtempSync(path.join(parent,'.correction-stage-'));
  try{
    for(const name of names){
      const destination=path.join(staged,name);fs.mkdirSync(path.dirname(destination),{recursive:true});
      fs.writeFileSync(destination,encoded[name],{flag:'wx'});
    }
    if(fs.existsSync(output)) throw new Error('correction_output_conflict');
    fs.renameSync(staged,output);
  }finally{
    if(fs.existsSync(staged)) fs.rmSync(staged,{recursive:true});
  }
  return 'STAGED';
}
