#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, urllib.request
from pathlib import Path

BASE="https://raw.githubusercontent.com/Hawkar-usls/Hrain/janus/fundamentum-structural-memory/data/fundamentum-mirror"
UA="JANUS-iNaiHR-Fundamentum-Associator/1.0"

def fetch_json(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)

def canon(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sh(x):return hashlib.sha256(canon(x).encode()).hexdigest()
def write(p,x):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(x,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")

def collect_text(key):
    return "\n".join(str(d.get("content") or "") for d in key.get("documents",[]) if d.get("status")=="PRESENT")

def status(text,name,default="UNRESOLVED"):
    m=re.search(rf"(?m)^\s*{re.escape(name)}\s*=\s*([^\n\r]+)",text)
    return m.group(1).strip().strip(chr(96)) if m else default

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--out",required=True);a=ap.parse_args()
    out=Path(a.out)
    full=fetch_json(BASE+"/FULL_INDEX.json")
    key=fetch_json(BASE+"/KEY_RESEARCH.json")
    text=collect_text(key)
    source_commit=key.get("source_commit") or full.get("source_commit")
    tracks={
      "P_VS_NP":status(text,"P_VS_NP","OPEN"),
      "A3_EXTERNAL_REPLICATION":status(text,"A3_EXTERNAL_REPLICATION","UNRESOLVED"),
      "A3_WORLD_NOVELTY_N4":status(text,"A3_WORLD_NOVELTY_N4","UNRESOLVED"),
      "C023_ASYMPTOTIC_LOWER_BOUND":status(text,"C023_ASYMPTOTIC_LOWER_BOUND","UNRESOLVED")
    }
    seeds=[
      {"id":"Q-PNP-SAT-POLY","focus":"P vs NP / SAT polynomial-time algorithm","query":"SAT polynomial time algorithm exact proof complexity structural decomposition"},
      {"id":"Q-C023-CACHE","focus":"C023 formula caching","query":"formula caching DPLL clause learning proof complexity lower bounds resolution simulation"},
      {"id":"Q-REASON-REUSE","focus":"reason reuse","query":"reason reuse memoization SAT proof systems cache contextual soundness"},
      {"id":"Q-A3-PRIOR","focus":"A3 prior art","query":"subspace arrangement pathwidth endpoint compression ternary dynamic programming matroid pathwidth"},
      {"id":"Q-LOWER-BOUND","focus":"lower-bound barriers","query":"proof complexity lower bounds resolution caching branching programs SAT"},
      {"id":"Q-REPRESENTATION","focus":"representation preservation","query":"SAT representation change semantic equivalence polynomial reconstruction verification"}
    ]
    routes=[
      {"source":"C023_ASYMPTOTIC_LOWER_BOUND","target":"proof-complexity literature","relation":"SEARCH_FOR_SIMULATION_OR_COUNTEREXAMPLE","status":"CANDIDATE_ROUTE"},
      {"source":"A3_EXTERNAL_REPLICATION","target":"independent implementation","relation":"SEARCH_FOR_REPRODUCTION_OR_PRIOR_ART","status":"CANDIDATE_ROUTE"},
      {"source":"P_VS_NP","target":"exact polynomial SAT candidate","relation":"GENERATE_AND_ATTACK_CANDIDATE","status":"CANDIDATE_ROUTE"}
    ]
    assoc={
      "schema":"janus.inaihr.fundamentum_associations.v1",
      "source_repository":"Hawkar-usls/Janus-Fundamentum",
      "source_commit":source_commit,
      "source_index_entry_count":full.get("entry_count",0),
      "tracks":tracks,
      "routes":routes,
      "topa_query_seeds":seeds,
      "authority":{"truth":False,"proof":False,"evidence":False,"automatic_promotion":False,"source_mutation":False},
      "claim_ceiling":"ASSOCIATIVE_CANDIDATE_MEMORY_ONLY__TARGET_LOCAL_VERIFY_REQUIRED",
      "laws":["ASSOCIATION != EVIDENCE","QUERY_RANK != TRUTH","P_VS_NP_REMAINS_OPEN_UNLESS_EXPLICIT_PROOF_GATE_PASSES"]
    }
    latest={
      "schema":"janus.inaihr.fundamentum_memory_pointer.v1","status":"READY",
      "source_commit":source_commit,"full_index_sha256":sh(full),"associations_sha256":sh(assoc),
      "association_route_count":len(routes),"topa_query_seed_count":len(seeds),
      "janus_access":"READ_ASSOCIATE_GENERATE_CANDIDATES_ONLY","source_mutation":False,"automatic_claim_promotion":False
    }
    write(out/"FULL_INDEX.json",full);write(out/"ASSOCIATIONS.json",assoc);write(out/"LATEST.json",latest)
    print(json.dumps(latest,ensure_ascii=False,indent=2,sort_keys=True))

if __name__=="__main__":main()
