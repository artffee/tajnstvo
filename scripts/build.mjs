import {mkdir,rm,copyFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
await rm(join(root,'public'),{recursive:true,force:true});await mkdir(join(root,'public'));
for(const file of await readdir(root)){
  if(/\.(html|css|js|png|jpg|pdf|ttf|txt|xml)$/.test(file))await copyFile(join(root,file),join(root,'public',file));
}
await mkdir(join(root,'public/vendor'));
for(const file of await readdir(join(root,'vendor')))await copyFile(join(root,'vendor',file),join(root,'public/vendor',file));
console.log('Built public/ with static pages, fonts, original tools and reports. Server files excluded.');
