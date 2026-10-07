// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const entries={'demo/index.html':'index.html','demo/demo.js':'demo.js','demo/style.css':'style.css','core/core.js':'core/core.js','fixtures/synthetic.json':'fixtures/synthetic.json'};
for(const [source,target] of Object.entries(entries)){const out=path.join(root,'dist',target);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,source),out);}
console.log('Built offline synthetic Web Core');
