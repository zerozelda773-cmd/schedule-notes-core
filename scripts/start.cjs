// SPDX-License-Identifier: Apache-2.0
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..','dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{let relative;try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");res.setHeader('X-Content-Type-Options','nosniff');
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);});});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Synthetic demo: http://127.0.0.1:'+server.address().port));
