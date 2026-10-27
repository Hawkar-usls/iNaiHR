"""Original iNaiHR SPORE and AI Nexus Chromium + real immutable JANUS Atlas smoke.

Only GETs for public corpus and static libraries; fails on POST/mutating request.
"""
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PORT=8937
SOURCE="COSMOS-ALI-V2-LATTICE-TOF-PROTOCOL-2026-10-18"
def run():
    server=subprocess.Popen([sys.executable,"-m","http.server",str(PORT),"--bind","127.0.0.1",
      "--directory",str(ROOT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        with sync_playwright() as driver:
            browser=driver.chromium.launch(headless=True)
            for page_name in ("spore-original.html","ai-nexus-original.html"):
                page=browser.new_page(viewport={"width":1440,"height":900})
                errors=[];writes=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.on("request",lambda r:writes.append((r.method,r.url))
                        if r.method in ("POST","PUT","PATCH","DELETE") else None)
                page.goto(f"http://127.0.0.1:{PORT}/{page_name}",wait_until="domcontentloaded",timeout=30000)
                page.wait_for_selector("#chart svg",timeout=20000)
                page.wait_for_selector(".janus-native-atlas-launch",timeout=22000)
                if page_name=="spore-original.html":
                    page.wait_for_function("nodes.length===1",timeout=15000)
                    page.evaluate("openAddModal()")
                    page.locator("#node-input").fill("Mycelium")
                    page.evaluate("saveNode()")
                    assert page.evaluate("nodes.length")==2
                    page.evaluate("""() => {
                        clickNode({stopPropagation(){},shiftKey:true},nodes[0]);
                        clickNode({stopPropagation(){},shiftKey:true},nodes[1]);
                    }""")
                    assert page.evaluate("links.length")==1
                    assert page.evaluate("!!sessionStorage.getItem(SPORE_DRAFT_KEY)")
                else:
                    page.wait_for_function("nodes.length>=1",timeout=15000)
                    page.evaluate("createNewNode()")
                    assert page.evaluate("nodes.length")==2
                    page.evaluate("synthAI()")
                    assert page.evaluate("!!sessionStorage.getItem(NEXUS_SAFE_KEY)")
                    assert page.evaluate("localStorage.getItem('inaihr_v1')===null")
                    # Original createNewNode opens rename modal; close it like user
                    # before opening the separate JSON memory drawer.
                    page.evaluate("document.getElementById('rename-modal').style.display='none'")
                count=page.evaluate("nodes.length")
                page.locator(".janus-native-atlas-launch").click()
                page.wait_for_function("!document.querySelector('#janus-atlas-drawer').hidden",timeout=10000)
                page.wait_for_function("document.querySelector('#janus-atlas-repo').options.length>=15",timeout=30000)
                page.select_option("#janus-atlas-repo","Hawkar-usls/Janus-Cosmos")
                page.wait_for_function("document.querySelectorAll('#janus-atlas-results .janus-atlas-hit').length>=2",timeout=30000)
                page.locator("#janus-atlas-query").fill(SOURCE)
                page.wait_for_function("document.querySelector('#janus-atlas-shown').textContent.startsWith('1 matching')",timeout=12000)
                page.locator("#janus-atlas-results .janus-atlas-hit").first.click()
                page.get_by_role("button",name="INDEXED LINKS · FULL PUBLIC CATALOG").click()
                page.wait_for_function("document.querySelector('#janus-atlas-focus')?.textContent.includes('DIRECT edges')||document.querySelector('#janus-atlas-focus')?.textContent.includes('RELATION INDEX HOLD')",timeout=30000)
                info=page.locator("#janus-atlas-focus").inner_text()
                assert "RELATION INDEX HOLD" not in info,info[:1200]
                assert "/sources/prior_v1/url" in info,info[:1200]
                assert "TOPA scientific claims remain NOT ADJUDICATED" in info
                page.get_by_role("button",name="VERIFY ALL TARGET SHARDS & PROJECT SOURCE EDGES").click()
                page.wait_for_function("document.querySelector('#janus-atlas-drawer').hidden",timeout=35000)
                page.wait_for_function("document.querySelectorAll('.link[data-source-pointer=\"/sources/prior_v1/url\"]').length>0",timeout=15000)
                assert page.evaluate("nodes.length")>=2
                page.evaluate("window.JANUSAtlasNativeRestore()")
                assert page.evaluate("nodes.length")==count
                assert not writes,writes
                assert not errors,errors
                print("AUTHENTIC_INAIHR_D3_NATIVE_CORPUS_PASS",page_name,flush=True)
                page.close()
            browser.close()
    finally:
        server.terminate()
if __name__=="__main__":run()
