# Daily AI Brief Compiler

The Compiler publishes an immutable editorial edition through deterministic GitHub validation, build and verification. Optional premium images come from an existing external app after publication.

## External image app

Start with [EXTERNAL_APP_HANDOFF.md](EXTERNAL_APP_HANDOFF.md) and the [full reusable prompt](docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt.md).

The app reads the prompt and GitHub's eligible six-story job, creates and reviews six images, and copies six PNG binaries plus the manifest/reviews back to GitHub. The Compiler does not require Work mode, a fresh chat, a browser session, a particular generator or an app build. It validates article bindings, exact files and review evidence. The daily publisher remains independent of image-app availability.

Readable explanatory text is mandatory. Article-fit infographic styling is permitted with the established quality requirements. See the [image specification](docs/external-app/Perfect_Image_Specification.md), [variation guidance](docs/external-app/Image_Variation_After_Action.md) and [benchmark](docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md).

The executing image session must correct and re-review failures until all six images pass every individual and set-level requirement. The session is complete only after all six final PNGs pass GitHub readback, are integrated and published in the dated Brief, and pass live verification on the Brief and all six permanent article pages. Use the existing GitHub connection first; no routine separate browser sign-in is required. There is no fixed quality-attempt stopping rule; genuine capability blockers remain incomplete with saved progress.

## Repository and release boundaries

Operate only in `gttome/Daily-AI-Brief-Compiler`; do not modify `gttome/Daily-AI-Brief`. The external app stages on an unprotected branch. The executing session continues through the owner-authorized protected Compiler release with exact-head CI, image-only scope, preserved historical assets and independent live-byte verification. The startup instruction authorizes that bounded publication; missing capabilities or unmet release gates leave the task incomplete.

This interface change does not alter schedules, reopen terminal runs, rewrite editorial content, generate images in the Compiler or activate an old D0/D1/Proposal 1R lane. Existing immutable jobs retain their original hashes; the current prompt supplies the mandatory-text correction for older empty-label packets.

## Documentation

- [Current external-app documents](docs/external-app/README.md)
- [Compiler architecture and historical context](docs/ARCHITECTURE.md)
- [Editorial contract](docs/EDITORIAL-CONTRACT.md)
- [Operational learning](docs/OPERATIONAL-LEARNING.md)

`EXTERNAL_WORK_HANDOFF.md` is a compatibility pointer. Retained D0/D1 proof documents describe historical implementations and do not impose external-app platform requirements.
