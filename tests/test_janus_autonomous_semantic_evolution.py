import unittest

from tools import janus_autonomous_semantic_evolution as syn


class SemanticEvolutionTests(unittest.TestCase):
    def registry(self):
        return {
            "schema": "janus.hrain.registry_graph_index.v1_0",
            "repository": "Hawkar-usls/janus-meta-registry",
            "sourceCommit": "a" * 40,
            "nodeCount": 7,
            "linkCount": 6,
            "nodes": [
                {"id": "surface:x", "label": "Surface X", "readOnly": True},
                {"id": "obj:a", "label": "Proof Carrier", "lineageKey": "proof", "parentId": "surface:x", "readOnly": True, "status": "PASS", "path": "proof/benchmark.json", "sourceSha256": "1" * 64, "modifiedAt": "2026-09-02T00:00:00Z"},
                {"id": "obj:b", "label": "Proof Carrier", "lineageKey": "proof", "parentId": "surface:x", "readOnly": True, "status": "PASS", "path": "proof/certificate_summary.json", "sourceSha256": "2" * 64, "modifiedAt": "2026-09-02T00:00:01Z"},
                {"id": "obj:c", "label": "Resource Gate", "lineageKey": "resource", "parentId": "surface:x", "readOnly": True, "status": "OPEN", "path": "resource/gate.json", "sourceSha256": "3" * 64, "modifiedAt": "2026-09-02T00:00:02Z"},
                {"id": "obj:d", "label": "Resource Trace", "lineageKey": "resource", "parentId": "surface:x", "readOnly": True, "status": "PASS", "path": "resource/trace.json", "sourceSha256": "4" * 64, "modifiedAt": "2026-09-02T00:00:03Z"},
                {"id": "obj:e", "label": "Search Policy", "lineageKey": "search", "parentId": "surface:x", "readOnly": True, "status": "CANDIDATE", "path": "search/policy.json", "sourceSha256": "5" * 64, "modifiedAt": "2026-09-02T00:00:04Z"},
                {"id": "obj:bad", "label": "Broken", "parentId": "surface:x", "readOnly": True, "status": "INVALID_JSON"},
            ],
            "links": [],
        }

    def test_candidates_are_candidate_only_and_source_bound(self):
        state = syn.build(self.registry(), None)
        self.assertGreater(state["candidate_count"], 0)
        c = state["candidates"][0]
        self.assertEqual(c["status"], "CANDIDATE_AWAITING_CORROBORATION")
        self.assertFalse(c["authority"]["truth"])
        self.assertFalse(c["authority"]["mutation"])
        self.assertEqual(c["meaning"]["evidence"]["registry_source_commit"], "a" * 40)
        self.assertIn("SYNTHESIS != TRUTH", c["meaning"]["boundaries"])

    def test_same_label_uses_path_role_to_keep_meaning_distinct(self):
        state = syn.build(self.registry(), None)
        labels = [c["label"] for c in state["candidates"]]
        self.assertTrue(any("benchmark" in x.lower() and "certificate summary" in x.lower() for x in labels))

    def test_first_cycle_is_depth_one_and_focus_is_diverse(self):
        state = syn.build(self.registry(), None)
        self.assertTrue(all(c["depth"] == 1 for c in state["candidates"]))
        focus = [c["focus_key"] for c in state["candidates"]]
        self.assertEqual(len(focus), len(set(focus)))
        self.assertTrue(state["limits"]["max_one_depth_advance_per_cycle"])
        self.assertTrue(state["limits"]["no_forced_fill"])

    def test_repetition_fatigues_and_focus_may_move(self):
        s1 = syn.build(self.registry(), None)
        s2 = syn.build(self.registry(), s1)
        first = set(s1["created_this_run"])
        second = set(s2["created_this_run"])
        self.assertTrue(first.isdisjoint(second))
        self.assertFalse(s2["attention"]["attention_weight_is_evidence_weight"])
        self.assertTrue(s2["attention"]["no_fixed_hypothesis_center"])

    def test_recursive_meaning_depth_is_bounded(self):
        state = None
        for _ in range(8):
            state = syn.build(self.registry(), state)
        self.assertTrue(all(1 <= int(c["depth"]) <= syn.MAX_DEPTH for c in state["candidates"]))

    def test_writable_registry_is_rejected(self):
        r = self.registry()
        r["nodes"][0]["readOnly"] = False
        with self.assertRaisesRegex(RuntimeError, "READ_ONLY"):
            syn.build(r, None)


if __name__ == "__main__":
    unittest.main()
