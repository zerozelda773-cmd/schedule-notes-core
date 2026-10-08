// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn}=require('node:child_process'),suite=require('../tests/browser.cjs');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),candidates=[process.env.CHROME_BIN,'C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean),chrome=candidates.find(x=>fs.existsSync(x));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 if(!chrome)throw Error('A real Chrome/Chromium executable is required; no mocked browser substitute. Set CHROME_BIN.');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'schedule-core-browser-')),results=[],versions=[];
 const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(dist+path.sep)||!fs.statSync(file).isFile())throw Error('Not found');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 async function run(phase){
  const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-extensions','--disable-component-update','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
  let socket;try{
   const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Browser startup timeout')),20000);child.stderr.on('data',data=>{text+=data;const match=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(Error('Browser exited: '+code));});});
   socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
   let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject,timer}=pending.get(message.id);clearTimeout(timer);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}});
   const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
   const version=await send('Browser.getVersion');versions.push(version.product);
   const {targetId}=await send('Target.createTarget',{url}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
   let booted=false;for(let n=0;n<200;n++){const value=await send('Runtime.evaluate',{expression:'Boolean(globalThis.ScheduleNotesCore && document.querySelector("#facts")?.textContent.includes("completeness"))',returnByValue:true},sessionId);if(value.result.value){booted=true;break;}await pause(50);}if(!booted)throw Error('Demo boot failed');
   const crash=phase.startsWith('crash-'),result=await send('Runtime.evaluate',{expression:'('+suite.toString()+')('+JSON.stringify(phase)+')',awaitPromise:!crash,returnByValue:!crash},sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
   if(crash){let ready=false;for(let n=0;n<200;n++){const marker=await send('Runtime.evaluate',{expression:'Boolean(globalThis.syntheticCrashReady)',returnByValue:true},sessionId);if(marker.result.value){ready=true;break;}await pause(50);}if(!ready)throw Error('Crash fixture not ready');child.kill('SIGKILL');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,5000);});return;}
   results.push(...result.result.value);
   await send('Browser.close');await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,5000);});
  }finally{socket?.close();if(child.exitCode===null){child.kill();await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000);});}}
 }
 try{await run('seed');await run('crash-before');await run('crash-after');await run('restart');console.log(JSON.stringify({browser:'Chrome/Chromium',versions:[...new Set(versions)],checks:results.length,results}));}
 finally{await new Promise(resolve=>server.close(resolve));const resolved=path.resolve(profile);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('schedule-core-browser-'))throw Error('Unsafe temporary cleanup path');fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
