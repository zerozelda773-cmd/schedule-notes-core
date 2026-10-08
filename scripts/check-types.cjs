// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),{spawnSync}=require('node:child_process'),{stripTypeScriptTypes}=require('node:module');
function checkSyntax(source){
 let stripped;
 try{stripped=stripTypeScriptTypes(source,{mode:'strip'});}catch(error){return {status:'FAIL',exitCode:1,details:error.message,semanticTypeCheck:false};}
 const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:stripped,encoding:'utf8',windowsHide:true,timeout:30000});
 return {status:result.status===0?'PASS':'FAIL',exitCode:result.status,details:result.stderr||'',semanticTypeCheck:false};
}
module.exports={checkSyntax};
if(require.main===module){
 const files=process.argv.slice(2);if(!files.length)files.push('types/index.d.ts','types/storage-conformance.d.ts');
 for(const file of files){const result=checkSyntax(fs.readFileSync(file,'utf8'));console.log(JSON.stringify({file,status:result.status,semanticTypeCheck:false}));if(result.status!=='PASS'){console.error(result.details);process.exitCode=1;}}
}
