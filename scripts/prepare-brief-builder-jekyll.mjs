#!/usr/bin/env node
// Build only the new public page using the site's existing Jekyll layout.
// Safe for both PR rehearsal and the existing protected Pages release job.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BRIEF_BUILDER_MD,addBuilderToJekyllLayout,assertBuilderMarkdown} from '../compiler/brief-builder-pages.mjs';
import {BUILDER_CSS_PATH,styleBuilderJekyllLayout} from '../compiler/brief-builder-style.mjs';

export function prepareBuilderJekyllSource({outRoot}){
  if(!outRoot||fs.existsSync(outRoot))throw Error('jekyll_preview_output_must_be_new');
  const source=fs.readFileSync(BRIEF_BUILDER_MD,'utf8');
  const valid=assertBuilderMarkdown(source);
  const template='vendor/production-reader/snapshot/';
  const layout=fs.readFileSync(template+'_layouts/default.html','utf8');
  const config=fs.readFileSync(template+'_config.yml','utf8');
  fs.mkdirSync(path.join(outRoot,'_layouts'),{recursive:true});
  // Same site shell. Add the new link in both top navigation and footer.
  fs.writeFileSync(path.join(outRoot,'_layouts/default.html'),
    styleBuilderJekyllLayout(addBuilderToJekyllLayout(layout),
      fs.readFileSync(BUILDER_CSS_PATH,'utf8')),'utf8');
  // Absolute public routes remain on the established repository GitHub Pages base.
  fs.writeFileSync(path.join(outRoot,'_config.yml'),
    config+'\nurl: "https://gttome.github.io"\nbaseurl: "/Daily-AI-Brief-Compiler"\n','utf8');
  fs.writeFileSync(path.join(outRoot,'build-your-own-brief-compiler.md'),source,'utf8');
  return {result:'PASS',scenarios:valid.scenarios,source_length:source.length,
    source_root:outRoot};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const outRoot=process.argv[2];
  if(!outRoot)throw Error('usage: node scripts/prepare-brief-builder-jekyll.mjs <new-out-dir>');
  const r=prepareBuilderJekyllSource({outRoot});
  console.log('BRIEF_BUILDER_JEKYLL_SOURCE_READY',r.scenarios,r.source_length);
}
