"""End-to-end JANUS volumetric 3D browser smoke; serves pinned repo contents locally."""
from __future__ import annotations
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=os.getcwd(),**kwargs)
    def log_message(self,*args):
        return

def run():
    server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
    t=threading.Thread(target=server.serve_forever,daemon=True)
    t.start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=[
                "--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"
            ])
            page=browser.new_page(viewport={"width":1280,"height":850},device_scale_factor=1)
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{server.server_port}/galaxy.html",wait_until="domcontentloaded")
            page.wait_for_function(
                "window.__JANUS_VOLUME_DIAG && window.__JANUS_VOLUME_DIAG().nodes > 0",
                timeout=30000
            )
            initial=page.evaluate("window.__JANUS_VOLUME_DIAG()")
            assert initial["renderer"]=="WebGL2",initial
            assert initial["hasSourceMutation"] is False
            if initial["role"]=="registry":
                assert initial["graphKind"]=="registry_overview",initial
                assert initial["nodes"]>=10,initial
                # Click a visible repository 3D node, not a fabricated decorative point.
                target=page.evaluate("""async () => {
                  const m=await import("./assets/janus-volume-model.mjs");
                  const r=await import("./assets/janus-volume-render.mjs");
                  const manifest=await fetch("./assets/janus-json-atlas/manifest.json").then(x=>x.json());
                  const c=window.__JANUS_VOLUME_DIAG().camera;
                  return m.repositoryOverview(manifest.repositories).nodes
                    .map(n=>{const p=r.projectPoint(n.p,c,1280,850);return {id:n.id,x:p.x,y:p.y};})
                    .find(p=>p.x>375&&p.x<1000&&p.y>150&&p.y<800);
                }""")
                assert target,target
                page.mouse.click(target["x"],target["y"])
                page.locator("#dive").wait_for(state="visible",timeout=10000)
                page.locator("#dive").click()
                page.wait_for_function(
                    "window.__JANUS_VOLUME_DIAG().graphKind==='registry' && window.__JANUS_VOLUME_DIAG().loadedShards>=1",
                    timeout=30000
                )
                drilled=page.evaluate("window.__JANUS_VOLUME_DIAG()")
                assert drilled["recordCount"]>0,drilled
                assert drilled["edges"]>0,drilled
                page.locator("#band").select_option("structure")
                assert page.evaluate("window.__JANUS_VOLUME_DIAG().edges")>0
                page.locator("#search").fill(".json")
                assert page.locator("#search").input_value()==".json"
                page.locator("#search").fill("")
            else:
                assert initial["graphKind"]=="semantic",initial
                assert initial["recordCount"]>=100,initial
                assert initial["nodes"]>initial["recordCount"],initial
                assert initial["edges"]>initial["recordCount"],initial
                assert initial["references"]>0,initial
                page.locator("#band").select_option("provenance")
                assert page.evaluate("window.__JANUS_VOLUME_DIAG().edges")>0
                page.locator("#band").select_option("lineage")
            page.locator("#top").click()
            top=page.evaluate("window.__JANUS_VOLUME_DIAG().camera.pitch")
            assert top>1.3
            page.locator("#edge").click()
            edge=page.evaluate("window.__JANUS_VOLUME_DIAG().camera.pitch")
            assert abs(edge)<.1
            page.locator("#perspective").click()
            page.locator("#slice").fill("65")
            page.locator("#reset").click()
            page.locator("#tour").click()
            assert "Остановить" in page.locator("#tour").inner_text()
            page.locator("#tour").click()
            # Read-only, no storage interaction and no uncaught script exceptions.
            assert not errors,errors
            print("JANUS_3D_CHROMIUM_PASS",initial["role"],initial["renderer"])
            browser.close()
    finally:
        server.shutdown()

if __name__=="__main__":
    run()
