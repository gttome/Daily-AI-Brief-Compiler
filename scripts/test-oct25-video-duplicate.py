#!/usr/bin/env python3
"""Isolated synthetic tests; full preserved-site test runs in the protected PR preview."""
import importlib.util
import json
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location("video_fix",ROOT/"scripts/correct-oct25-video-duplicate.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
REV=json.loads((ROOT/"config/media-revisions/2026-10-25-video-duplicate.json").read_text())

class VideoCorrectionTests(unittest.TestCase):
    def test_identity(self):
        self.assertEqual(REV["reader_id"],mod.ID)
        self.assertEqual(REV["edition_date"],mod.DATE)
        self.assertNotEqual(REV["old"]["url"],REV["new"]["url"])
        self.assertTrue(REV["new"]["publication_evidence"].startswith("https://www.linkedin.com/pulse/putting-ai-work-across-industries-ibm-"))
        self.assertTrue(3<=REV["new"]["duration_seconds"]/60<=20)
    def test_atom_changes_only_canonical_id(self):
        o=REV["old"];n=REV["new"]
        prior="<entry><title>"+o["title"]+"</title><id>dab-video-2026-10-17-agent-skills</id><summary>"+o["summary"]+"</summary></entry>"
        target="<entry><title>"+o["title"]+"</title><id>"+mod.ID+"</id><summary>"+o["summary"]+"</summary></entry>"
        val=mod.patch_atom(prior+target,REV)
        self.assertIn(prior,val)
        self.assertIn("<title>"+n["title"]+"</title><id>"+mod.ID+"</id>",val)
    def test_json_preserves_old_edition(self):
        old=REV["old"];other={"id":"dab-video-2026-10-17-agent-skills","title":old["title"],"summary":old["summary"],"tags":[old["source"]]}
        cur={"id":mod.ID,"title":old["title"],"summary":old["summary"],"tags":[old["source"]]}
        out=json.loads(mod.patch_json("feed.json",json.dumps({"items":[other,cur]}),REV))
        self.assertEqual(out["items"][0],other)
        self.assertEqual(out["items"][1]["title"],REV["new"]["title"])
    def test_archive_card_no_prior_rewrite(self):
        old=REV["old"]
        p='<article class="archive-story"><a data-item-id="dab-video-2026-10-17-agent-skills">'+old["title"]+'</a><p>'+old["summary"]+'</p></article>'
        c='<article class="archive-story"><a data-item-id="'+mod.ID+'">'+old["title"]+'</a><p>'+old["summary"]+'</p></article>'
        out=mod.patch_archive(p+c,REV)
        self.assertIn(p,out)
        self.assertIn(REV["new"]["title"],out)
    def test_missing_target_fails(self):
        with self.assertRaises(ValueError):
            mod.patch_atom("<entry><id>different</id></entry>",REV)

if __name__=="__main__":
    unittest.main()
