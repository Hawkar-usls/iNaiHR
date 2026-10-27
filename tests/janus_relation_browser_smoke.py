"""Headless browser contract: real public JSON source, mocked SHA-consistent derived edge index.
No source repo mutations. Tests ORIGINAL D3 organisms, NOT a substitute for deployed index audit.
"""
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import time
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
REPO=os.environ.get("JANUS_ORGANISM","Hrain")
PORT=8877
FAKE_SHA="f"*40
BASE="https://raw.githubusercontent.com/Hawkar-usls/Hrain/"
def fetch(url):
    with urlopen(Request(url,headers={"User-Agent":"JANUS-native-browser-contract"}),timeout=35) as r:return r.read()
def packed(v):return (json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=False)+"\n").encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def fixture():
    revision=json.loads(fetch("https://api.github.com/repos/Hawkar-usls/Hrain/commits?path=assets/janus-json-atlas/manifest.json&per_page=1"))[0]["sha"]
    root=fetch(BASE+revision+"/assets/janus-json-atlas/manifest.json")
    catalog=json.loads(root)
    files={}
    source=target=None
    for s in catalog["shards"]:
        if s["repository"]!="Hawkar-usls/Janus-Cosmos":continue
        b=fetch(BASE+revision+"/"+s["path"])
        assert sha(b)==s["sha256"]
        d=json.loads(b)
        for r in d["records"]:
            if r["path"]=="data/cosmos/COSMOS-ALI-V2-LATTICE-TOF-PROTOCOL-2026-10-18.json":source=r
            if r["path"]=="data/cosmos/COSMOS-ALI-SIMULATION-AUDIT-RESULT-2026-10-18.json":target=r
    assert source and target
    url="https://raw.githubusercontent.com/"+source["repository"]+"/"+source["sourceCommit"]+"/"+source["path"]
    body=fetch(url)
    assert hashlib.sha1(b"blob "+str(len(body)).encode()+b"\x00"+body).hexdigest()==source["gitBlobSha"]
    assert json.loads(body)["sources"]["prior_v1"]["url"].endswith("/data/cosmos/COSMOS-ALI-SIMULATION-AUDIT-RESULT-2026-10-18.json")
    edge={"sourceId":source["id"],"targetId":target["id"],"jsonPointer":"/sources/prior_v1/url",
          "authoredUrl":"https://github.com/Hawkar-usls/Janus-Cosmos/blob/main/"+target["path"],
          "sourceGitBlobSha":source["gitBlobSha"],"sourceSha256":sha(body),
          "targetSnapshotCommit":target["sourceCommit"],"referenceMode":"BRANCH_MAIN_REBOUND_TO_SNAPSHOT",
          "relationClass":"EXPLICIT_SOURCE_REFERENCE","scientificVerdict":"NOT_TOPA_ADJUDICATED"}
    specs=[]
    for i,r in enumerate(catalog["repositories"]):
        edges=[edge] if r["repository"]==source["repository"] else []
        b=packed({"schema":"janus.hrain.json_explicit_relations.v1","catalogSha256":sha(root),
                 "repository":r["repository"],"readOnly":True,"semanticHypothesesAreEvidence":False,
                 "topaScientificVerdict":"NOT_ADJUDICATED","edges":edges})
        name=f"shards/{i:02d}.json"
        files[name]=b
        specs.append({"repository":r["repository"],"path":"assets/janus-json-relations/"+name,"count":len(edges),"sha256":sha(b)})
    fixture={"schema":"janus.hrain.json_explicit_relations.v1",
             "authority":{"readOnly":True,"writeAuthority":False,"sourceMutationAllowed":False,
                          "semanticHypothesesAreEvidence":False,"topaVerdictsAreAutoInferred":False},
             "sourceCatalogSha256":sha(root),"sourceCatalogJsonCount":catalog["jsonCount"],
             "publicRepositoryCount":catalog["repositoryCount"],"scannedVerifiedFiles":2,
             "directEdges":1,"pendingFiles":catalog["jsonCount"]-2,"heldFiles":0,"truncatedFiles":0,
             "shards":specs}
    files["manifest.json"]=packed(fixture)
    return files

