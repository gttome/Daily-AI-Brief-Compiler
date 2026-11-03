# Recurring AAR charts

Owner directive: include the three explanatory charts in every subsequent unified Daily AI Brief AAR. Effective with the November 3, 2026 edition and later.

The existing daily-operations-report workflow generates these figures with scripts/aar-charts.mjs through the unified renderer. It saves daily/C/charts.json and three SVGs alongside combined.md on operations-reports. The existing offline package includes the same figures and data. No separate schedule, model call, paid API, image generation or reader deployment is required.

1. **Research coverage:** editorial source indexes inspected versus not inspected, from the same edition's editorial audit. Do not substitute automated HTTP/index retrieval counts for editorial reading.
2. **Image rework:** accepted and rejected generation candidates for every final image. Bind per-story attempts to the same edition's released images and reconcile the total with its image AAR. Include first-pass acceptance and only applicable dated efficiency targets; quality gates remain unchanged.
3. **Top 10 selection:** unique published articles, videos and podcasts linked to verified Top 10 mappings versus other published items. Deduplicate an item linked to multiple topics. Show confirmed zero links as zero; absent or invalid handoff/search/selection evidence is unknown.

Every chart has an accessible text/table equivalent, edition label and interpretation. Missing or inconsistent evidence displays **Not recorded**, never a fabricated zero or a prior day's measurements. These are descriptive metrics, not quality scores, popularity ranks, proof of autonomy or causal improvement. Daily trend lines require comparable recorded cycles and must not be invented from this first baseline.

Existing Top 10, Compiler and image tasks should consult these charts during their normal AAR feedback step. When presenting an AAR in chat, include the same three charts using the current dated charts.json or link to the charted combined report when inline rendering is unavailable. Do not reconstruct numbers from memory or delay production for unavailable report evidence. Keep research completeness, publication, visual quality and unattended autonomy distinct.
