/* JANUS verified JSON reference extractor for native HRAiN/iNaiHR.
 * Only source bytes already SHA256/Git-blob verified by native Atlas enter here.
 * A branch reference is rebound to the atlas' immutable source snapshot for
 * navigation, never treated as a historical/byte-equivalent claim.
 */
(function(root){
'use strict';
const MAX_NODES=6000, MAX_DEPTH=12, MAX_TEXT=20000, MAX_LINKS=24;
const FIND=/https:\/\/(?:github\.com\/Hawkar-usls\/[A-Za-z0-9_.-]+\/blob\/|raw\.githubusercontent\.com\/Hawkar-usls\/[A-Za-z0-9_.-]+\/)(?:main|[a-f0-9]{40})\/[A-Za-z0-9_.%/+~-]+\.json\b/g;
const EXACT=/^https:\/\/(github\.com|raw\.githubusercontent\.com)\/(Hawkar-usls\/[A-Za-z0-9_.-]+)\/(?:(blob)\/)?(main|[a-f0-9]{40})\/([A-Za-z0-9_.%/+~-]+\.json)$/;
function parse(url){
 const m=EXACT.exec(url);if(!m)return null;
 if((m[1]==='github.com')!==(m[3]==='blob'))return null;
 const segments=m[5].split('/');
 if(segments.length>40)return null;
 const decoded=[];
 try{for(const p of segments){const s=decodeURIComponent(p);if(!s||s==='.'||s==='..'||/[\/\\\x00-\x1f]/.test(s))return null;decoded.push(s);}}
 catch(_){return null;}
 return {repo:m[2],revision:m[4],path:decoded.join('/')};
}
function validRow(r){
 if(!r||typeof r.id!=='string'||typeof r.path!=='string'||typeof r.sourceUrl!=='string'||
 r.readOnly!==true||r.deleteAllowed!==false||
 !/^Hawkar-usls\/[A-Za-z0-9_.-]+$/.test(r.repository||'')||
 !/^[a-f0-9]{40}$/.test(r.sourceCommit||'')||!r.path.endsWith('.json'))return false;
 if(r.path.split('/').some(s=>!s||s==='.'||s==='..'||s.includes('\\')))return false;
 const expected='https://github.com/'+r.repository+'/blob/'+r.sourceCommit+'/'+r.path.split('/').map(encodeURIComponent).join('/');
 return expected===r.sourceUrl;
}
function find(doc,origin,verifiedCatalog){
 if(!origin||typeof origin.id!=='string'||!verifiedCatalog)throw Error('NO_VERIFIED_ORIGIN');
 const rows=verifiedCatalog instanceof Map?[...verifiedCatalog.values()]:Array.isArray(verifiedCatalog)?verifiedCatalog:[];
 const byPath=new Map();
 for(const r of rows)if(validRow(r))byPath.set(r.repository+'\n'+r.path,r);
 let scanned=0,truncated=false;
 const resolved=[],unresolved=[],seen=new Set();
 function visit(value,pointer,depth){
  if(scanned>=MAX_NODES||depth>MAX_DEPTH||resolved.length+unresolved.length>=MAX_LINKS){truncated=true;return;}
  scanned++;
  if(typeof value==='string'){
   if(value.length>MAX_TEXT){truncated=true;return;}
   for(const url of value.match(FIND)||[]){
    const key=pointer+'\u0000'+url;
    if(seen.has(key))continue;seen.add(key);
    const ref=parse(url);if(!ref)continue;
    const target=byPath.get(ref.repo+'\n'+ref.path);
    // A frozen snapshot must contain the target, and pinned links must agree
    // with its exact frozen commit. No fallback to a moving branch is allowed.
    if(target&&target.id!==origin.id&&
     (ref.revision==='main'||ref.revision===target.sourceCommit)){
     const mode=ref.revision==='main'?'BRANCH_MAIN_REBOUND_TO_SNAPSHOT':'PINNED_SAME_COMMIT';
     resolved.push({pointer:pointer||'',sourceId:origin.id,targetId:target.id,
       url,referenceMode:mode,targetSnapshotCommit:target.sourceCommit,
       status:mode==='PINNED_SAME_COMMIT'?'SOURCE_BYTES_VERIFIED_TARGET_INDEX_ONLY':'SOURCE_BRANCH_REFERENCE_SNAPSHOT_TARGET_ONLY'});
    }else{
     unresolved.push({pointer:pointer||'',url,
      status:'TARGET_NOT_IN_MATCHING_VERIFIED_SNAPSHOT'});
    }
    if(resolved.length+unresolved.length>=MAX_LINKS){truncated=true;return;}
   }
   return;
  }
  if(!value||typeof value!=='object')return;
  const pairs=Array.isArray(value)?value.map((v,i)=>[String(i),v]):Object.entries(value);
  for(const [k,v] of pairs){
   if(scanned>=MAX_NODES||resolved.length+unresolved.length>=MAX_LINKS){truncated=true;break;}
   visit(v,pointer+'/'+String(k).replace(/~/g,'~0').replace(/\//g,'~1'),depth+1);
  }
 }
 visit(doc,'',0);return {resolved,unresolved,scanned,truncated};
}
const api=Object.freeze({find});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.JANUSExplicitLinks=api;
})(typeof window==='object'?window:globalThis);
