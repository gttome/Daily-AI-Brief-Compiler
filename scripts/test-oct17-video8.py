import html
import importlib.util
import json
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('correction',ROOT/'correct-oct17-video8.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
REV=json.loads((ROOT.parent/'config/media-revisions/2026-10-17-video8.json').read_text())
O,N=REV['original'],REV['replacement']['video']

class MediaCorrectionTests(unittest.TestCase):
    def test_exact_anchor_keeps_other_video(self):
        s=('<a href="https://www.youtube.com/watch?v=other">Watch on YouTube</a>'
           '<h3>'+html.escape(O['title'])+'</h3><strong>Date:</strong> October 7, 2026'
           '<p><strong>Summary:</strong> '+O['summary']+'</p>'
           '<p><strong>Why it matters:</strong> '+O['why_it_matters']+'</p>'
           '<a href="'+O['url']+'" target="_blank">Watch on YouTube</a>7:59')
        out=m.patch_text('index.html',s,REV)
        self.assertIn('watch?v=other">Watch on YouTube',out)
        self.assertNotIn(O['url'],out)
        self.assertIn(N['summary'],out)
        self.assertIn('March 17, 2025',out)
        self.assertIn(REV['reader_note'],out)
    def test_feed_previous_editions_unchanged(self):
        record={'id':m.TARGET,'title':O['title'],'summary':O['summary'],'tags':[O['source']]}
        previous={**record,'id':'dab-video-2026-10-16-agent-skills'}
        out=json.loads(m.patch_text('feed.json',json.dumps({'items':[previous,record]}),REV))
        self.assertEqual(out['items'][0],previous)
        self.assertEqual(out['items'][1]['title'],N['title'])
    def test_xml_only_selected_entry(self):
        entry=lambda id:'<entry><id>'+id+'</id><title>'+html.escape(O['title'],quote=False)+'</title><summary>'+O['summary']+'</summary></entry>'
        old=entry('dab-video-2026-10-16-agent-skills')
        out=m.patch_text('feed.xml',old+entry(m.TARGET),REV)
        self.assertTrue(out.startswith(old))
        self.assertEqual(out.count(N['title']),1)
    def test_wrong_missing_duplicate_target_fail(self):
        with self.assertRaises(ValueError):m.patch_text('index.html','Wrong video',REV)
        with self.assertRaises(ValueError):m.patch_text('feed.json','{"items":[]}',REV)
        with self.assertRaises(ValueError):m.patch_text('feed.json',json.dumps({'items':[{'id':m.TARGET},{'id':m.TARGET}]}),REV)
    def test_unknown_file_rejected(self):
        with self.assertRaises(ValueError):m.patch_text('briefs/2026-10-16/index.html','{}',REV)

if __name__=='__main__':unittest.main()
