"""Native JANUS organism retains trusted exact source links and explicit truth boundaries."""
from pathlib import Path
import unittest
R=Path(__file__).resolve().parents[1]
class NativeRelationOverlay(unittest.TestCase):
 def test_separate_direct_semantic_and_topa(self):
  s=(R/"assets/janus-native-atlas.js").read_text(encoding="utf-8")
  self.assertIn("INDEXED LINKS · FULL PUBLIC CATALOG",s)
  self.assertIn("RELATION_INDEX_NOT_FOR_CURRENT_VERIFIED_CATALOG",s)
  self.assertIn("RELATION_SHARD_HASH_OR_AUTHORITY",s)
  self.assertIn("RELATION_EDGE_POLICY_HOLD",s)
  self.assertIn("EXPLICIT_SOURCE_REFERENCE",s)
  self.assertIn("NOT_TOPA_ADJUDICATED",s)
  self.assertIn("semanticHypothesesAreEvidence!==false",s)
  self.assertIn("topaVerdictsAreAutoInferred!==false",s)
  self.assertIn("window.JANUSAtlasNativeFocus([origin,...targetRecords],links)",s)
  for forbidden in ("method:'POST'","method:'PUT'","method:'PATCH'","method:'DELETE'",
                    "localStorage.setItem(","innerHTML="):
   self.assertNotIn(forbidden,s)
 def test_real_organs_remain_original(self):
  home=(R/"index.html").read_text(encoding="utf-8")
  organ=(R/"janus.html").read_text(encoding="utf-8")
  self.assertIn("d3.v7.min.js",home)
  self.assertIn("d3.v7.min.js",organ)
  self.assertIn("window.JANUSAtlasNativeFocus",organ)
  self.assertIn("window.JANUSAtlasNativeRestore",organ)
  self.assertIn('src="./assets/janus-native-atlas.js"',home)
  self.assertIn('src="./assets/janus-native-atlas.js"',organ)
if __name__=="__main__":unittest.main()
