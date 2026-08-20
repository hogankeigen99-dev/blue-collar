---
name: Feature (with PRD)
about: A new screen or feature that needs a Figma reference and a spec before code starts
title: ""
labels: ""
---

<!--
Fill in every section before this issue is considered ready to build. If a
section genuinely doesn't apply (e.g. no mobile behavior for an admin-only
desktop screen), say so explicitly rather than deleting it — "N/A: desktop-only,
admin role" is a decision worth recording, an empty section just looks
unfinished.

See docs/PRODUCT_PROCESS.md for how this fits into the Figma → PRD → Issue →
Code → QA flow.
-->

## Figma reference

<!-- Link the specific frame(s), not just the file. -->

## Who uses this, and what are they trying to accomplish?

<!-- Name the role(s) (owner/admin/manager/technician/customer/etc.) and the
job-to-be-done, not just "the user wants to see X." -->

## Data on screen

<!-- What's displayed, where it comes from (which model/fields), and any
computed/derived values (e.g. a running total, a status badge). -->

## Actions and permissions

<!-- Every button/action on the screen: what it does, and which role(s) can
do it. Call out anything that changes data another tenant/org must never see
or affect. -->

## Mobile / field behavior

<!-- Field crew are frequently on a phone, often with poor connectivity.
State explicitly if this screen needs a distinct mobile treatment, or if
it's desktop-only and why that's fine (e.g. admin configuration screens). -->

## Success and error states

<!-- What does it look like when it works? What are the ways it can fail
(validation error, permission denied, not found, empty state, network
failure) and what does the user see for each? -->

## Acceptance criteria

<!-- Concrete, testable statements. Written so someone doing QA (or an e2e
test) can check each one off without having to interpret intent.
- [ ]
- [ ]
- [ ]
-->

## Out of scope

<!-- What this issue deliberately does NOT cover, especially if it's
adjacent enough that someone might assume it's included. -->
