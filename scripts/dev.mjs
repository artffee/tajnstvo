import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {join,extname,resolve} from 'node:path';
const root=resolve(new URL('../',import.meta.url).pathname);
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.pdf':'application/pdf','.ttf':'font/ttf','.xml':'application/xml','.txt':'text/plain'};
const handlers=Object.fromEntries(await Promise.all(['status','checkout','verify','webhook'].map(async n=>[n,(await import('../api/'+n+'.js')).default])));
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__qa/mobile'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Mobile QA</title><iframe id=mobile src=/ style="width:390px;height:844px;border:0"></iframe>');return;}
  if(url.pathname.startsWith('/api/')){
    const fn=handlers[url.pathname.slice(5)];if(!fn){res.writeHead(404);res.end();return;}try{await fn(req,res);}catch{res.writeHead(500);res.end('Request failed');}return;
  }
  let file=decodeURIComponent(url.pathname);if(file==='/')file='/index.html';if(!extname(file))file+='.html';
  const target=resolve(root,'.'+file);
  if(!target.startsWith(root+'/')||!types[extname(target)]||/\/(server|scripts|tests|node_modules|\.git)\//.test(target)){res.writeHead(404);res.end('Not found');return;}
  try{await stat(target);res.writeHead(200,{'Content-Type':types[extname(target)],'Cache-Control':'no-store'});res.end(await readFile(target));}catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'0.0.0.0',()=>console.log('Tajnstvo preview ready on 4173'));
