#!/usr/bin/env python3
"""Verify all ten October 25 video-correction routes against actual public GitHub Pages bytes."""
import argparse
import datetime
import hashlib
import json
import pathlib
import time
import urllib.request

ROOT="https://gttome.github.io/Daily-AI-Brief-Compiler/"

def verify(source,out):
    data=json.loads(source.read_text())
    assert data["edition_date"]=="2026-10-25" and len(data["changed"])==10
    checked=[]
    for row in data["changed"]:
        url=ROOT+row["route"]
        error=None
        for attempt in range(9):
            try:
                request=urllib.request.Request(url,headers={"Cache-Control":"no-cache","User-Agent":"DailyAI-VideoCorrection/1.0"})
                with urllib.request.urlopen(request,timeout=25) as r:
                    raw=r.read()
                    assert r.status==200
                sha=hashlib.sha256(raw).hexdigest()
                if sha==row["after_sha256"]:
                    checked.append({"route":row["route"],"status":200,"sha256":sha,"bytes":len(raw)})
                    break
                error="SHA mismatch "+sha
            except Exception as e:
                error=str(e)
            if attempt<8:time.sleep(8)
        else:
            raise RuntimeError("CORRECTED_VIDEO_LIVE_READBACK_FAILED "+url+": "+str(error))
    assert len(checked)==10 and data["source_bundle_modified"] is False
    result={"schema_version":"daily-compiler-video-correction-live-receipt-v1",
        "result":"LIVE_VIDEO_CORRECTION_VERIFIED","edition_date":"2026-10-25",
        "correction_id":data["correction_id"],"verified_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "verified_routes":checked,"source_bundle_modified":False,"image_generation_count":0,
        "historical_video_preserved":data["original_duplicate_preserved"],
        "playback_evidence":"Publisher-hosted player certified separately in protected preview gate",
        "scope":"Ten actual HTTP 200 and exact SHA-256 reader/search/feed/feedback bytes; immutable image job unchanged."}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"result":result["result"],"routes":len(checked)}))

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("staged_receipt",type=pathlib.Path)
    p.add_argument("output",type=pathlib.Path)
    a=p.parse_args()
    verify(a.staged_receipt,a.output)
