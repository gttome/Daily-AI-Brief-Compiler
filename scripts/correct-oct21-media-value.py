"""Bounded Oct 21 media-only correction. Do not reseal content or regenerate art."""
import argparse
import copy
import hashlib
import html
import json
import pathlib
import re
import shutil
import sys

DATE = "2026-10-21"
ROUTES = (
    "index.html",
    "latest.html",
    "latest.md",
    "briefs/2026-10-21/index.html",
    "videos/2026-10-21/general/index.html",
    "videos/2026-10-21/agent-skills/index.html",
    "podcasts/2026-10-21/macron-s-twilight-sudan-market-strike-alberta-vote-updated/index.html",
    "feed.xml",
    "feed.json",
    "data/archive-index.json",
    "data/compiler-feedback-registry.json",
    "briefs-archive/index.html",
)
DISPLAY = set(ROUTES[:7])
PRIMARY = set(ROUTES[:4])
PERMANENT = set(ROUTES[4:7])

def require(condition, description):
    if not condition:
        raise ValueError(description)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def snapshot(root):
    return {str(p.relative_to(root)): digest(p.read_bytes())
            for p in sorted(root.rglob("*")) if p.is_file()}

def literal(text, old, new, description, needed=True):
    require(old and new, "Empty replacement " + description)
    count = text.count(old)
    if needed:
        require(count > 0, "Missing exact " + description)
    return text.replace(old, new)

def metadata_block(item, markdown=False):
    old, new = item["old"], item["new"]
    field = lambda x: "**" + x + ":**" if markdown else "<strong>" + x + ":</strong>"
    separator = "  \n" if markdown else "<br />\n"
    old_labels, new_labels = [], []
    if item["media_kind"] == "video":
        if not markdown:
            old_labels += [(field("Channel"), old["source"])]
            new_labels += [(field("Channel"), new["source"])]
        else:
            old_labels += [(field("Channel"), old["source"])]
            new_labels += [(field("Channel"), new["source"])]
    else:
        old_labels += [(field("Show"), old["source"]), (field("Host / guest"), "Not listed"), (field("Focus"), "Agents for Everyone")]
        new_labels += [(field("Show"), new["source"]), (field("Host / guest"), new["host_guest"]), (field("Focus"), "Agents for Everyone")]
    old_labels += [(field("Date"), item["old_date_label"]), (field("Duration"), item["old_display"])]
    new_labels += [(field("Date"), item["new_date_label"]), (field("Duration"), item["new_display"])]
    return separator.join(a + " " + b for a, b in old_labels), separator.join(a + " " + b for a, b in new_labels)

def patch_display(route, source, revision):
    txt = source
    for item in revision["items"]:
        old, new = item["old"], item["new"]
        if old["title"] not in txt:
            if route in PRIMARY:
                raise ValueError("Missing selected media in main reader " + item["slot"])
            if route in PERMANENT:
                path_slot = "podcast-2" if route.startswith("podcasts/") else ("general" if "/general/" in route else "agent-skills")
                require(item["slot"] != path_slot, "Missing targeted permanent item")
            continue
        for key in ("title", "summary", "why_it_matters", "url"):
            txt = literal(txt, old[key], new[key], route + " " + item["slot"] + " " + key,
                          needed=(key != "why_it_matters" or route not in PERMANENT))
        if route in PRIMARY:
            before, after = metadata_block(item, route.endswith(".md"))
            txt = literal(txt, before, after, route + " media metadata")
            marker = "#general" if item["slot"] == "general" else "#agents-for-non-technical-people" if item["slot"] == "agent-skills" else "#podcast-dab-podcast-2026-10-21-2"
            kind = "Podcast" if item["media_kind"] == "podcast" else "Video"
            nav_before = '<a href="' + marker + '">' + new["title"] + '</a><span>' + kind + " · " + item["old_display"] + "</span>"
            nav_after = '<a href="' + marker + '">' + new["title"] + '</a><span>' + kind + " · " + item["new_display"] + "</span>"
            txt = literal(txt, nav_before, nav_after, route + " media navigation")
            if item["media_kind"] == "podcast":
                txt = literal(txt, '>' + old["source"] + "</a>", '>' + new["source"] + "</a>", route + " podcast link label")
            if route.endswith(".md"):
                # Original the new sources' dates are separate from the Brief's publication date.
                pass
            if item["slot"] == "podcast-2" and route != "latest.md":
                selected_header = '<h3 id="' + item["old_slug"] + '">'
                start = txt.find(selected_header)
                if start != -1:
                    stop = txt.find('<div class="story-feedback"', start)
                    require(stop > start, "Incomplete podcast reader panel")
                    panel = txt[start:stop].replace('<span class="coverage-label">New development</span>',
                                                    '<span class="coverage-label">AI-focused educational replacement</span>')
                    txt = txt[:start] + panel + txt[stop:]
            elif item["slot"] == "podcast-2" and route == "latest.md":
                start = txt.find("### 10. " + new["title"])
                stop = txt.find('<div class="story-feedback"', start)
                require(start >= 0 and stop > start, "Missing Markdown podcast panel")
                panel = txt[start:stop].replace('<span class="coverage-label">New development</span>',
                                                '<span class="coverage-label">AI-focused educational replacement</span>')
                txt = txt[:start] + panel + txt[stop:]
        else:
            # Jekyll's permanent media page does not show Channel in the metadata block.
            if item["media_kind"] == "video":
                before = "<strong>Date:</strong> " + item["old_date_label"] + "<br />\n<strong>Duration:</strong> " + item["old_display"]
                after = "<strong>Date:</strong> " + item["new_date_label"] + "<br />\n<strong>Duration:</strong> " + item["new_display"]
                txt = literal(txt, before, after, route + " permanent video date/runtime")
            else:
                before, after = metadata_block(item, False)
                txt = literal(txt, before, after, route + " permanent podcast metadata")
            txt = literal(txt, '>' + old["source"] + "</a>", '>' + new["source"] + "</a>", route + " permanent publisher label")
            txt = literal(txt, '<span class="coverage-label">New development</span>',
                          '<span class="coverage-label">' +
                          ('Evergreen educational replacement' if item["media_kind"] == "video" else 'AI-focused educational replacement') +
                          '</span>', route + " correction disclosure")
            txt = literal(txt, "<strong>Evidence:</strong> Practitioner Analysis",
                          "<strong>Evidence:</strong> Publisher Authored", route + " truthful evidence class")
            txt = literal(txt, "<strong>Availability:</strong> Not Applicable",
                          "<strong>Availability:</strong> Source available; playback unverified", route + " playback disclosure")
    return txt

