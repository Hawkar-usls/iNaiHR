"""JANUS Galaxy Lens browser smoke. Uses a temporary local HTTP server; no registry mutation."""
from __future__ import annotations
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    def log_message(self, *_args):
        pass

def run():
    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    repo = "Hawkar-usls/Hrain"
    sample = {
        "id": "json:test", "repository": repo, "path": ".janus/TEST_CONTRACT.json",
        "sourceCommit": "a" * 40, "gitBlobSha": "b" * 40,
        "sizeBytes": 20000, "memoryClass": "PUBLIC_JSON",
        "sourceUrl": "https://github.com/Hawkar-usls/Hrain/blob/" + "a" * 40 + "/.janus/TEST_CONTRACT.json"
    }
    manifest = {
        "schema": "janus.hrain.github_json_constellation_manifest.v1",
        "authority": {"readOnly": True},
        "jsonCount": 1, "repositoryCount": 1,
        "generatedAt": "2026-11-14T00:00:00Z",
        "repositories": [{"repository":repo, "jsonCount":1, "complete":True, "sourceMode":"TEST_FIXTURE","commit":"a"*40}],
        "shards": [{"path":"assets/janus-json-atlas/shards/0000.json", "repository":repo, "count":1}]
    }
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width":1180,"height":820})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            if os.path.basename(os.getcwd()).lower() == "hrain":
                page.route("https://hawkar-usls.github.io/Hrain/assets/janus-json-atlas/manifest.json",
                           lambda route:route.fulfill(json=manifest,headers={"Access-Control-Allow-Origin":"*"}))
                page.route("https://hawkar-usls.github.io/Hrain/assets/janus-json-atlas/shards/0000.json",
                           lambda route:route.fulfill(json={"readOnly":True,"records":[sample]},headers={"Access-Control-Allow-Origin":"*"}))
            page.goto("http://127.0.0.1:" + str(port) + "/galaxy.html", wait_until="domcontentloaded")
            if os.path.basename(os.getcwd()).lower() == "hrain":
                page.wait_for_function('document.querySelector("#scope").textContent.includes("JANUS ·")', timeout=20000)
                # Use the same deterministic exported placement to hit-test the only source repository.
                point = page.evaluate("""async () => {
                  const mod = await import("./assets/janus-galaxy.mjs");
                  return mod.spiralLayout([{repository:"Hawkar-usls/Hrain",jsonCount:1}], "registry", true)[0];
                }""")
                zoom = max(.47, min(1.3, min(1180/850, 820/750)))
                x = 1180/2 + point["x"]*zoom
                y = 820/2 + point["y"]*zoom*.85
                page.locator("main").evaluate("(el)=>el.style.display='none'")
                page.mouse.click(x,y)
                page.locator("#dive").wait_for(state="visible",timeout=5000)
                page.locator("#dive").click()
                page.wait_for_function('document.querySelector("#scope").textContent.includes("сегмент")', timeout=10000)
                page.locator("main").evaluate("(el)=>el.style.display=''")
                page.locator("#search").fill("TEST_CONTRACT")
                assert "1" in page.locator("#visible").inner_text()
                page.locator("#band").select_option("signal")
                assert "1" in page.locator("#visible").inner_text()
            else:
                page.wait_for_function('document.querySelector("#scope").textContent.includes("iNaiHR")', timeout=20000)
                page.locator("#band").select_option("source")
                assert "показано" in page.locator("#visible").inner_text()
                page.locator("#search").fill("SCOBY")
                assert "найдено" in page.locator("#visible").inner_text()
            page.locator("#tour").click()
            assert "Пауза" in page.locator("#tour").inner_text()
            page.locator("#tour").click()
            page.locator("#reset").click()
            assert not errors, errors
            browser.close()
            print("GALAXY_BROWSER_PASS",os.path.basename(os.getcwd()))
    finally:
        server.shutdown()

if __name__ == "__main__":
    run()
