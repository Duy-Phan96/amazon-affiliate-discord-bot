# Implementation status — API-free branch, 2026-09-29

## Baseline and priority

Based on imported v0.3 commit `9f98cbee11393bb3352a1931415f594defa9a6a4`. The user deferred Creators API to a later version. This branch is v0.4.0 development source, not a completed public V1 release.

## Implemented in source in this branch

- Basic/Affiliate product mode, pure URL parsing and product-link generation. Basic strips tags from bot-generated links; Affiliate requires a configured original-marketplace tag.
- DE/US/UK only. No invented tags, domain swaps, network short-link resolution, scraping or API requests.
- Draft setup with mode, marketplaces, tags, optional OneLink declaration, channels, behavior, review, save, back and cancellation.
- Atomic configuration replacement, revision conflict detection, additive legacy migration and automatic database-directory creation.
- Manual `/amazon product`: own title/note, channel, private preview and explicit publish; runtime actor/channel checks and preview invalidation after settings changes.
- Fixed visible Affiliate disclosure, `/amazon guide`, updated settings/status and API-free environment example.
- Persistent event reservations, same-product/channel cooldown for automatic replies, explicit unknown delivery state and no automatic replay of uncertain sends.
- Safe top-level error handling and no raw SDK exception dumps.
- Updated scope, agent instructions, README and German beginner guide with official source links.

## Validation actually performed

Environment: Node.js 22.16.0 and globally available TypeScript 5.8.3.

`npm run test:core`: exit 0 — 35 tests passed, 0 failed. Compiled and exercised the pure URL, Basic/Affiliate link, setup-validation and draft-isolation/expiry logic using Node's built-in runner. No Amazon or Discord request.

A supplemental Python SQLite check ran the extracted schema plus additive column migrations twice successfully. This does not validate the better-sqlite3 adapter or its transaction behavior.

`npm install --no-audit --no-fund --fetch-retries=0 --fetch-timeout=10000`: exit 1 — `EAI_AGAIN` resolving registry.npmjs.org.

`npm run build`: exit 1 — missing installed discord.js/Node/SQLite types and consequential type errors. Full build NOT confirmed.

`npm test`: exit 127 — Vitest not installed. Existing and new SQLite/Vitest tests NOT executed here. No lockfile fabricated.

No actual Discord login, message publication or Amazon access test was performed. No user secrets or real tracking IDs were added to defaults.

## Must complete before merge/release

1. Successful dependency installation, reviewed lockfile, full build and Vitest suite.
2. Discord test-server walkthrough of every setup/product path, runtime permission revocation, old controls, double click, preview/config conflict, restart and uncertain send handling.
3. Review extra marketplace requirements, settings recovery and delivery retention/reconciliation. Current UI supports only DE/US/UK and 1–5 text channels.
4. Verify the actual Amazon/Discord usage, OneLink behavior and account/site disclosure with the operator; the bot does not certify them.

Transient drafts expire on restart; there is no draft-resumption feature. There is no automatic retry/reconciliation or cleanup of delivery records, no global spam quota, and no multi-process deployment guarantee. Product drafts have no in-place edit step; cancel and reopen to change the contents. Other source limitations may be found by the unexecuted integration checks.

## Deferred, not implemented

Creators API auth/diagnostic/provider; product lookup/search/live data; automatic deal discovery; product/price monitoring; extra marketplaces; separate store/approval/API-availability model; website; hosted onboarding; subscriptions; programs/bounties. The parked `docs/CODEX_CREATORS_API_TEST.md` must not be executed as the next task.