def patch_feed_xml(source, revision):
    found = []
    def apply(match):
        original = match.group()
        selected = [x for x in revision["items"] if "<id>" + x["reader_id"] + "</id>" in original]
        if not selected:
            return original
        require(len(selected) == 1, "Nonunique feed entry identity")
        x = selected[0]
        txt = original
        for key in ("title","summary"):
            txt = literal(txt, html.escape(x["old"][key],quote=False),
                          html.escape(x["new"][key],quote=False), "feed.xml " + x["slot"] + key)
        found.append(x["slot"])
        return txt
    result = re.sub(r"<entry\b[^>]*>.*?</entry>", apply, source, flags=re.S)
    require(sorted(found) == sorted(x["slot"] for x in revision["items"]), "Not all 3 feed entries updated exactly once")
    return result

def one_record(array, key, value):
    matches = [x for x in array if x.get(key) == value]
    require(len(matches) == 1, "Nonunique JSON identity " + str(value))
    return matches[0]

def patch_json(route, source, revision):
    data = json.loads(source)
    previous = copy.deepcopy(data)
    for item in revision["items"]:
        old,new = item["old"],item["new"]
        if route == "feed.json":
            collection,key = "items","id"
            record = one_record(data[collection],key,item["reader_id"])
            require(record["title"] == old["title"], "Stale feed JSON title")
            record.update(title=new["title"],summary=new["summary"],tags=[new["source"]])
        elif route == "data/archive-index.json":
            collection,key = "stories","story_id"
            record = one_record(data[collection],key,item["reader_id"])
            require(record["brief_date"] == DATE and record["headline"] == old["title"], "Stale archive record")
            topics = {
                "general":["Language models","Token prediction","Transformers"],
                "agent-skills":["Prompt engineering","Retrieval grounding","Fine-tuning"],
                "podcast-2":["AI literacy","Personalized learning","Critical thinking"],
            }[item["slot"]]
            record.update(headline=new["title"],summary=new["summary"],
                          event_date=new["original_date"],companies=[new["source"]],
                          topics=topics,trends=[],evidence_type="publisher_authored",
                          availability_status="available")
        else:
            require(route == "data/compiler-feedback-registry.json", "Unexpected JSON route")
            collection,key = "items","canonical_reader_id"
            record = one_record(data[collection],key,item["reader_id"])
            require(record["title"] == old["title"], "Stale feedback registry")
            record["title"] = new["title"]
        proof = copy.deepcopy(data)
        for entry in proof[collection]:
            if entry[key] == item["reader_id"]:
                original_record = one_record(previous[collection], key, item["reader_id"])
                entry.clear()
                entry.update(original_record)
        require(proof == previous, "Unrelated JSON records changed: " + route)
    return json.dumps(data,ensure_ascii=False,indent=2) + "\n"

