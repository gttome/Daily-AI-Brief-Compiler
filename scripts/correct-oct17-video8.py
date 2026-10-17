"""One bounded post-publication media correction; never rebuild an edition."""
import argparse
import copy
import hashlib
import html
import json
import pathlib
import re
import shutil
import sys

EDITION = '2026-10-17'
TARGET = 'dab-video-2026-10-17-agent-skills'
ROUTES = (
    'index.html', 'latest.html', 'latest.md',
    'briefs/2026-10-17/index.html',
    'videos/2026-10-17/agent-skills/index.html',
    'feed.xml', 'feed.json', 'data/archive-index.json',
    'data/compiler-feedback-registry.json', 'briefs-archive/index.html',
)
PRIMARY = ROUTES[:5]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def snapshot(root):
    return {str(p.relative_to(root)): sha(p.read_bytes())
            for p in sorted(root.rglob('*')) if p.is_file()}

def require(test, message):
    if not test:
        raise ValueError(message)

def replace_content(text, old, new):
    for key in ('title', 'summary', 'why_it_matters'):
        for escaped in (False, True):
            a, b = old[key], new[key]
            if escaped:
                a, b = html.escape(a, quote=False), html.escape(b, quote=False)
            text = text.replace(a, b)
    return text

def replace_selected_block(text, pattern, marker, old, new):
    changed = []
    def apply(match):
        original = match.group(0)
        if marker not in original:
            return original
        require(old['title'].split(':')[0] in original, 'Selected block lacks old title')
        result = replace_content(original, old, new)
        require(result != original, 'Selected block unchanged')
        changed.append(True)
        return result
    result = re.sub(pattern, apply, text, flags=re.S)
    require(len(changed) == 1, f'Expected one selected block; got {len(changed)}')
    return result

def selected_record(data, collection, key):
    values = data.get(collection)
    require(isinstance(values, list), 'Missing collection ' + collection)
    found = [i for i, value in enumerate(values) if value.get(key) == TARGET]
    require(len(found) == 1, 'Nonunique target in ' + collection)
    return found[0], values[found[0]]

def patch_text(route, text, revision):
    old, new = revision['original'], revision['replacement']['video']
    if route in PRIMARY:
        require(old['url'] in text and old['summary'] in text, 'Wrong primary target: ' + route)
        # Change only the exact unavailable source anchor, not video #7's YouTube link.
        source_pattern = r'(<a\b[^>]*href=")' + re.escape(old['url']) + r'("[^>]*>).*?(</a>)'
        text, count = re.subn(source_pattern,
            lambda m: m[1] + new['url'] + m[2] + 'Watch on IBM AI Academy' + m[3], text, flags=re.S)
        require(count == 1, 'Expected one old source anchor: ' + route)
        text = replace_content(text, old, new)
        text = text.replace(old['source'], new['source'])
        text = text.replace(old['heading_id'], new['heading_id'])
        text = text.replace('7:59', '7:58')
        # The source date is not the Brief's own edition/publication date.
        if route.endswith('.md'):
            date_old = '**Date:** October 7, 2026'
            date_new = '**Date:** March 17, 2025'
            needle = '**Why it matters:** ' + new['why_it_matters']
            replacement = needle + '\n\n**Replacement note:** ' + revision['reader_note']
        else:
            date_old = '<strong>Date:</strong> October 7, 2026'
            date_new = '<strong>Date:</strong> March 17, 2025'
            needle = '<p><strong>Why it matters:</strong> ' + html.escape(new['why_it_matters'], quote=False) + '</p>'
            replacement = needle + '\n<p class="media-replacement-note"><strong>Replacement note:</strong> ' + html.escape(revision['reader_note'], quote=False) + '</p>'
        require(text.count(date_old) == 1, 'Nonunique original source date: ' + route)
        require(text.count(needle) == 1, 'Nonunique why section: ' + route)
        text = text.replace(date_old, date_new).replace(needle, replacement)
        require(old['url'] not in text and 'Production Monitoring with Codex' not in text, 'Stale primary video')
        require(text.count(new['url']) == 1, 'Replacement link mismatch')
        return text
    if route == 'feed.xml':
        return replace_selected_block(text, r'<entry\b[^>]*>.*?</entry>', '<id>' + TARGET + '</id>', old, new)
    if route == 'briefs-archive/index.html':
        return replace_selected_block(text, r'<article\b[^>]*>.*?</article>', 'data-item-id="' + TARGET + '"', old, new)
    data = json.loads(text)
    before = copy.deepcopy(data)
    if route == 'feed.json':
        collection, key = 'items', 'id'
        i, record = selected_record(data, collection, key)
        require(record['title'] == old['title'] and record['summary'] == old['summary'], 'Unexpected feed source')
        record.update(title=new['title'], summary=new['summary'], tags=[new['source']])
    elif route == 'data/archive-index.json':
        collection, key = 'stories', 'story_id'
        i, record = selected_record(data, collection, key)
        require(record['brief_date'] == EDITION and record['headline'] == old['title'], 'Unexpected archive source')
        record.update(headline=new['title'], summary=new['summary'], event_date=new['original_date'], companies=[new['source']], topics=new['topics'], trends=[])
    elif route == 'data/compiler-feedback-registry.json':
        collection, key = 'items', 'canonical_reader_id'
        i, record = selected_record(data, collection, key)
        require(record['title'] == old['title'], 'Unexpected feedback source')
        record['title'] = new['title']
    else:
        raise ValueError('Unallowlisted route ' + route)
    # An aggregate may contain previous editions; assert only this one record differs.
    proof = copy.deepcopy(data)
    proof[collection][i] = before[collection][i]
    require(proof == before, 'Unexpected unrelated JSON change')
    return json.dumps(data, ensure_ascii=False, indent=2) + '\n'

