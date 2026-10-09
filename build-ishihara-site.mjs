import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
const source=new URL('./',import.meta.url),target=new URL('./dist-ishihara/',source);
await mkdir(target,{recursive:true});
for(const file of ['ishihara.js','ishihara-frame.html','ishihara-frame.js','ishihara-responsive.css','styles.css','experience.css','logo-gamatex.webp','_headers'])await copyFile(new URL(file,source),new URL(file,target));
for(const file of ['index.html','standalone.js','standalone.css'])await copyFile(new URL('ishihara-site/'+file,source),new URL(file,target));
const config=await readFile(new URL('config.js',source),'utf8');
await writeFile(new URL('config.js',target),config);
console.log('Ishihara site built in dist-ishihara');
