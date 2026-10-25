#!/usr/bin/env python3
"""Correct exactly one repeated Oct 25 published video, preserving every immutable image job and unrelated item."""
import argparse
import copy
import hashlib
import html
import json
import pathlib
import re
import shutil
import sys

DATE = "2026-10-25"
ID = "dab-video-2026-10-25-agent-skills"
ROUTES = (
    "index.html", "latest.html", "latest.md", "briefs/2026-10-25/index.html",
    "videos/2026-10-25/agent-skills/index.html", "feed.xml", "feed.json",
    "data/archive-index.json", "data/compiler-feedback-registry.json",
    "briefs-archive/index.html",
)
READER = set(ROUTES[:5])
JSON_ROUTES = set(ROUTES[6:9])

def require(ok, reason):
    if not ok:
        raise ValueError("OCT25_VIDEO_CORRECTION: " + reason)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def snapshot(root):
    return {str(f.relative_to(root)): sha(f.read_bytes())
            for f in sorted(root.rglob("*")) if f.is_file()}

def exact(text, old, new, label, minimum=1):
    require(isinstance(old,str) and old and isinstance(new,str) and new,
            label + " nonempty replacement")
    n=text.count(old)
    require(n>=minimum, label + " old token absent: "+str(n))
    return text.replace(old,new)

def patch_reader(route, body, rev):
    old,new=rev["old"],rev["new"]
    require(body.count(old["url"])==1, route + " exactly one old source link")
    require(body.count(old["date_label"])==1, route + " old date cardinality")
    require(body.count(old["title"])>=1, route + " old title missing")
    require(body.count(old["summary"])>=1, route + " old summary missing")
    require(body.count(old["why_it_matters"])>=1, route + " old why missing")
    for key in ("title","summary","why_it_matters","url"):
        body=exact(body,old[key],new[key],route+" "+key)
    body=exact(body,old["date_label"],new["date_label"],route+" date")
    body=exact(body,old["duration"],new["duration"],route+" duration")
    for field in ("title","summary","why_it_matters","url","date_label"):
        require(old[field] not in body,route+" obsolete "+field+" remains")
    require(new["url"] in body and new["title"] in body,
            route+" replacement source/title not visible")
    return body

def patch_atom(body, rev):
    blocks=list(re.finditer(r"<entry\b[^>]*>.*?</entry>",body,re.S))
    matched=[m for m in blocks if "<id>"+ID+"</id>" in m.group()]
    require(len(matched)==1,"Atom canonical video ID must occur in exactly one entry")
    m=matched[0]
    item=m.group()
    for field in ("title","summary"):
        old=html.escape(rev["old"][field],quote=False)
        new=html.escape(rev["new"][field],quote=False)
        item=exact(item,old,new,"Atom "+field)
    return body[:m.start()]+item+body[m.end():]

def unique(rows,key,value,label):
    result=[r for r in rows if r.get(key)==value]
    require(len(result)==1,label+" unique canonical item")
    return result[0]

def patch_json(route,text,rev):
    data=json.loads(text)
    old,new=rev["old"],rev["new"]
    before=copy.deepcopy(data)
    if route=="feed.json":
        field="items";identity="id"
        row=unique(data[field],identity,ID,"JSON feed")
        require(row["title"]==old["title"],"stale JSON feed title")
        row["title"]=new["title"];row["summary"]=new["summary"]
        row["tags"]=[new["source"]]
    elif route=="data/archive-index.json":
        field="stories";identity="story_id"
        row=unique(data[field],identity,ID,"archive")
        require(row["brief_date"]==DATE and row["content_type"]=="Video" and
                row["headline"]==old["title"],"stale archive target")
        row["headline"]=new["title"];row["summary"]=new["summary"]
        row["event_date"]=new["original_date"]
        row["topics"]=["Cross-system integration","Agent permissions","Governed automation"]
        row["companies"]=[new["source"]]
    elif route=="data/compiler-feedback-registry.json":
        field="items";identity="canonical_reader_id"
        row=unique(data[field],identity,ID,"feedback")
        require(row["title"]==old["title"],"stale feedback target")
        row["title"]=new["title"]
    else:
        raise ValueError("Unexpected JSON route "+route)
    require([r for r in before[field] if r.get(identity)!=ID] ==
            [r for r in data[field] if r.get(identity)!=ID],
            "Unrelated "+route+" items changed")
    return json.dumps(data,ensure_ascii=False,indent=2)+"\n"

