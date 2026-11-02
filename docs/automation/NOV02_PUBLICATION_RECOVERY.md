# November 2 publication recovery

The owner requested correction of the blocked November 2 edition. The existing
October 11 operating policy already removed host-mode admission. The actual
compiler still rejected truthful `owner_intervention`, `work_used`, and
`codex_used` receipts. For November 2 and later pending-image editions these
booleans are diagnostics. Paid model APIs remain forbidden, provenance must be
typed, and no unattended certification is inferred from self-reported fields.
Historical and generated-image admission behavior remains unchanged.

The signed-out video verifier previously threw on HTTP/provider errors before
saving its JSON report. Failed runs therefore omitted the exact video identity
needed by the existing same-edition recovery process. It now records each failed
candidate and checks the second video before writing the fail-closed result.
The existing workflow can preserve that report without any workflow, schedule,
playback threshold, publisher restriction, or metadata-fallback change.

Actual incident: run 41373922860 and run 41374499329 returned
`Public publisher page HTTP 401`. Neither log names the failed candidate, so the
error must not be assigned to a particular video without further evidence.
The original failure events remain in the November 2 branch. A newer source
recovery commit appeared after the scheduler recorded its attempt failed; this
demonstrates that a failed task record alone cannot establish writer inactivity.

All normal semantic, 2/2/2 allocation, archive uniqueness, Watchlist, image,
protected-PR, public playback, release and live handoff checks remain required.
Do not overwrite a newer edition-branch commit. Owner-directed recovery must be
reported as such, with unknown usage remaining unknown.
