"""Executable regression for exact, commit-pinned JSON URLs in verified source fields."""
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class ExactReferenceTests(unittest.TestCase):
    def test_json_pointer_and_false_positive_firewalls(self):
        js = r"""
const assert = require('node:assert/strict');
const {find} = require('./assets/janus-explicit-links.js');
const sha = 'a'.repeat(40);
const source = {id:'source'};
const good = 'https://github.com/Hawkar-usls/tranception/blob/'+sha+'/.janus/HABITAT_LINK.json';
const unknown = 'https://github.com/Hawkar-usls/Other/blob/'+sha+'/unknown.json';
const row = {id:'target',sourceUrl:good,sourceCommit:sha,readOnly:true,deleteAllowed:false};
const fields = {'refs/path':[good,unknown,'similar HABITAT_LINK.json',
  'https://github.com/Hawkar-usls/tranception/blob/main/.janus/HABITAT_LINK.json']};
const a = find(fields,source,new Map([['target',row]]));
assert.equal(a.resolved.length,1);
assert.equal(a.unresolved.length,1);
assert.equal(a.resolved[0].pointer,'/refs~1path/0');
assert.equal(a.resolved[0].targetId,'target');
assert.equal(a.resolved[0].status,'SOURCE_BYTES_VERIFIED_TARGET_INDEX_ONLY');
assert.equal(a.unresolved[0].pointer,'/refs~1path/1');
assert.equal(find({'x':'target.json'},source,[row]).resolved.length,0);
assert.equal(find({'x':good},source,[{...row,sourceCommit:'b'.repeat(40)}]).resolved.length,0);
assert.equal(find({'x':good},source,[{...row,readOnly:false}]).resolved.length,0);
assert.equal(find({'x':good},source,[{...row,deleteAllowed:true}]).resolved.length,0);
const many = Array.from({length:40},(_,i)=>unknown.replace('unknown.json',i+'.json'));
const capped = find(many,source,[row]);
assert.ok(capped.truncated);
assert.ok(capped.unresolved.length<=24);
console.log('JANUS_EXPLICIT_JSON_POINTERS_PASS');
"""
        result = subprocess.run(
            ["node", "-e", js], cwd=ROOT, text=True, capture_output=True, timeout=12)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("JANUS_EXPLICIT_JSON_POINTERS_PASS", result.stdout)

    def test_native_ui_does_not_replace_original_neural_graph(self):
        atlas = (ROOT / "assets/janus-native-atlas.js").read_text(encoding="utf8")
        brain = (ROOT / "janus.html").read_text(encoding="utf8")
        index = (ROOT / "index.html").read_text(encoding="utf8")
        for item in (index, brain):
            self.assertIn('src="./assets/janus-explicit-links.js"', item)
            self.assertLess(item.index('src="./assets/janus-explicit-links.js"'),
                            item.index('src="./assets/janus-native-atlas.js"'))
        self.assertIn("PROJECT EXPLICIT LINKS INTO ORIGINAL GRAPH", atlas)
        self.assertIn("SOURCE_BYTES_VERIFIED_TARGET_INDEX_ONLY",
                      (ROOT / "assets/janus-explicit-links.js").read_text(encoding="utf8"))
        self.assertIn("explicit-json-url", brain)
        self.assertIn("window.JANUSAtlasNativeRestore", brain)
        self.assertNotIn("localStorage.setItem(", atlas)

if __name__ == "__main__":
    unittest.main()
