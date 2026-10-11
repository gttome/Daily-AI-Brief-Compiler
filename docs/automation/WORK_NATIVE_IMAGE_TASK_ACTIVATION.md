# Work-native Premium Image Schedule — Activation Procedure

**Owner authorization:** October 10, 2026. **Status:** Work-native creation/qualification required; this file is NOT an activation receipt.  
**Repository boundary:** `gttome/Daily-AI-Brief-Compiler` only. Never write to `gttome/Daily-AI-Brief`.  
**Production recurrence:** 21:15 `America/Chicago`, beginning Sunday October 11, 2026. Every scheduled evening targets **the next Chicago calendar day**. The first target is **2026-10-12**.

## The specific platform boundary

OpenAI documents recurring cloud Work tasks, but the ordinary ChatGPT scheduled-task create/update action does **not** supply a field to select/verify the saved Work execution mode. Putting “Work” in an ordinary task's prompt does not bind Work. The new recurring task **must be created from an actual Work-selected conversation**, using Work Cloud, Image Creation and the connected GitHub account. A GitHub PR, code test, manually opened chat or task title does not prove that a scheduled execution has those capabilities.

A previous task `6acac88cff048191ba02e5b2bcb3becb` was assigned a bounded **one-time nonpublishing diagnostic** on October 10. It must NOT be promoted or mistaken for a Work-native recurring task. Its original recurring 21:15 configuration was superseded by that diagnostic. Do not enable any duplicate daily image executor.

## One Work-session implementation assignment

Use this document together with:
- `docs/automation/TWO_TASK_DAILY_RUNBOOK.md`
- `contracts/automation/two-task-operation.json`
- `contracts/automation/recurring-image-authorization.json`
- `docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md`
- `docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md`
- `EXTERNAL_APP_HANDOFF_REV8.md`
- `docs/external-app/Perfect_Image_Specification.md`, `docs/external-app/Image_Variation_After_Action.md`
- historical selected Revision 7 docs for the uncompromised quality/release baseline.

**Create exactly one new recurring production Image task inside Work** with these parameters:

| Field | Required |
|---|---|
| Title | Daily Brief Premium Images — Work |
| Mode | Genuine cloud Work; NOT ordinary Chat/Codex |
| Start | Sunday Oct 11, 2026 at 21:15 Central |
| Repeat | Daily, `America/Chicago` with daylight-saving support |
| Connections | GitHub account `gttome`, actual Image Creation, saved-pixel visual inspection and exact binary export |
| Scope | Only one current-cycle eligible image job from `gttome/Daily-AI-Brief-Compiler` |
| Output | Six production-grade distinct 1200 × 630 PNGs, source-faithful explanatory text, hashes, manifest, reviews, protected PR/CI/merge/Pages and truthful AAR |
| Historical jobs | NEVER select prior `PUBLISHED_PENDING` jobs as fallback; NEVER reopen `RELEASED_VERIFIED` |
| Extra schedules | No third recurring AI task, recovery task, Supervisor or Watchdog |

**Do not simply say the task uses Work.** After creation, read the saved task details from the actual scheduling surface; record the generated task ID, selected Work mode if exposed, saved full prompt, time zone, recurrence, enabled state and connection permissions. Prove that actual scheduled Work execution can create a real native image and transport its exact 1200 × 630 PNG bytes through GitHub. A bounded one-time *Work-created* nonpublishing qualification is allowed, but it must not become a recurring production schedule or touch Pages or released historical art.

## GitHub activation after the new Work task ID is known

The existing pending Rev8 implementation is backward compatible but intentionally **inactive** under `contracts/image-process-versions.json` = `bounded_starter_v7:rev7`. Before the first production image release, update via **protected PR with required exact-head CI**:

1. Replace the old image-task ID with the **actual new Work-created task ID**, consistently in `contracts/automation/two-task-operation.json`, `contracts/automation/recurring-image-authorization.json`, `scripts/recurring-image-admission.mjs` (currently exact-ID fenced), and the Revision 8 starter/full prompt/runbook and associated tests that refer to the task. Do not relax to a wildcard/any-task authorization.
2. Record the owner-authorized effective cycle and edition: evening Oct 11 → edition Oct 12. Preserve GitHub no-bypass protection, six-pairing checks and historical Rev6/Rev7 read support.
3. Run the required selector/doc/release-gate tests, full CI, fixture/reader parity and exact 17-object Oct 8 live-integrity audit. Do not bypass a failing protection.
4. Only after Work-native task creation and safe capability checks, choose the compatible `recurring_work_v8:rev8` pair in `contracts/image-process-versions.json`, through a protected PR. No direct protected-main push.
5. Read back selected main SHA, task details and protected workflow trigger. Distinguish configured and enabled from actually observed scheduled execution. Record exact `GO`, `NO_GO` or `UNPROVEN` evidence.

**Automatic image deployment remains the existing** `.github/workflows/external-image-only-replacement.yml`. No alternate publication, direct Pages changes, manual GO, owner token or new paid API is authorized.

## First cycle, honest failure, and AARs

The Compiler must run at **19:15** as an ordinary ChatGPT scheduled task with its **own** GitHub access; do not change it to Work. On Oct 11, it produces the independently verified **Oct 12** placeholder edition and publishes the immutable six-story image job. At 21:15 Work selects the image-job row for **Oct 12 only** and validates the job SHA256, original source/bundle commit, six story IDs and pending status.

Before any expensive image generation, prove the actual production invocation's creation/export/GitHub/binary/review path. If the source is unavailable, exit `WAITING_SOURCE` without images. If host Work or required permissions are absent, exit `BLOCKED_INCOMPLETE` truthfully rather than pretending to generate. Do not claim account quota resets each day. For a successful image run, require exactly six distinct mechanism illustrations with mandatory readable labels, actual saved-pixel reviews, exact Git binary hashes, protected PR/CI/merge, six live hashes, 12 article/image pairings, 24 **semantically reviewed** desktop/mobile image contexts, and unchanged original pages/Oct 8 history. Record per-lane after-action reports and the next-cycle readiness using the deterministic nonpublishing AAR infrastructure. Missing task receipts are `NO_START_RECEIPT`, never invented `SUCCESS`.

The image schedule must be tested against real Work and GitHub capabilities, not a generic ChatGPT task. If Work-native task creation cannot be performed by the available actual environment, explicitly report the **first-party mode-selection blocker** rather than claiming activation. Keep original publication intact.
