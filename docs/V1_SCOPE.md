# API-free V1 scope

Priority decision: 2026-09-29. Creators API / PA-API is a later version, not a prerequisite or the next implementation task.

## Baseline product

Basic mode lets a non-Associate share ordinary Amazon product links, with no affiliate tag added by the bot. Affiliate mode uses actual marketplace tracking IDs and visible disclosure. OneLink is an optional Amazon-side setup with its own guide; individual IDs and single-marketplace usage must remain available.

The initial release targets DE, US and UK. Other marketplaces are a separate additive slice; existing external OneLink account setup must not be overwritten or treated as verified by the bot.

## Required before calling V1 finished

- Working installation and successful full build/test suite with dependencies installed.
- Setup: mode, marketplace IDs when applicable, OneLink explanation, channel selection, behavior, review/save/back/cancel. No partial saves; stale forms cannot overwrite newer settings.
- Manual product composition: full URL, optional operator-written title/note, target channel, preview and explicit publication. No automatic product data or copied product images.
- Automatic handling in selected channels only, with original messages untouched, visible affiliate labels and duplicate suppression.
- Correct restart behavior, useful status, safe errors, least privilege and no secrets in output.
- Beginner instructions for Basic, single-marketplace affiliate IDs, multiple IDs and optional OneLink; sources, limitations and deployment checklist.
- Development-server checks for permission denial, removed channels, stale/expired controls, double clicks, cancellation, changed settings during preview, restart and uncertain sends.

Implementation and test status is recorded in `../IMPLEMENTATION_STATUS.md`. These are acceptance criteria, not a claim that all are complete.

## Explicitly deferred

Creators API authentication and access test; product search; official live titles/images/prices/discounts/Prime information; automatic deal discovery; product/price monitoring; website; hosted multi-tenant secret onboarding; premium payments; programs/bounties.

Do not build scraping as a substitute. Do not add placeholder credentials or block Basic/Affiliate setup on Amazon API eligibility. Future monitoring also requires its own current rules/permission review.
