#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA = "janus.inaihr.semantic_evolution.v2"
MAX_DEPTH = 4
MAX_NEW_PER_RUN = 4
MAX_CANDIDATES = 128
FATIGUE_WINDOW = 24


def canonical_bytes(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha(obj: Any) -> str:
    return hashlib.sha256(canonical_bytes(obj)).hexdigest()


def clean(text: Any, limit: int = 88) -> str:
    s = re.sub(r"\s+", " ", str(text or "")).strip()
    return s[:limit]


def token_set(text: Any) -> set[str]:
    return {x for x in re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", str(text or "").lower()) if len(x) > 2}


def load_json(path: Path, default: Any) -> Any:
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def object_nodes(registry: dict) -> list[dict]:
    return [
        n for n in registry.get("nodes", [])
        if str(n.get("id", "")).startswith("obj:")
        and n.get("readOnly") is True
        and n.get("status") != "INVALID_JSON"
    ]


def parent_groups(nodes: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for n in nodes:
        p = str(n.get("parentId") or "")
        if p:
            groups.setdefault(p, []).append(n)
    return groups


def pair_signature(a: dict, b: dict, pivot: str, source_commit: str, prior_id: str | None = None) -> str:
    ids = sorted([str(a.get("id")), str(b.get("id"))])
    raw = {"ids": ids, "pivot": pivot, "source_commit": source_commit, "prior": prior_id}
    return sha(raw)


def candidate_label(a: dict, b: dict, depth: int) -> str:
    la = clean(a.get("label"), 34)
    lb = clean(b.get("label"), 34)
    return clean(f"S{depth} · {la} ↔ {lb}", 88)


def meaning_frame(a: dict, b: dict, pivot_label: str, source_commit: str, prior: dict | None) -> dict:
    lineage = [
        {"id": a.get("id"), "path": a.get("path"), "status": a.get("status"), "sha256": a.get("sourceSha256")},
        {"id": b.get("id"), "path": b.get("path"), "status": b.get("status"), "sha256": b.get("sourceSha256")},
    ]
    return {
        "purpose": f"Explore a candidate joint meaning that becomes visible only when {clean(a.get('label'), 72)} and {clean(b.get('label'), 72)} are considered together.",
        "mechanism": f"Existing relation-machine: SOURCE_A -> {clean(pivot_label, 72)} -> SOURCE_B. The synthesis proposes a bridge over that already observed topology, not a new fact.",
        "evidence": {"registry_source_commit": source_commit, "source_records": lineage, "independent_replication_established": False},
        "boundaries": [
            "SYNTHESIS != TRUTH",
            "ATTENTION_WEIGHT != EVIDENCE_WEIGHT",
            "GRAPH_DENSITY != EVIDENCE",
            "CANDIDATE_EDGE != CAUSAL_EDGE",
            "NO TARGET-LOCAL VERIFY => NO VERIFIED FIX",
        ],
        "next_steps": [
            "Search for a counterexample to the proposed bridge.",
            "Seek an independent source or target-local verifier before promotion.",
            "If repeated without new evidence, fatigue this motif rather than increase confidence.",
        ],
        "lineage": {"prior_candidate_id": prior.get("id") if prior else None, "source_ids": [a.get("id"), b.get("id")]},
    }


def score_pair(a: dict, b: dict, group_size: int, focus_penalty: int) -> float:
    shared = len(token_set(a.get("label")) & token_set(b.get("label")))
    recency = int(bool(a.get("modifiedAt"))) + int(bool(b.get("modifiedAt")))
    return 10.0 + min(group_size, 12) * 0.5 + shared * 3.0 + recency - focus_penalty


def build(registry: dict, previous: dict | None) -> dict:
    if registry.get("schema") != "janus.hrain.registry_graph_index.v1_0":
        raise RuntimeError("REGISTRY_SCHEMA_MISMATCH")
    if not all(n.get("readOnly") is True for n in registry.get("nodes", [])):
        raise RuntimeError("REGISTRY_READ_ONLY_CONTRACT_VIOLATION")

    source_commit = str(registry.get("sourceCommit") or "unknown")
    nodes = object_nodes(registry)
    groups = parent_groups(nodes)
    previous = previous if isinstance(previous, dict) and previous.get("schema") == SCHEMA else None
    candidates = list((previous or {}).get("candidates") or [])[-MAX_CANDIDATES:]
    receipts = list((previous or {}).get("receipts") or [])[-256:]
    seen = {str(r.get("signature")) for r in receipts[-FATIGUE_WINDOW:] if r.get("signature")}
    previous_focus = ((previous or {}).get("attention") or {}).get("focus_parent")
    previous_focus_age = int(((previous or {}).get("attention") or {}).get("focus_age") or 0)

    pivot_labels = {str(n.get("id")): clean(n.get("label")) for n in registry.get("nodes", [])}
    scored: list[tuple[float, str, dict, dict, str]] = []
    for pivot, arr in groups.items():
        if len(arr) < 2:
            continue
        arr = sorted(arr, key=lambda n: (str(n.get("modifiedAt") or ""), str(n.get("id"))), reverse=True)[:18]
        penalty = min(previous_focus_age * 2, 8) if pivot == previous_focus else 0
        for i in range(len(arr)):
            for j in range(i + 1, len(arr)):
                a, b = arr[i], arr[j]
                sig = pair_signature(a, b, pivot, source_commit)
                if sig in seen:
                    continue
                scored.append((score_pair(a, b, len(arr), penalty), pivot, a, b, sig))
    scored.sort(key=lambda x: (-x[0], x[4]))

    created: list[dict] = []
    used_signatures: set[str] = set()
    for rank, (score, pivot, a, b, sig) in enumerate(scored):
        if len(created) >= MAX_NEW_PER_RUN:
            break
        if sig in used_signatures:
            continue
        prior = None
        # Recursive meaning development: a previous candidate sharing one source may seed a deeper synthesis.
        for c in reversed(candidates):
            if int(c.get("depth") or 1) >= MAX_DEPTH:
                continue
            src_ids = set(((c.get("meaning") or {}).get("lineage") or {}).get("source_ids") or [])
            if a.get("id") in src_ids or b.get("id") in src_ids:
                prior = c
                break
        depth = min(MAX_DEPTH, (int(prior.get("depth")) + 1) if prior else 1)
        evolved_sig = pair_signature(a, b, pivot, source_commit, prior.get("id") if prior else None)
        if evolved_sig in seen or evolved_sig in used_signatures:
            continue
        body = {
            "signature": evolved_sig,
            "source_commit": source_commit,
            "pivot": {"id": pivot, "label": pivot_labels.get(pivot, pivot)},
            "source_ids": [a.get("id"), b.get("id")],
            "prior_candidate_id": prior.get("id") if prior else None,
            "depth": depth,
        }
        cid = "syn:" + sha(body)[:20]
        cand = {
            "id": cid,
            "kind": "SEMANTIC_CANDIDATE",
            "label": candidate_label(a, b, depth),
            "depth": depth,
            "attention_score": round(score, 3),
            "pivot": body["pivot"],
            "meaning": meaning_frame(a, b, pivot_labels.get(pivot, pivot), source_commit, prior),
            "authority": {"truth": False, "proof": False, "causal": False, "mutation": False, "automatic_promotion": False},
            "status": "CANDIDATE_AWAITING_CORROBORATION",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "signature": evolved_sig,
        }
        candidates.append(cand)
        created.append(cand)
        used_signatures.add(evolved_sig)
        receipts.append({
            "schema": "janus.inaihr.semantic_synth_receipt.v2",
            "candidate_id": cid,
            "signature": evolved_sig,
            "source_commit": source_commit,
            "verdict": "PRESERVED_CANDIDATE_ONLY",
            "attention_is_evidence": False,
            "created_at": cand["created_at"],
        })

    if created:
        focus_parent = str(created[0]["pivot"]["id"])
        focus_age = previous_focus_age + 1 if focus_parent == previous_focus else 1
    else:
        focus_parent = None
        focus_age = 0

    state = {
        "schema": SCHEMA,
        "status": "ACTIVE_AUTONOMOUS_CANDIDATE_EVOLUTION",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "registry": {"repository": registry.get("repository"), "source_commit": source_commit, "node_count": registry.get("nodeCount"), "link_count": registry.get("linkCount")},
        "attention": {
            "policy": "MIGRATING_FOCUS_WITH_REPLAY_FATIGUE",
            "focus_parent": focus_parent,
            "focus_age": focus_age,
            "no_fixed_hypothesis_center": True,
            "attention_weight_is_evidence_weight": False,
        },
        "limits": {"max_depth": MAX_DEPTH, "max_new_per_run": MAX_NEW_PER_RUN, "fatigue_window": FATIGUE_WINDOW, "candidate_cap": MAX_CANDIDATES},
        "created_this_run": [c["id"] for c in created],
        "candidate_count": min(len(candidates), MAX_CANDIDATES),
        "candidates": candidates[-MAX_CANDIDATES:],
        "receipts": receipts[-256:],
        "laws": [
            "EXISTING_LINKS -> FOCUS -> COMPOSE -> CANDIDATE -> CORROBORATE",
            "SYNTHESIS != TRUTH",
            "ATTENTION_WEIGHT != EVIDENCE_WEIGHT",
            "REPETITION_WITHOUT_NEW_INFORMATION => FATIGUE",
            "FOCUS_MAY_MIGRATE_OR_DIE",
            "SEMANTIC_CANDIDATE MAY SEED A DEEPER CANDIDATE UP TO DEPTH 4",
            "CANDIDATE CREATION DOES NOT MUTATE SOURCE REGISTRY",
        ],
    }
    state["state_sha256"] = sha(state)
    return state


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", required=True)
    ap.add_argument("--state", required=True)
    args = ap.parse_args()
    registry = load_json(Path(args.registry), {})
    state_path = Path(args.state)
    previous = load_json(state_path, None)
    state = build(registry, previous)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": state["status"], "created": len(state["created_this_run"]), "candidate_count": state["candidate_count"], "state_sha256": state["state_sha256"]}, indent=2))


if __name__ == "__main__":
    main()
