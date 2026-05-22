# ADR-NNNN: Title

Status: proposed | proposed (decision-pending) | accepted | superseded  
Date: YYYY-MM-DD  
Related: links

This template supports two ADR shapes. Pick the one that matches the decision's state, delete the other, and remove this preamble before filing.

---

## Shape A: accepted decision (or proposed for acceptance)

Use when a specific choice has been or is about to be made. The ADR captures what was chosen and why.

### Context

What problem forces a decision? What constraints or evidence shape it?

### Decision

What are we choosing?

### Alternatives considered

- Option A
- Option B
- Option C

### Rationale

Why is this choice best for this project's goals and constraints?

### Consequences

Positive and negative effects. Both should be honest.

### Reversal path

How hard is this to change later? What evidence would trigger reconsideration?

### Follow-up ADRs expected (optional)

Decisions this one defers or makes possible.

---

## Shape B: decision-pending

Use when a decision is too early to make but the project needs to commit to *how* it will be made — the criteria, the evidence required, the timing. The ADR captures the decision plan, not the decision.

### Context

What problem forces a decision? Why can't the decision be made yet?

### Decision to make

The specific choice this ADR will eventually record. State it as a question or as a small enumerated set of options.

### Options under consideration

- Option A — short description
- Option B — short description

### Evaluation criteria

The criteria the eventual decision will be judged on (e.g. bundle size, testability, lifecycle complexity, security posture).

### Current recommendation (if any)

A leaning, with the caveat that it is not the decision. May be absent.

### Required evidence before accepting

What must be true before this ADR can be promoted to Shape A and given `Status: accepted`. Could be a spike, a measurement, a stakeholder sign-off, a deployment test.

### Decision required by

If there is a deadline (e.g. before public launch), say so. Otherwise: "when the required evidence exists."

---

## Filing

Once you have written the ADR:

1. Number it as the next integer (zero-padded to four digits): `0005-...md`.
2. File at `docs/decisions/NNNN-short-title.md`.
3. Update [docs/decisions/README.md](README.md) to add the row.
4. If this ADR supersedes a previous one, set the old ADR's status to `superseded` and add a `Superseded by:` line pointing here.