def patch_archive(source, revision):
    used = []
    def apply(match):
        original = match.group()
        selected = [x for x in revision["items"] if 'data-item-id="' + x["reader_id"] + '"' in original]
        if not selected:
            return original
        require(len(selected) == 1, "Archive item ID overlap")
        x=selected[0]
        result=literal(original,x["old"]["title"],x["new"]["title"],"archive title")
        result=literal(result,x["old"]["summary"],x["new"]["summary"],"archive summary")
        used.append(x["slot"])
        return result
    result=re.sub(r"<article\b[^>]*>.*?</article>",apply,source,flags=re.S)
    require(sorted(used)==sorted(x["slot"] for x in revision["items"]),"Archive item cardinality")
    return result

def patch(route, source, revision):
    if route in DISPLAY: return patch_display(route,source,revision)
    if route == "feed.xml": return patch_feed_xml(source,revision)
    if route in ("feed.json","data/archive-index.json","data/compiler-feedback-registry.json"):
        return patch_json(route,source,revision)
    if route == "briefs-archive/index.html": return patch_archive(source,revision)
    raise ValueError("Unallowlisted route " + route)

def correct(revision, source, destination, receipt_path):
    require(revision["edition_date"] == DATE and revision["schema_version"] ==
            "daily-compiler-media-value-correction-v1","Revision identity/schema")
    require(len(revision["items"]) == 3 and
            {x["reader_id"] for x in revision["items"]} ==
            {"dab-video-2026-10-21-general","dab-video-2026-10-21-agent-skills","dab-podcast-2026-10-21-2"},
            "Exact three target item identities")
    require(revision["new_execution_allowed"] is False and revision["preserve_original"] is True,
            "Immutable edition contract")
    require(not destination.exists(), "Refuse overwrite staged destination")
    old_files=snapshot(source)
    require(all(r in old_files for r in ROUTES),"Missing canonical correction route")
    shutil.copytree(source,destination)
    for route in ROUTES:
        data=(source/route).read_text(encoding="utf-8")
        changed=patch(route,data,revision)
        require(changed != data,"Target unchanged: " + route)
        for x in revision["items"]:
            require(x["old"]["title"] not in changed, "Old selected title remains " + route)
        (destination/route).write_text(changed,encoding="utf-8")
    new_files=snapshot(destination)
    require(old_files.keys() == new_files.keys(), "Unexpected published file set changes")
    changed = [r for r in old_files if old_files[r] != new_files[r]]
    require(set(changed) == set(ROUTES), "Unexpected publication scope: " + str(set(changed)^set(ROUTES)))
    immutables=[r for r in old_files if r.startswith("image-jobs/") or pathlib.Path(r).suffix.lower() in
                (".png",".jpg",".jpeg",".webp",".svg",".gif")]
    require(all(old_files[r] == new_files[r] for r in immutables),
            "Immutable job or any image mutated")
    protected=[r for r in old_files if "2026-10-08" in r]
    require(all(old_files[r] == new_files[r] for r in protected),
            "Oct8 public object mutated")
    result={"schema_version":"daily-compiler-media-quality-correction-receipt-v1",
            "edition_date":DATE,
            "correction_id":revision["correction_id"],
            "result":"STAGED_VALIDATED_NOT_LIVE",
            "changed":[{"route":r,"before_sha256":old_files[r],"after_sha256":new_files[r]}
                       for r in changed],
            "unchanged_objects":len(old_files)-len(changed),
            "image_objects_byte_preserved":len([r for r in immutables if not r.startswith("image-jobs/")]),
            "immutable_image_job_objects_preserved":len([r for r in immutables if r.startswith("image-jobs/")]),
            "oct8_objects_preserved":len(protected),
            "source_bundle_modified":False,
            "image_generation_count":0,
            "live_verified":False,
            "playback_verified":False}
    receipt_path.parent.mkdir(parents=True,exist_ok=True)
    receipt_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({k:v for k,v in result.items() if k!="changed"},indent=2))
    return result

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("revision",type=pathlib.Path)
    p.add_argument("source",type=pathlib.Path)
    p.add_argument("destination",type=pathlib.Path)
    p.add_argument("receipt",type=pathlib.Path)
    a=p.parse_args()
    try:
        correct(json.loads(a.revision.read_text()),a.source,a.destination,a.receipt)
    except Exception as exc:
        print("OCT21_MEDIA_CORRECTION_FAILED:",str(exc),file=sys.stderr)
        raise
