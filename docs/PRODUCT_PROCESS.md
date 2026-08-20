# Product process: Figma → PRD → Issue → Code → QA

This document exists to stop the codebase from quietly drifting away from
the product vision as more people (and more agents) touch it. The rule is
simple: **no screen gets built from a Figma frame directly — it goes through
a written spec first.**

## The pipeline

```
Figma frame  →  PRD (filled into the GitHub issue template)  →  GitHub Issue
             →  Code (implements the issue, references it in the PR)
             →  QA (checks the acceptance criteria, not just "does it look right")
```

### 1. Figma

The design is the starting point, not the spec. A frame shows what something
looks like; it doesn't reliably answer who can do what, what happens when
something goes wrong, or what a phone screen does instead. Those all have to
be written down separately — that's the next step.

### 2. PRD

Use the **"Feature (with PRD)"** issue template
(`.github/ISSUE_TEMPLATE/feature-prd.md`) for any new screen or any
significant change to an existing one. It asks for exactly the things a
Figma frame doesn't say:

- Who uses this screen, and what are they trying to get done
- What data appears, and where it comes from
- Every action on the screen and which role(s) can take it
- Mobile/field behavior (or an explicit "N/A" and why)
- Success and error states — including permission-denied, empty, and
  not-found, not just the happy path
- Acceptance criteria written as concrete, checkable statements

Small, mechanical changes (a copy tweak, a bug fix with no behavior
ambiguity) don't need the full template — use judgment. A PRD is for
anything where the answer to "what should this do" isn't already obvious
from the existing pattern in the codebase.

### 3. GitHub Issue

The filled-in PRD *is* the issue. This is deliberate — a spec that lives
somewhere else (a doc, a Slack thread) drifts out of sync with the issue
tracking the actual work. One artifact, one source of truth.

### 4. Code

Implementation should reference the issue (PR description, commit
messages) and should not silently change scope. If building it surfaces a
gap in the PRD — an unhandled state, an ambiguous permission — that's worth
resolving in the issue itself (edit it, or comment) before or alongside the
code change, not by making a silent judgment call that only lives in the
diff.

### 5. QA

Check the acceptance criteria as written, not just "does it look like the
Figma." A screen can match the design pixel-for-pixel and still fail on
error states, permissions, or mobile behavior the PRD called for. Where
practical, acceptance criteria should be reflected as e2e test assertions
(`tests-e2e/`) — that turns "QA'd once" into "stays true."

## Why this matters now

The codebase already has a security/data-model discipline (every query
scoped by `organizationId`, zod validation on every Server Action, etc.) —
this process is the equivalent discipline for *product* correctness. Without
it, "what should happen here" ends up decided ad hoc by whoever's writing
the code that day, and the product slowly stops matching the vision it
started from.
