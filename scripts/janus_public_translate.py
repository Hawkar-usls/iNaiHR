#!/usr/bin/env python3
"""JANUS public-only offline MT: executed only on GitHub Actions runners.

The runner downloads pinned, Apache-2.0 Helsinki-NLP weights. The translation
text is not sent to a translation API; only the allowlisted repository catalog
is passed to local CPU inference. All output is UNREVIEWED and never published.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public-i18n" / "source.json"
MODELS = {
    "uk": ("Helsinki-NLP/opus-mt-en-uk", "b448d49ddc54149ac1c4efe9a5c4b44ebfaefa03"),
    "ru": ("Helsinki-NLP/opus-mt-en-ru", "bb09c99d180016eac6819df3dae68edb1690fdee"),
}
ENTRY_ID = re.compile(r"^[a-z][a-z0-9_-]{1,39}$")
VERSION = re.compile(r"^[a-z0-9][a-z0-9-]{3,79}$")
EMAIL = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
URL = re.compile(r"(?i)(?:https?://|www\.)")
SECRETS = re.compile(
    r"(?i)(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
    r"|github_pat_[A-Za-z0-9_]{8,}|gh[pousr]_[A-Za-z0-9]{10,}"
    r"|sk-[A-Za-z0-9]{16,}|AKIA[A-Z0-9]{16}|Bearer\s+[A-Za-z0-9._-]{12,})"
)


class GateError(ValueError):
    """Fail-closed classification, input, or output gate."""


def check_text(text: object) -> str:
    if not isinstance(text, str) or not 3 <= len(text) <= 480:
        raise GateError("Text must be a plain string between 3 and 480 characters")
    if text != text.strip() or any(ord(c) < 32 for c in text):
        raise GateError("Whitespace or control characters are forbidden")
    if any(c in text for c in "<>{}") or EMAIL.search(text) or URL.search(text) or SECRETS.search(text):
        raise GateError("HTML/template markers, URLs, email addresses, and credential-like values are forbidden")
    return text


def read_public_source(path: Path = SOURCE) -> tuple[dict, str]:
    raw = path.read_bytes()
    if len(raw) > 8192:
        raise GateError("Catalog exceeds public translation byte limit")
    try:
        source = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GateError("Catalog must be valid UTF-8 JSON") from exc
    if not isinstance(source, dict) or set(source) != {
        "schema", "source_language", "source_version", "classification", "entries"
    }:
        raise GateError("Unexpected catalog shape")
    if (source["schema"] != "janus.public_i18n.source.v1"
            or source["source_language"] != "en"
            or source["classification"] != "PUBLIC_ONLY"
            or not isinstance(source["source_version"], str)
            or not VERSION.fullmatch(source["source_version"])):
        raise GateError("Catalog source version or classification denied")
    entries = source["entries"]
    if not isinstance(entries, list) or not 1 <= len(entries) <= 12:
        raise GateError("Public catalog has an invalid number of entries")
    seen = set()
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {"id", "text"}:
            raise GateError("Entry must have only id and text")
        key = entry["id"]
        if not isinstance(key, str) or not ENTRY_ID.fullmatch(key) or key in seen:
            raise GateError("Entry id invalid or duplicated")
        seen.add(key)
        check_text(entry["text"])
    return source, hashlib.sha256(raw).hexdigest()


def generate_draft(source: dict, digest: str, lang: str, translate: Callable[[str], str]) -> dict:
    if lang not in MODELS:
        raise GateError("Translation target denied")
    model_id, revision = MODELS[lang]
    texts = {}
    for entry in source["entries"]:
        translated = check_text(translate(entry["text"]))
        texts[entry["id"]] = translated
    return {
        "schema": "janus.public_i18n.translation.v1",
        "classification": "PUBLIC_ONLY",
        "source_version": source["source_version"],
        "source_sha256": digest,
        "language": lang,
        "status": "UNREVIEWED",
        "approved": False,
        "inference": "OFFLINE_CPU_GITHUB_ACTIONS",
        "model": {
            "id": model_id,
            "revision": revision,
            "license": "Apache-2.0",
            "trust_remote_code": False
        },
        "texts": texts
    }


def make_cpu_translator(lang: str) -> Callable[[str], str]:
    """Lazy import so policy/shape checks run before installing/loading a model."""
    if lang not in MODELS:
        raise GateError("Translation target denied")
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    name, revision = MODELS[lang]
    tokenizer = AutoTokenizer.from_pretrained(
        name, revision=revision, trust_remote_code=False
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(
        name, revision=revision, trust_remote_code=False, use_safetensors=False,
        weights_only=True
    ).to("cpu").eval()

    def translate(text: str) -> str:
        inputs = tokenizer(text, return_tensors="pt", truncation=False)
        if inputs["input_ids"].shape[-1] > 384:
            raise GateError("Input exceeds approved model context")
        with torch.inference_mode():
            output = model.generate(**inputs, max_new_tokens=384, do_sample=False, num_beams=4)
        return tokenizer.batch_decode(output, skip_special_tokens=True)[0].strip()

    return translate


def main() -> None:
    parser = argparse.ArgumentParser(description="GitHub-only JANUS public content translation")
    parser.add_argument("--validate-only", action="store_true", help="No model or output created")
    parser.add_argument("--lang", choices=sorted(MODELS))
    parser.add_argument("--output-dir", default="workflow-output")
    args = parser.parse_args()

    source, digest = read_public_source()
    if args.validate_only:
        print(f"VALID PUBLIC_ONLY: {len(source['entries'])} entries; SHA256 {digest}")
        return
    if not args.lang:
        parser.error("--lang required unless --validate-only")
    draft = generate_draft(source, digest, args.lang, make_cpu_translator(args.lang))
    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    output = outdir / f"{args.lang}.json"
    output.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"UNREVIEWED output ready for human review: {output} ({len(draft['texts'])} entries)")


if __name__ == "__main__":
    main()
