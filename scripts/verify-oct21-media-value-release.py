"""Verify actual live media-only Pages bytes against staged Oct21 correction."""
import argparse
import datetime
import hashlib
import json
import pathlib
import time
import urllib.error
import urllib.request

ROOT="https://gttome.github.io/Daily-AI-Brief-Compiler/"

def sha(b):
    return hashlib.sha256(b).hexdigest()

def verify(receipt_path, output_path):
    data=json.loads(receipt_path.read_text())
    assert data["edition_date"]=="2026-10-21" and len(data["changed"])==12
    checked=[]
    for row in data["changed"]:
        url=ROOT+row["route"]
        last=None
        for attempt in range(8):
            try:
                request=urllib.request.Request(url,headers={"Cache-Control":"no-cache","User-Agent":"Daily-Brief-Oct21-Media-QA"})
                with urllib.request.urlopen(request,timeout=30) as response:
                    body=response.read()
                    code=response.status
                if code==200 and sha(body)==row["after_sha256"]:
                    checked.append({"route":row["route"],"status":200,"sha256":sha(body),"bytes":len(body)})
                    break
                last="Unexpected "+str(code)+", hash "+sha(body)
            except Exception as err:
                last=str(err)
            if attempt<7: time.sleep(7)
        else:
            raise RuntimeError("LIVE_MEDIA_CORRECTION_UNVERIFIED "+url+" "+str(last))
    assert len(checked)==12 and data["source_bundle_modified"] is False
    receipt={"schema_version":"daily-compiler-media-quality-live-receipt-v1",
             "result":"LIVE_MEDIA_CORRECTION_VERIFIED","edition_date":"2026-10-21",
             "correction_id":data["correction_id"],
             "verified_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
             "verified_routes":checked,
             "unchanged_objects":data["unchanged_objects"],
             "image_objects_byte_preserved":data["image_objects_byte_preserved"],
             "immutable_image_job_objects_preserved":data["immutable_image_job_objects_preserved"],
             "oct8_objects_preserved_by_exact_diff":data["oct8_objects_preserved"],
             "source_bundle_modified":False,
             "image_generation_count":0,
             "playback_verified":False,
             "verification_scope":"Twelve actual public route HTTP 200 and exact byte hashes; no video/audio playback claim."}
    output_path.parent.mkdir(parents=True,exist_ok=True)
    output_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"result":receipt["result"],"route_count":len(checked)},indent=2))

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("staged_receipt",type=pathlib.Path)
    ap.add_argument("output",type=pathlib.Path)
    args=ap.parse_args()
    verify(args.staged_receipt,args.output)
