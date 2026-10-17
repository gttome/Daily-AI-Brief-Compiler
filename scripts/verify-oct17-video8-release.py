"""Read back deployed bytes; emit a truthful receipt outside the published site."""
import datetime
import hashlib
import json
import os
import pathlib
import sys
import time
import urllib.request

BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/'

def sha(data): return hashlib.sha256(data).hexdigest()

def readback(route, expected):
    url=BASE+route+'?video-replacement='+os.environ['GITHUB_SHA'][:12]
    last=None
    for attempt in range(8):
        try:
            req=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'Daily-Compiler-media-correction-verifier'})
            with urllib.request.urlopen(req,timeout=30) as r:
                actual=r.read();status=r.status
            if status==200 and sha(actual)==expected:
                return {'route':route,'http_status':status,'sha256':expected,'match':True}
            last=f'HTTP {status}; bytes {len(actual)}; actual {sha(actual)}'
        except Exception as e: last=str(e)
        time.sleep(2)
    raise RuntimeError('Live correction mismatch '+route+': '+str(last))

receipt_path=pathlib.Path(sys.argv[1])
patched=pathlib.Path(sys.argv[2])
history=pathlib.Path(sys.argv[3])
receipt=json.loads(receipt_path.read_text())
playback=json.loads(pathlib.Path('build/video-playback.json').read_text())
if playback['result']!='FULL_EPISODE_PUBLIC_PLAYBACK_PASS' or playback['signed_in'] is not False:
    raise RuntimeError('Public full-episode playback evidence missing')
if not (477<=playback['after']['duration']<=480 and playback['after']['time']>playback['before']['time']+1):
    raise RuntimeError('Invalid playback observation')
usage=json.loads(pathlib.Path('docs/after-action/usage/2026-10-16.json').read_text())
if usage['work_usage_percent']!=8 or usage['edition_date']!='2026-10-17':
    raise RuntimeError('Owner usage input changed')
checks=[]
for item in receipt['changed']:
    if sha((patched/item['route']).read_bytes())!=item['after_sha256']:
        raise RuntimeError('Staged bytes changed')
    checks.append(readback(item['route'],item['after_sha256']))
release=json.loads((history/'site/image-jobs/2026-10-17/release.json').read_text())
if len(release['images'])!=6:raise RuntimeError('Wrong image count')
image_checks=[readback(i['route'],i['sha256']) for i in release['images']]
receipt.update(result='LIVE_REPLACEMENT_VERIFIED',live_verification=checks,
    six_accepted_live_images=image_checks,public_playback=playback,
    verified_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    protected_main_sha=os.environ['GITHUB_SHA'],before_history_head=os.environ['HISTORY_HEAD'],
    actions_run_url='https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/'+os.environ['GITHUB_RUN_ID'],
    owner_usage_record_sha256=sha(pathlib.Path('docs/after-action/usage/2026-10-16.json').read_bytes()),
    owner_usage_percent_preserved=usage['work_usage_percent'])
receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
print('LIVE_MEDIA_REPLACEMENT_VERIFIED',json.dumps(receipt,indent=2))