def main():
    files=fixture()
    server=subprocess.Popen([sys.executable,"-m","http.server",str(PORT),"--bind","127.0.0.1",
                            "--directory",str(ROOT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            for uri in ("index.html","janus.html"):
                page=browser.new_page(viewport={"width":1440,"height":900})
                errors=[];page.on("pageerror",lambda e:errors.append(str(e)))
                def intercept(route):
                    u=route.request.url
                    if u.startswith("https://api.github.com/repos/Hawkar-usls/Hrain/commits?path=assets/janus-json-relations/"):
                        route.fulfill(status=200,body=json.dumps([{"sha":FAKE_SHA}]),content_type="application/json")
                    elif u.startswith(BASE+FAKE_SHA+"/assets/janus-json-relations/"):
                        name=u.split("/assets/janus-json-relations/",1)[1]
                        if name not in files:route.fulfill(status=404,body="not found")
                        else:route.fulfill(status=200,body=files[name],content_type="application/json")
                    else:route.continue_()
                page.route("**/*",intercept)
                page.goto(f"http://127.0.0.1:{PORT}/{uri}",wait_until="domcontentloaded",timeout=30000)
                page.wait_for_selector(".janus-native-atlas-launch",timeout=20000)
                if uri=="janus.html":page.wait_for_function("document.querySelector('#loading')?.classList.contains('hidden')",timeout=25000)
                assert page.locator("svg").count()>0
                page.locator(".janus-native-atlas-launch").click()
                page.wait_for_function("!document.querySelector('#janus-atlas-drawer').hidden")
                page.wait_for_function("document.querySelector('#janus-atlas-repo').options.length>=15",timeout=25000)
                page.select_option("#janus-atlas-repo","Hawkar-usls/Janus-Cosmos")
                page.wait_for_function("document.querySelectorAll('.janus-atlas-hit').length>=2",timeout=30000)
                page.locator("#janus-atlas-query").fill("COSMOS-ALI-V2-LATTICE-TOF-PROTOCOL-2026-10-18")
                page.wait_for_function("document.querySelector('#janus-atlas-shown').textContent.startsWith('1 matching')")
                page.locator("#janus-atlas-results .janus-atlas-hit").first.click()
                page.get_by_role("button",name="INDEXED LINKS · FULL PUBLIC CATALOG").click()
                page.wait_for_function("document.querySelector('#janus-atlas-focus')?.textContent.includes('DIRECT edges')||document.querySelector('#janus-atlas-focus')?.textContent.includes('RELATION INDEX HOLD')",timeout=22000)
                text=page.locator("#janus-atlas-focus").inner_text()
                assert "RELATION INDEX HOLD" not in text,text[:1000]
                assert "/sources/prior_v1/url" in text
                assert "NOT ADJUDICATED" in text
                if uri=="janus.html":
                    page.get_by_role("button",name="VERIFY ALL TARGET SHARDS & PROJECT SOURCE EDGES").click()
                    page.wait_for_function("document.querySelector('#janus-atlas-drawer').hidden",timeout=30000)
                    page.wait_for_function("document.querySelectorAll('.link[data-source-pointer=\"/sources/prior_v1/url\"]').length>0",timeout=15000)
                    if REPO=="iNaiHR":
                        assert page.locator("#btn-synth").evaluate("(e)=>!e.classList.contains('active')")
                    page.evaluate("window.JANUSAtlasNativeRestore()")
                assert not errors,errors
                print("NATIVE_RELATIONS_BROWSER_PASS",REPO,uri,flush=True)
                page.close()
            browser.close()
    finally:server.terminate()
if __name__=="__main__":main()
