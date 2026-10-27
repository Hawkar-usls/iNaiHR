"""Restored owner-provided iNaiHR source: no credential or remote mutation regression."""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[1]
class OriginalINaiHR(unittest.TestCase):
    def test_original_green_spore(self):
        s=(ROOT/"spore-original.html").read_text(encoding="utf-8")
        self.assertIn("SPORE MIND",s)
        self.assertIn("d3.v7.min.js",s)
        self.assertIn("Shift",s)
        self.assertIn("JANUSAtlasNativeFocus",s)
        self.assertIn("JANUSAtlasNativeRestore",s)
        self.assertIn("sessionStorage.setItem(SPORE_DRAFT_KEY",s)
        self.assertIn("EXPLICIT_SOURCE_REFERENCE",s)
        self.assertNotIn("supperless-yoshiko",s)
        self.assertNotIn("api/inaihr/sync",s)
        self.assertNotIn("api/inaihr/get",s)
    def test_purple_original_without_embedded_api_key(self):
        s=(ROOT/"ai-nexus-original.html").read_text(encoding="utf-8")
        self.assertIn("AI NEXUS",s)
        self.assertIn("const apiKey=null",s)
        self.assertIn("SYNTH GATED",s)
        self.assertIn("JANUSAtlasNativeFocus",s)
        self.assertIn("JANUSAtlasNativeRestore",s)
        self.assertIn("EXPLICIT_SOURCE_REFERENCE",s)
        self.assertIn("sessionStorage.setItem(NEXUS_SAFE_KEY",s)
        self.assertNotIn("localStorage.setItem('inaihr_v1'",s)
        self.assertNotIn("generativelanguage.googleapis.com",s)
        self.assertNotRegex(s,r"AIzaSy[A-Za-z0-9_-]{12,}")
    def test_original_versions_are_separate_from_current_semantic_nexus(self):
        s=(ROOT/"index.html").read_text(encoding="utf-8")
        self.assertIn("spore-original.html",s)
        self.assertIn("ai-nexus-original.html",s)
        self.assertIn("Semantic Nexus",s)
        self.assertIn('src="./assets/janus-native-atlas.js"',s)
        for name in ("spore-original.html","ai-nexus-original.html"):
            body=(ROOT/name).read_text(encoding="utf-8")
            self.assertNotRegex(body,r"AIzaSy[A-Za-z0-9_-]{12,}")
            self.assertNotRegex(body,r"(?i)(?:method\s*:\s*['\"](?:POST|PUT|DELETE|PATCH))")
            self.assertIn('src="./assets/janus-native-atlas.js"',body)
if __name__=="__main__":unittest.main()
