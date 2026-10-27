"""Native HRAiN/iNaiHR immutable Atlas: v4-style filename/version+directory faceting.

Grounded in SHA-verified public HRAiN atlas, not deprecated /main JSON URLs.
Both original D3 interfaces must preserve source/semantic/TOPA authority.
"""
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PORT=8951
PATH="/janus.html"
def main():
    proc=subprocess.Popen([sys.executable,"-m","http.server",str(PORT),"--bind","127.0.0.1",
                           "--directory",str(ROOT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(0.75)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            page=browser.new_page(viewport={"width":1440,"height":900})
            errors=[];writes=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.on("request",lambda r:writes.append((r.method,r.url))
                    if r.method in ("POST","PUT","PATCH","DELETE") else None)
            page.goto(f"http://127.0.0.1:{PORT}{PATH}",wait_until="domcontentloaded",timeout=30000)
            page.locator(".janus-native-atlas-launch").click(timeout=18000)
            page.wait_for_function("!document.querySelector('#janus-atlas-drawer').hidden")
            page.wait_for_function("document.querySelector('#janus-atlas-repo').options.length>=15",timeout=25000)
            page.select_option("#janus-atlas-repo","Hawkar-usls/Hrain")
            page.wait_for_function("document.querySelectorAll('#janus-atlas-results .janus-atlas-hit').length>=30",timeout=30000)
            assert page.locator("#janus-atlas-layer option[value='.janus']").count()==1
            page.select_option("#janus-atlas-layer",".janus")
            page.locator("#janus-atlas-version").fill("v1")
            page.locator("#janus-atlas-query").fill("HRAIN_INAIHR_JANUS_SYNTH_LINK_V1")
            page.wait_for_function("document.querySelector('#janus-atlas-shown').textContent.startsWith('1 matching')",timeout=10000)
            item=page.locator("#janus-atlas-results .janus-atlas-hit")
            assert item.count()==1,item.count()
            text=item.inner_text()
            assert ".janus/HRAIN_INAIHR_JANUS_SYNTH_LINK_V1.json" in text,text
            assert "filename version v1" in text.lower(),text
            item.click()
            panel=page.locator("#janus-atlas-focus").inner_text()
            assert "Hawkar-usls/Hrain@" in panel and "HRAIN_INAIHR_JANUS_SYNTH_LINK_V1.json" in panel,panel[:500]
            # Typing a non-matching version changes only the filtered view, not any source graph.
            page.locator("#janus-atlas-version").fill("v999999")
            assert page.locator("#janus-atlas-results .janus-atlas-hit").count()==0
            page.locator("#janus-atlas-version").fill("v1")
            assert page.locator("#janus-atlas-results .janus-atlas-hit").count()==1
            page.locator("#janus-atlas-query").fill("<img src=x onerror=alert(1)>")
            assert page.locator("#janus-atlas-results img").count()==0
            assert not writes,writes
            assert not errors,errors
            print("JANUS_IMMUTABLE_VERSION_DIRECTORY_FACETS_PASS",ROOT.name,flush=True)
            page.close();browser.close()
    finally:
        proc.terminate()

if __name__=="__main__":main()
