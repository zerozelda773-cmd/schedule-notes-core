// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 function checkAdapter(adapter,methods){return {valid:!!adapter&&methods.every(m=>typeof adapter[m]==='function'),requiredMethods:methods.slice()};}
 const api={aiProvider:a=>checkAdapter(a,['analyze','suggest']),excelReader:a=>checkAdapter(a,['readRows']),nativeStore:a=>checkAdapter(a,['read','writeAtomic']),calendar:a=>checkAdapter(a,['periodFor'])};
 if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).optional=api;
})(globalThis);
