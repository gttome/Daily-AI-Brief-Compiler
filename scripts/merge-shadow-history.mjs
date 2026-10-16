import fs from 'node:fs';
import path from 'node:path';

const historyDir=process.argv[2];
const currentDir=process.argv[3];
const outDir=process.argv[4];
const currentDate=process.argv[5];
const receiptPath=process.argv[6]||null;
if(!currentDir||!outDir||!currentDate)throw new Error('usage: node scripts/merge-shadow-history.mjs <history-site-or-dash> <current-site> <out-site> <current-date> [receipt]');

const copyDir=(src,dst)=>{
  if(!src||src==='-'||!fs.existsSync(src))return;
  fs.mkdirSync(dst,{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:true});
};
const dateDirs=(root,category)=>{
  const dir=path.join(root,category);
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e=>e.name);
};

fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
copyDir(currentDir,outDir);

const preserved=new Set();
if(historyDir&&historyDir!=='-'&&fs.existsSync(historyDir)){
  for(const category of ['briefs','stories','videos','podcasts']){
    for(const date of dateDirs(historyDir,category)){
      if(date>=currentDate)continue;
      const source=path.join(historyDir,category,date);
      const dest=path.join(outDir,category,date);
      // The previously *published* history is authoritative, even when the
      // vendored reader snapshot contains an older copy of the same date.
      if(fs.existsSync(dest))fs.rmSync(dest,{recursive:true,force:true});
      copyDir(source,dest);
      preserved.add(date);
    }
  }
  for(const date of preserved){
    const imageSource=path.join(historyDir,'briefs','images',date);
    const imageDest=path.join(outDir,'briefs','images',date);
    if(fs.existsSync(imageSource)){
      if(fs.existsSync(imageDest))fs.rmSync(imageDest,{recursive:true,force:true});
      copyDir(imageSource,imageDest);
    }
  }
  // Keep prior release receipts public throughout the next edition's first
  // (placeholder) deploy; current edition's new image job is created later.
  const oldJobs=path.join(historyDir,'image-jobs');
  if(fs.existsSync(oldJobs)){
    const newJobs=path.join(outDir,'image-jobs');
    if(fs.existsSync(newJobs))fs.rmSync(newJobs,{recursive:true,force:true});
    copyDir(oldJobs,newJobs);
  }
}

const receipt={
  schema_version:'daily-compiler-history-merge-v2',
  result:'PASS',
  current_date:currentDate,
  preserved_prior_editions:[...preserved].sort(),
  permanent_history:true,
  canonical_current_reader_preserved:true,
  archive_and_feeds_rewritten:false
};
if(receiptPath){
  fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
}
console.log(JSON.stringify(receipt));
