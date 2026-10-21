"""Regression tests for exact-target Oct21 media correction."""
import copy
import html
import importlib.util
import json
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("oct21media", ROOT / "correct-oct21-media-value.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
REV=json.loads((ROOT.parent/"config/media-revisions/2026-10-21-media-value.json").read_text())

class MediaValueCorrectionTests(unittest.TestCase):
    def test_three_target_identity_and_evidence(self):
        self.assertEqual(len(REV["items"]),3)
        self.assertEqual({x["reader_id"] for x in REV["items"]},
            {"dab-video-2026-10-21-general","dab-video-2026-10-21-agent-skills",
             "dab-podcast-2026-10-21-2"})
        self.assertFalse(REV["new_execution_allowed"])
        for x in REV["items"]:
            self.assertTrue(x["new"]["content_reviewed"])
            self.assertFalse(x["new"]["playback_verified"])
            self.assertNotEqual(x["old"]["url"],x["new"]["url"])

    def test_feed_xml_preserves_previous_edition(self):
        entry=lambda id,title,summary: "<entry><id>"+id+"</id><title>"+html.escape(title,quote=False)+"</title><summary>"+html.escape(summary,quote=False)+"</summary></entry>"
        prior=entry("dab-video-2026-10-20-general","Previous edition video","Leave intact")
        original=prior+"".join(entry(x["reader_id"],x["old"]["title"],x["old"]["summary"]) for x in REV["items"])
        fixed=module.patch_feed_xml(original,REV)
        self.assertTrue(fixed.startswith(prior))
        for x in REV["items"]:
            self.assertIn(html.escape(x["new"]["title"],quote=False),fixed)
            self.assertNotIn(x["old"]["title"],fixed)

    def test_archive_cards_patch_only_targeted(self):
        a=lambda id,title,summary: '<article class="archive-story"><a data-item-id="'+id+'">'+html.escape(title,quote=False)+"</a><p>"+html.escape(summary,quote=False)+"</p></article>"
        prev=a("dab-story-2026-10-20-m01","Prior story","Keep this")
        txt=prev+"".join(a(x["reader_id"],x["old"]["title"],x["old"]["summary"]) for x in REV["items"])
        out=module.patch_archive(txt,REV)
        self.assertTrue(out.startswith(prev))
        self.assertEqual(out.count("<article"),4)

    def test_json_preserves_unrelated_records(self):
        for route,key,collection in [
            ("feed.json","id","items"),
            ("data/archive-index.json","story_id","stories"),
            ("data/compiler-feedback-registry.json","canonical_reader_id","items")
        ]:
            other={key:"old-item", "title":"Another article","summary":"Do not change","headline":"Other","brief_date":"2026-10-20"}
            items=[]
            for x in REV["items"]:
                r={key:x["reader_id"],"title":x["old"]["title"],
                   "summary":x["old"]["summary"],"headline":x["old"]["title"],
                   "brief_date":"2026-10-21","event_date":"2026-10-20",
                   "companies":[x["old"]["source"]],"tags":["Old"],"topics":[],"trends":[]}
                items.append(r)
            data={collection:[other]+items}
            out=json.loads(module.patch_json(route,json.dumps(data),REV))
            self.assertEqual(out[collection][0],other)
            for x in REV["items"]:
                record=next(z for z in out[collection] if z[key]==x["reader_id"])
                self.assertNotEqual(record["headline"] if route == "data/archive-index.json" else record["title"], x["old"]["title"])

    def test_requires_unique_selected_feed_entries(self):
        with self.assertRaises(ValueError):
            module.patch_feed_xml("<entry><id>something-else</id></entry>", REV)

if __name__=="__main__":
    unittest.main()
