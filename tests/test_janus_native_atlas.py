"""Guard the ORIGINAL native Janus organisms and source-byte-only JSON overlay."""
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]

class NativeJanusIntegration(unittest.TestCase):
    def test_original_frontend_not_replaced(self):
        html=(ROOT/"index.html").read_text(encoding="utf8")
        self.assertIn("iNaiHR · Semantic Nexus",html)
        self.assertIn("d3.v7.min.js",html)
        self.assertIn("SYNTH",html)
        self.assertIn("CLEAR LOCAL DESK",html)
        self.assertIn('src="./assets/janus-native-atlas.js"',html)
        self.assertNotIn('src="./assets/janus-json-map.js"',html)

    def test_original_janus_brain_and_native_projection(self):
        html=(ROOT/"janus.html").read_text(encoding="utf8")
        self.assertIn("d3.v7.min.js",html)
        self.assertIn("window.JANUSAtlasNativeFocus",html)
        self.assertIn("window.JANUSAtlasNativeRestore",html)
        self.assertIn('src="./assets/janus-native-atlas.js"',html)
        self.assertNotIn('href="./janus-map.html"',html)

    def test_misleading_replica_redirects_to_real_application(self):
        old=(ROOT/"janus-map.html").read_text(encoding="utf8")
        self.assertIn("location.replace('./?atlas=1')",old)
        self.assertNotIn('id="graph"',old)
        self.assertNotIn("JANUS knowledge map",old)

    def test_no_source_write_or_local_workspace_mutation(self):
        js=(ROOT/"assets/janus-native-atlas.js").read_text(encoding="utf8")
        for part in ("NO_IMMUTABLE_MANIFEST_COMMIT","SHARD_SHA256_MISMATCH",
                     "GITHUB_BLOB_INTEGRITY_HOLD","META_REGISTRY_DIGEST_HOLD",
                     "SOURCE_TOO_LARGE_OR_ORIGIN_CHANGED","JANUSAtlasNativeFocus"):
            self.assertIn(part,js)
        for dangerous in ("localStorage.setItem(", "method:'POST'", "method:'PUT'",
                          "method:'DELETE'", "ROWAN_API_KEY","dangerouslySetInnerHTML"):
            self.assertNotIn(dangerous,js)
        self.assertIn("content-length",js)
        self.assertIn("MAX_FILE=2_000_000",js)

if __name__=="__main__":
    unittest.main()
