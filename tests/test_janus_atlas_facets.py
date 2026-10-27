"""Do not reintroduce HRAiN v4 moving-branch URL or unverified scientific layer."""
import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class NativeAtlasFacets(unittest.TestCase):
    def test_version_is_only_literal_filename_metadata(self):
        src=(ROOT/"assets/janus-native-atlas.js").read_text(encoding="utf-8")
        for marker in ("function sourceDirectory(path)","function sourceVersion(path)","janus-atlas-version",
                       "janus-atlas-layer","NOT scientific classifications","SHARD_SHA256_MISMATCH",
                       "GITHUB_BLOB_INTEGRITY_HOLD","function filterRows()"):
            self.assertIn(marker,src)
        for forbidden in ("REGISTRY_FILES = [","janus-meta-registry/main/janus-meta-registry-v5.2.json","localStorage.setItem(",
                          "method:'POST'","method:'PUT'"):
            self.assertNotIn(forbidden,src)
    def test_original_native_graph_preserved(self):
        assert "JANUSAtlasNativeFocus" in (ROOT/"janus.html").read_text(encoding="utf-8")
        assert "d3.v7.min.js" in (ROOT/"janus.html").read_text(encoding="utf-8")
if __name__=="__main__":unittest.main()
