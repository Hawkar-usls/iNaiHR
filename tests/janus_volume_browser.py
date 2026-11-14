"""End-to-end JANUS volumetric 3D browser smoke; serves pinned repo contents locally."""
from __future__ import annotations
import os
from io import BytesIO
from PIL import Image
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
                "window.__JANUS_VOLUME_DIAG && window.__JANUS_VOLUME_DIAG().graphKind === 'local_workspace'",
                timeout=30000
            )
            local=page.evaluate("window.__JANUS_VOLUME_DIAG()")
            assert local["renderer"]=="WebGL2",local
            assert local["localWorkspace"] is True,local
            assert page.locator("#desk-toolbar").is_visible()
            role=local["role"]
            key="hrain_v10_4_restore" if role=="registry" else "inaihr_v2"
            # The editable 3D graph writes the EXACT same old mindmap key, never a new isolated copy.
            page.locator("#desk-add").click()
            page.locator("#desk-name").fill("3D edited JANUS node")
            page.locator("#desk-rename").click()
            desk_saved=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key))",key)
            assert len(desk_saved["nodes"])==2,desk_saved
            assert any(n["label"]=="3D edited JANUS node" for n in desk_saved["nodes"])
            assert page.evaluate("(key)=>localStorage.getItem(key+'_3d_backup')!==null",key)
            # Link button, then click an existing 3D node, exactly as in classic mindmap.
            page.locator("#desk-link").click()
            root=page.evaluate("""async (key)=>{
              const m=await import("./assets/janus-volume-workspace.mjs");
              const p=await import("./assets/janus-volume-render.mjs");
              const d=JSON.parse(localStorage.getItem(key));
              const n=m.deskGraph(d,document.body.dataset.role).nodes.find(n=>n.id==="desk:1");
              const c=window.__JANUS_VOLUME_DIAG().camera;
              return p.projectPoint(n.p,c,1280,850);
            }""",key)
            assert root and root["x"]>355,root
            page.mouse.click(root["x"],root["y"])
            linked=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key)).links.length",key)
            assert linked>=1,linked
            page.locator("#desk-dive").click()
            assert page.locator("#desk-ascend").is_enabled()
            page.locator("#desk-ascend").click()
            with page.expect_download() as dl: page.locator("#desk-export").click()
            assert dl.value.suggested_filename.endswith("_3d.json")
            assert page.locator("#desk-original").get_attribute("href")=="./"
            # Full unchanged classic 2D brain works as an in-page control deck.
            page.locator("#desk-original").click()
            assert page.locator("#mindmap-overlay").is_visible()
            assert page.locator("#mindmap-frame").get_attribute("src")=="./"
            page.locator("#mindmap-close").click()
            assert not page.locator("#mindmap-overlay").is_visible()
            assert page.evaluate("(key)=>JSON.parse(localStorage.getItem(key)).nodes.length",key)==2
            # Dragging edits the SAME original D3 x/y coordinates; camera remains available when move is off.
            original_x=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key)).nodes.find(n=>n.id===1).x",key)
            page.locator("#desk-move").click()
            root=page.evaluate("""async (key)=>{
              const m=await import("./assets/janus-volume-workspace.mjs");
              const p=await import("./assets/janus-volume-render.mjs");
              const d=JSON.parse(localStorage.getItem(key));
              const n=m.deskGraph(d,document.body.dataset.role).nodes.find(n=>n.id==="desk:1");
              return p.projectPoint(n.p,window.__JANUS_VOLUME_DIAG().camera,1280,850);
            }""",key)
            page.mouse.move(root["x"],root["y"])
            page.mouse.down()
            page.mouse.move(root["x"]+72,root["y"]+28,steps=7)
            page.mouse.up()
            moved_x=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key)).nodes.find(n=>n.id===1).x",key)
            assert moved_x!=original_x,("3D drag did not persist classic mindmap coordinates",original_x,moved_x)
            page.locator("#desk-move").click()
            # Verify child deletion with an explicit browser approval.
            page.locator("#desk-add").click()
            before_delete=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key)).nodes.length",key)
            page.once("dialog",lambda dialog:dialog.accept())
            page.locator("#desk-delete").click()
            after_delete=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key)).nodes.length",key)
            assert after_delete<before_delete,(before_delete,after_delete)
            page.screenshot(path="janus-volume-control-preview.png")
            # No loss of original editing data upon switching to atlas and back.
            before=page.evaluate("(key)=>localStorage.getItem(key)",key)
            page.locator("#desk-toggle").click()
            page.wait_for_function("window.__JANUS_VOLUME_DIAG().graphKind !== 'local_workspace'")
            initial=page.evaluate("window.__JANUS_VOLUME_DIAG()")
            assert not page.locator("#desk-toolbar").is_visible()
            assert page.evaluate("(key)=>localStorage.getItem(key)",key)==before
            assert initial["renderer"]=="WebGL2",initial
            assert initial["hasSourceMutation"] is False
            if initial["role"]=="registry":
                # At least one real source shard has populated the 3D nebula.
                page.wait_for_function("window.__JANUS_VOLUME_DIAG().nodes > 14",timeout=30000)
            png=page.screenshot(path="janus-volume-preview.png")
            picture=Image.open(BytesIO(png)).convert("RGB")
            # Ignore controls, legend, text, and sidebars: actual GPU data must light the canvas.
            crop=picture.crop((370,170,985,740))
            luminous=sum(1 for r,g,b in crop.getdata() if max(r,g,b)>75 and (r+g+b)>125)
            assert luminous>30,("3D volume invisible",luminous,initial)
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
                assert drilled["edges"]==0,drilled # density lens is pure volumetric emission
                page.locator("#band").select_option("structure")
                assert page.evaluate("window.__JANUS_VOLUME_DIAG().edges")>0
                page.locator("#search").fill(".json")
                assert page.locator("#search").input_value()==".json"
                page.locator("#search").fill("")
            else:
                assert initial["graphKind"]=="semantic",initial
                assert initial["recordCount"]>=100,initial
                assert initial["nodes"]>initial["recordCount"],initial
                assert initial["edges"]==0,initial # do not show a provenance web in the density lens
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
            # Registry untouched; only the explicitly editable local desk may use localStorage.
            assert not errors,errors
            print("JANUS_3D_CHROMIUM_PASS",initial["role"],initial["renderer"])
            browser.close()
    finally:
        server.shutdown()

if __name__=="__main__":
    run()
