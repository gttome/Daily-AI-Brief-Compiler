# D1 Production Image Benchmark Profile

Date: 2026-10-07
Status: quality calibration profile for D1 v5 reader-image generation.

## Purpose

Translate the current Daily AI Brief production-image standard into a story-neutral visual grammar that can be passed into a clean per-story ChatGPT image conversation without exposing prior story content or prior image assets.

The benchmark is derived from the current production image set already vendored in this repository, including the October 6 reader images. The story chat does **not** receive those prior images. It receives only this abstracted quality profile.

## Required visual character

A passing image should read as a commissioned advanced textbook/editorial mechanism plate rather than a flat infographic.

Required characteristics:

- white or near-white background;
- landscape composition designed for 1200x630 publication;
- approximately 80–90% of the useful canvas occupied by explanatory mechanism;
- strong dimensional depth using layered, isometric, exploded, cutaway, transparent, rail, conduit, chamber, lattice, gate, stack, or state-transition structures as appropriate to the story;
- 3–5 major visual regions with nested explanatory substructure;
- at least 12 meaningful causal components across the complete plate;
- at least two levels of internal mechanism inside the dominant processing region;
- visible primary path plus at least two secondary evidence, constraint, provenance, or feedback relationships;
- physicalized data/evidence flow using packets, tokens, traces, rails, conduits, linked fragments, state layers, or comparable non-text mechanism;
- clear hierarchy: one dominant mechanism, subordinate evidence/constraint structures, then small supporting details;
- crisp technical linework, controlled perspective, subtle shadows/depth, and restrained professional accent colors;
- every visible object must explain cause, state, evidence, constraint, transformation, or flow.

## Forbidden low-quality patterns

Fail the candidate if the composition is primarily any of the following:

- flat row of labeled boxes with arrows;
- repeated rounded cards/panels with little internal mechanism;
- generic dashboard-grid composition;
- device hero with decorative UI;
- generic document stacks used as a substitute for evidence logic;
- floating panels or symbols that do not participate in causal explanation;
- decorative connector loops that do not encode a real relationship;
- empty whitespace used to make a simple mechanism look polished;
- repeated icon-board treatment;
- placeholder horizontal lines that resemble pseudotext;
- symbolic gears, tokens, or machine parts that do not expose what transformation they perform.

## Mechanism-density test

The dominant mechanism must answer visually:

1. what enters;
2. what changes internally;
3. what evidence/state is produced;
4. what constraints or checks act on it;
5. what passes forward;
6. what can return or branch;
7. how supporting evidence/provenance connects to the main path.

A candidate that merely names those stages without showing how they interact is not sufficient.

## Story-specific construction rule

Before generation, convert the sealed story specification into a concrete build recipe. The build recipe should name:

- the dominant physicalized mechanism;
- at least two internal substages inside that mechanism;
- the evidence/state structure;
- the review/constraint structure;
- the return/feedback path;
- the output/release boundary;
- secondary supporting traces or provenance links.

The build recipe must remain story-only. It may not import objects, labels, motifs, or subject matter from a prior Daily AI Brief image.

## Text rule

Honor the story's exact visible-text allowlist. Do not add headings, captions, UI labels, pseudo-writing, filenames, hashes, timestamps, badges, or other readable characters not explicitly allowed.

## Acceptance rule

Premium quality is not a synonym for visual polish. PASS requires both:

- high production finish; and
- explanatory mechanism depth comparable to the production benchmark profile above.

A visually attractive but generic infographic remains FAIL.