def patch_display_text(route, text, revision):
    """Revision 2 corrects only stale source-classification labels after release."""
    new = revision['replacement']['video']
    if route == 'videos/2026-10-17/agent-skills/index.html':
        require(new['url'] in text and new['summary'] in text, 'Replacement is not already present')
        replacements = {
            '<span class="coverage-label">New development</span>': '<span class="coverage-label">Evergreen replacement</span>',
            '<strong>Topics:</strong><br />': '<strong>Topics:</strong> AI assistants, Agent adoption, Knowledge work<br />',
            '<strong>Evidence:</strong> Practitioner Analysis': '<strong>Evidence:</strong> Publisher Authored',
            '<strong>Availability:</strong> Not Applicable': '<strong>Availability:</strong> Public playback verified',
        }
        for old, updated in replacements.items():
            require(text.count(old) == 1, 'Unexpected classification label: ' + old)
            text = text.replace(old, updated)
        return text
    require(route == 'data/archive-index.json', 'Unallowlisted display-label target')
    data = json.loads(text)
    before = copy.deepcopy(data)
    i, record = selected_record(data, 'stories', 'story_id')
    require(record['headline'] == new['title'] and record['event_date'] == new['original_date'], 'Archive replacement is not current')
    require(record['evidence_type'] == 'practitioner_analysis' and record['availability_status'] == 'not_applicable', 'Unexpected archive classification')
    record.update(evidence_type='publisher_authored', availability_status='available')
    proof = copy.deepcopy(data)
    proof['stories'][i] = before['stories'][i]
    require(proof == before, 'Unrelated archive record changed')
    return json.dumps(data, ensure_ascii=False, indent=2) + '\n'

def correct(source, destination, revision, receipt_path):
    require(revision['schema_version'] == 'daily-compiler-post-publication-correction-v1', 'Invalid revision schema')
    require(revision['correction_type'] == 'replace_video' and revision['edition_date'] == EDITION, 'Invalid correction scope')
    require(revision['target'] == {'index': 1, 'reader_item_id': TARGET}, 'Invalid media target')
    require(revision['preserve_original'] is True and revision['new_execution_allowed'] is False, 'Invalid preservation contract')
    require(revision['replacement']['video']['duration_seconds'] == 478, 'Unverified replacement duration')
    require(not destination.exists(), 'Destination must be a fresh output directory')
    targets = ('videos/2026-10-17/agent-skills/index.html', 'data/archive-index.json') if revision.get('display_label_revision') == 2 else ROUTES
    before = snapshot(source)
    require(all(p in before for p in targets), 'Missing correction target')
    shutil.copytree(source, destination)
    for route in targets:
        original = (source / route).read_text(encoding='utf-8')
        output = (patch_display_text if revision.get('display_label_revision') == 2 else patch_text)(route, original, revision)
        require(output != original, 'Unchanged target ' + route)
        (destination / route).write_text(output, encoding='utf-8')
    after = snapshot(destination)
    require(before.keys() == after.keys(), 'Unexpected file addition/deletion')
    changed = [r for r in before if before[r] != after[r]]
    require(set(changed) == set(targets), 'Changes escaped exact revision allowlist')
    images = [r for r in before if pathlib.Path(r).suffix.lower() in ('.png','.jpg','.jpeg','.webp','.svg','.gif')]
    jobs = [r for r in before if r.startswith('image-jobs/')]
    require(all(before[r] == after[r] for r in images + jobs), 'Image or immutable job changed')
    receipt = {'schema_version': 'daily-compiler-media-only-correction-receipt-v1',
        'correction_id': revision['correction_id'], 'edition_date': EDITION,
        'result': 'LOCAL_PATCH_VALIDATED_NOT_YET_PUBLISHED', 'files_changed': len(changed),
        'changed': [{'route': r, 'before_sha256': before[r], 'after_sha256': after[r]} for r in changed],
        'unchanged_objects': len(before)-len(changed), 'image_objects_byte_preserved': len(images),
        'immutable_image_job_objects_preserved': len(jobs),
        'original_url': revision['original']['url'], 'replacement_url': revision['replacement']['video']['url'],
        'original_source_bundle_modified': False, 'new_execution_created': False,
        'owner_usage_percent_preserved': 8, 'live_verification': 'PENDING'}
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))
    return receipt

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('revision', type=pathlib.Path)
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('destination', type=pathlib.Path)
    parser.add_argument('receipt', type=pathlib.Path)
    args = parser.parse_args()
    try:
        correct(args.source, args.destination, json.loads(args.revision.read_text()), args.receipt)
    except Exception as error:
        print('MEDIA_CORRECTION_FAILED:', error, file=sys.stderr)
        raise
