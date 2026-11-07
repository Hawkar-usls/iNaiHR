"""Strict unit tests: no models, network, private data or external services."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts import janus_public_translate as engine


def catalog():
    return {
        "schema": "janus.public_i18n.source.v1",
        "source_language": "en",
        "source_version": "public-about-2026-11-07-v1",
        "classification": "PUBLIC_ONLY",
        "entries": [
            {"id": "intro", "text": "This is a public project description."},
            {"id": "privacy", "text": "Graph data stays local to the user."},
        ],
    }


def read(doc):
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "source.json"
        path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        raw = path.read_bytes()
        result, digest = engine.read_public_source(path)
        return result, digest, hashlib.sha256(raw).hexdigest()


class PublicI18nPolicyTest(unittest.TestCase):
    def test_read_exact_allowlisted_catalog_and_digest(self):
        parsed, digest, expected = read(catalog())
        self.assertEqual(parsed["classification"], "PUBLIC_ONLY")
        self.assertEqual(len(parsed["entries"]), 2)
        self.assertEqual(digest, expected)

    def test_deny_unreviewed_private_scope(self):
        doc = catalog()
        doc["classification"] = "INTERNAL"
        with self.assertRaises(engine.GateError):
            read(doc)

    def test_deny_unexpected_fields(self):
        doc = catalog()
        doc["workspace"] = "private"
        with self.assertRaises(engine.GateError):
            read(doc)

    def test_deny_duplicate_ids(self):
        doc = catalog()
        doc["entries"][1]["id"] = "intro"
        with self.assertRaises(engine.GateError):
            read(doc)

    def test_deny_secrets_email_urls_and_markup(self):
        for text in [
            "Please contact person@example.org privately",
            "Public info at https://example.org/secret",
            "Access key is ghp_12345678901234567890",
            "<script>alert('test')</script>",
            "Secret is github_pat_ABCDEFGHIJKLMN",
            "This includes a {template} field",
        ]:
            with self.subTest(text=text), self.assertRaises(engine.GateError):
                engine.check_text(text)

    def test_deny_long_text_and_empty_text(self):
        for text in ["", "A" * 481, " trailing ", "a\nb"]:
            with self.subTest(length=len(text)), self.assertRaises(engine.GateError):
                engine.check_text(text)

    def test_deny_empty_entries(self):
        doc = catalog()
        doc["entries"] = []
        with self.assertRaises(engine.GateError):
            read(doc)

    def test_translation_is_candidate_only_with_full_model_provenance(self):
        doc, digest, _ = read(catalog())
        translated = engine.generate_draft(doc, digest, "uk", lambda t: "UK: " + t)
        self.assertEqual(translated["status"], "UNREVIEWED")
        self.assertFalse(translated["approved"])
        self.assertEqual(translated["source_sha256"], digest)
        self.assertEqual(translated["language"], "uk")
        self.assertEqual(translated["model"]["license"], "Apache-2.0")
        self.assertIn("intro", translated["texts"])
        self.assertEqual(set(translated["texts"]), {"intro", "privacy"})

    def test_deny_unsupported_language(self):
        doc, digest, _ = read(catalog())
        with self.assertRaises(engine.GateError):
            engine.generate_draft(doc, digest, "fr", lambda t: t)

    def test_deny_bad_translation_output(self):
        doc, digest, _ = read(catalog())
        with self.assertRaises(engine.GateError):
            engine.generate_draft(doc, digest, "ru", lambda _: "https://bad.example/")


if __name__ == "__main__":
    unittest.main()