def patch_archive(body,rev):
    old,new=rev["old"],rev["new"]
    hits=[]
    def update(m):
        item=m.group()
        if 'data-item-id="'+ID+'"' not in item:
            return item
        hits.append(1)
        item=exact(item,old["title"],new["title"],"archive card title")
        item=exact(item,html.escape(old["summary"],quote=True),
                   html.escape(new["summary"],quote=True),"archive card summary")
        return item
    patched=re.sub(r"<article\b[^>]*>.*?</article>",update,body,flags=re.S)
    require(len(hits)==1,"exactly one Oct25 archive card repaired")
    return patched

def patch(route,body,rev):
    if route in READER: return patch_reader(route,body,rev)
    if route=="feed.xml": return patch_atom(body,rev)
    if route in JSON_ROUTES: return patch_json(route,body,rev)
    if route=="briefs-archive/index.html": return patch_archive(body,rev)
    raise ValueError("Unallowlisted route "+route)

def correct(rev,source,destination,receipt):
    require(rev["schema_version"]=="daily-compiler-published-video-correction-v1" and
            rev["edition_date"]==DATE and rev["reader_id"]==ID,"revision identity")
    require(rev["preserve_original"] is True and rev["new_execution_allowed"] is False
            and rev["protected_pr_required"] is True and rev["live_verification_required"] is True,
            "immutable published edition safeguards")
    old,new=rev["old"],rev["new"]
    require(old["url"]!=new["url"] and old["title"]!=new["title"],"actual replacement required")
    require(new["duration_seconds"]>=180 and new["duration_seconds"]<=1200,
            "instructional runtime out of bounds")
    require(new["content_reviewed"] is True and new["publication_evidence"].startswith("https://"),
            "publisher educational evidence")
    require(not destination.exists(),"destination already exists")
    before=snapshot(source)
    require(all(p in before for p in ROUTES),"missing source routes")
    original_job=(source/"image-jobs/2026-10-25/job.json").read_bytes()
    require(sha(original_job)==rev["immutable_image_job_sha256"],
            "published image job changed: do not correct against another binding")
    bound=json.loads(original_job)
    require(bound["source"]["bundle_sha256"]==rev["source_bundle_sha256"],
            "immutable source bundle changed")
    require(old["url"]!=new["url"],"cannot reuse original source")
    archive=json.loads((source/"data/archive-index.json").read_text())
    require(not any(x.get("headline","").strip().casefold()==new["title"].casefold()
                    for x in archive["stories"] if x.get("brief_date","")<DATE),
            "replacement video headline already published in full archive")
    # The historical October 17 duplicate remains untouched in both source and output.
    historical="videos/2026-10-17/agent-skills/index.html"
    require(historical in before,"missing original duplicate evidence")
    shutil.copytree(source,destination)
    for route in ROUTES:
        original=(source/route).read_text(encoding="utf-8")
        changed=patch(route,original,rev)
        require(changed!=original,"no change in "+route)
        (destination/route).write_text(changed,encoding="utf-8")
    after=snapshot(destination)
    require(before.keys()==after.keys(),"published history file set changed")
    changed=[p for p in before if before[p]!=after[p]]
    require(set(changed)==set(ROUTES),"unexpected change scope "+str(set(changed)^set(ROUTES)))
    immutable=[p for p in before if p.startswith("image-jobs/") or
               pathlib.Path(p).suffix.lower() in (".png",".jpg",".jpeg",".webp",".gif",".svg")]
    require(all(before[p]==after[p] for p in immutable),"image byte or image-job mutation")
    require(all(before[p]==after[p] for p in before if "2026-10-08" in p),
            "October 8 protected historical bytes changed")
    require(before[historical]==after[historical],"October 17 original video changed")
    result={
        "schema_version":"daily-compiler-video-correction-receipt-v1",
        "edition_date":DATE,"correction_id":rev["correction_id"],"result":"STAGED_VALIDATED_NOT_LIVE",
        "changed":[{"route":p,"before_sha256":before[p],"after_sha256":after[p]} for p in changed],
        "unchanged_objects":len(before)-len(changed),
        "immutable_image_objects_preserved":len(immutable),
        "oct8_objects_preserved":sum("2026-10-08" in p for p in before),
        "original_duplicate_preserved":True,"source_bundle_modified":False,
        "image_generation_count":0,"live_verified":False,
        "playback_qualification_requires_separate_gate":True
    }
    receipt.parent.mkdir(parents=True,exist_ok=True)
    receipt.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"result":result["result"],"changed":len(changed)},indent=2))
    return result

if __name__=="__main__":
    p=argparse.ArgumentParser()
    for n in ("revision","source","destination","receipt"):p.add_argument(n,type=pathlib.Path)
    a=p.parse_args()
    try:
        correct(json.loads(a.revision.read_text()),a.source,a.destination,a.receipt)
    except Exception as exc:
        print("OCT25_VIDEO_CORRECTION_FAILED",str(exc),file=sys.stderr)
        raise
