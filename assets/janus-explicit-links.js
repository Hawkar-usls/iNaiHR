/* JANUS: bounded, read-only explicit JSON→JSON references. 
 * A link is a source-authored URL observed in SHA-verified source bytes.
 * Matching a commit-pinned URL to a verified catalog row does NOT verify
 * target bytes, interpret the reference, or validate scientific claims.
 */
(function(root){
 'use strict';
 const MAX_NODES=6000, MAX_DEPTH=12, MAX_TEXT=20000, MAX_LINKS=24;
 const GH_URL=/https:\/\/github\.com\/Hawkar-usls\/[A-Za-z0-9_.-]+\/blob\/[a-f0-9]{40}\/[A-Za-z0-9_.%/+~-]+\.json\b/g;
 const escapePointer=k=>String(k).replace(/~/g,'~0').replace(/\//g,'~1');
 function find(doc,origin,verifiedCatalog){
  if(!origin||typeof origin.id!=='string'||!verifiedCatalog)throw Error('NO_VERIFIED_ORIGIN');
  const rows=verifiedCatalog instanceof Map?[...verifiedCatalog.values()]:Array.isArray(verifiedCatalog)?verifiedCatalog:[];
  const targets=new Map();
  for(const r of rows){
   if(r&&typeof r.id==='string'&&typeof r.sourceUrl==='string'&&
      r.readOnly===true&&r.deleteAllowed===false&&
      r.sourceUrl.startsWith('https://github.com/Hawkar-usls/')&&
      /^[a-f0-9]{40}$/.test(r.sourceCommit||'')) targets.set(r.sourceUrl,r);
  }
  let scanned=0, truncated=false;
  const resolved=[],unresolved=[],seen=new Set();
  function visit(value,pointer,depth){
   if(scanned>=MAX_NODES||depth>MAX_DEPTH||resolved.length+unresolved.length>=MAX_LINKS){truncated=true;return;}
   scanned++;
   if(typeof value==='string'){
    if(value.length>MAX_TEXT){truncated=true;return;}
    const matches=value.match(GH_URL)||[];
    for(const url of matches){
     const key=pointer+'\u0000'+url;
     if(seen.has(key))continue;seen.add(key);
     const target=targets.get(url);
     if(target&&target.id!==origin.id){
      resolved.push({pointer:pointer||'',sourceId:origin.id,targetId:target.id,url,
       status:'SOURCE_BYTES_VERIFIED_TARGET_INDEX_ONLY'});
     }else if(!target){
      unresolved.push({pointer:pointer||'',url,status:'TARGET_NOT_IN_LOADED_VERIFIED_SHARDS'});
     }
     if(resolved.length+unresolved.length>=MAX_LINKS){truncated=true;return;}
    }
    return;
   }
   if(!value||typeof value!=='object')return;
   const pairs=Array.isArray(value)?value.map((v,i)=>[String(i),v]):Object.entries(value);
   for(const [k,v] of pairs){
    if(scanned>=MAX_NODES||resolved.length+unresolved.length>=MAX_LINKS){truncated=true;break;}
    visit(v,pointer+'/'+escapePointer(k),depth+1);
   }
  }
  visit(doc,'',0);
  return {resolved,unresolved,scanned,truncated};
 }
 const api=Object.freeze({find});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.JANUSExplicitLinks=api;
})(typeof window==='object'?window:globalThis);
