import test from 'node:test';
import assert from 'node:assert/strict';
import {applyD0Activation} from '../image-capsules/activation-apply.mjs';

test('activation apply fails before mutation while current formal proof set is incomplete',()=>{
  assert.throws(()=>applyD0Activation({repoRoot:'.',activatedAt:'2026-10-07T00:00:00Z'}),/d0_activation_not_ready/);
});
