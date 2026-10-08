// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'PUBLIC-MANIFEST.json'),'utf8'));
for(const [destination,source] of Object.entries(manifest.buildFiles)){if(!manifest.files.includes(source)||destination.includes('..')||path.isAbsolute(destination))throw Error('Unapproved build path');const file=path.join(root,'dist',destination);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(root,source),file);}
console.log('Built public synthetic Core from registered manifest');
