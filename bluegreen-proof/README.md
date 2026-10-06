# Immutable Blue/Green Appliance — State-Portability Proof

This is a **non-production, read-only historical proof** of Proposal 2.

It does not modify `gttome/Daily-AI-Brief`, its schedules, branches, Pages configuration, production state, or published artifacts.

## Hypothesis

A Daily AI Brief edition can be resumed by a different qualified engine release without replaying semantic work or regenerating accepted images.

The proof models:

```text
frozen historical edition
        |
        v
   ENGINE BLUE
        |
        | writes one durable midway checkpoint
        X intentional stop
        |
        v
   ENGINE GREEN
        |
        | resumes exact checkpoint
        v
verify immutable edition identity
verify six exact accepted image bytes from public immutable artifact
verify published reader semantic identity
verify zero semantic replay / zero image regeneration
        |
        v
      PASS
```

## Historical fixture

The fixture is the independently published October 6, 2026 edition. It contains the six locked story identities, exact deployed image SHA-256 values, and the recorded rendered Pages HTML SHA-256 from the successful publication artifact.

The proof reads the already-public immutable assets only. It does not write to or otherwise mutate the production repository.

The public HTML endpoint can be regenerated after closeout and therefore may differ byte-for-byte from the archived rendered artifact while preserving the same reader result. For that reason the proof records both hashes but gates on semantic reader identity: edition date, six exact story identities in the same order, and the six exact deployed image bytes.

## Acceptance criteria

PASS requires all of the following:

1. Engine BLUE creates a midway durable checkpoint.
2. Engine BLUE stops intentionally.
3. Engine GREEN resumes that exact checkpoint.
4. Edition identity is unchanged.
5. Story selection is unchanged.
6. Research calls during proof = 0.
7. Editorial selection calls during proof = 0.
8. Image generation attempts during proof = 0.
9. Accepted-image mutations during proof = 0.
10. All six public deployed image bytes hash to the frozen accepted SHA-256 values.
11. Public reader output preserves the edition date and all six frozen story identities in the same order.
12. Final immutable digest equals the BLUE checkpoint digest.

The recorded historical rendered-HTML SHA remains audit provenance, not a live HTTP byte-equality gate.

This is a state-portability proof only. It does not authorize production failover by itself.
