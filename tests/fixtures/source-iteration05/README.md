# Preserved Iteration 5 source snapshot

These four files are exact copies of the source configuration at protected
Compiler commit `ca3d0c7726a2b87d6b0f98e6ff1890c0a0d3903e`.
They retain the original 15-qualified source snapshot used by the Iteration 5
capture and research receipts.

The current snapshot has a later bounded Iteration 7 qualification follow-up.
Tests replay historical receipts using these exact inputs and the unchanged
Iteration 5 capture files. They also reject the old plan against the changed
current snapshot. This fixture authorizes no acquisition, edition or deployment.

| File | Original repository path | Git blob |
|---|---|---|
| resource-registry.json | config/resource-registry.json | 6843aacfbd6aa1eb950f8253770e0ce412fa1cfb |
| source-discovery-policy.json | config/source-discovery-policy.json | 746f53b3d9679a8a8c893aedba1c7ab3ef35ed61 |
| source-route-qualifications.json | config/source-route-qualifications.json | 196c125c4858e4d3ec75a18bb6f6609007438387 |
| source-snapshot.json | config/source-snapshot.json | 78f94775c1abea31779d4097aeeb4dcc385df0b7 |

Raw SHA-256 identities are asserted in
`tests/source-discovery-current.test.mjs`. No historical observation, receipt,
source import membership or terminal execution was changed to create this fixture.
