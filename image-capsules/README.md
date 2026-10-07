# D0 image-capsules

Pure Compiler-side contract logic for D0 Native Image Capsules. These modules do not invoke any model or image service. Native image generation is performed by the ordinary ChatGPT runtime only after `admission.mjs` authorizes a proven fresh story-only capsule. GitHub code owns deterministic hashing, persistence, normalization and gates.

The generator-visible projection deliberately excludes edition IDs, story IDs, candidate IDs, URLs, hashes, branch/execution metadata, benchmark assets, other-story assignments, retry metadata and acceptance state.
