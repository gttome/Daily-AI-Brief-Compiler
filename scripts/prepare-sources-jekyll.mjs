#!/usr/bin/env node
// Isolated Jekyll proof of Sources markup, standalone styles, and source filters.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderSourcesMarkdown} from '../compiler/source-transparency.mjs';
import {
 SOURCE_CSS,SOURCE_JS,PUBLIC_CSS,PUBLIC_JS,
 appendSourcesAssetsToJekyllLayout,validateSourceAssets
} from '../compiler/sources-page-assets.mjs';

export function prepareSourcesJekyll({outRoot}){
 if(!outRoot||fs.existsSync(outRoot))throw Error('source_preview_output_must_be_new');
 const root='vendor/production-reader/snapshot/';
 const layout=fs.readFileSync(root+'_layouts/default.html','utf8');
 const config=fs.readFileSync(root+'_config.yml','utf8');
 const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 const css=fs.readFileSync(SOURCE_CSS),js=fs.readFileSync(SOURCE_JS);
 validateSourceAssets(css.toString('utf8'),js.toString('utf8'));
 fs.mkdirSync(path.join(outRoot,'_layouts'),{recursive:true});
 fs.writeFileSync(path.join(outRoot,'_layouts/default.html'),appendSourcesAssetsToJekyllLayout(layout));
 fs.writeFileSync(path.join(outRoot,'_config.yml'),
  config+'\nurl: "https://gttome.github.io"\nbaseurl: "/Daily-AI-Brief-Compiler"\n');
 fs.writeFileSync(path.join(outRoot,'sources.md'),renderSourcesMarkdown(registry));
 for(const [file,route] of [[SOURCE_CSS,PUBLIC_CSS],[SOURCE_JS,PUBLIC_JS]]){
   const dest=path.join(outRoot,route);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.copyFileSync(file,dest);
 }
 return {result:'PASS',registry_rows:registry.resources.length,source_root:outRoot};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=process.argv[2];
 if(!out)throw Error('usage: node scripts/prepare-sources-jekyll.mjs <new-output-directory>');
 const r=prepareSourcesJekyll({outRoot:out});
 console.log('SOURCE_JEKYLL_REAL_ASSETS_READY',r.registry_rows);
}
