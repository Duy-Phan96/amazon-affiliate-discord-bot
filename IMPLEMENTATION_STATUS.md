# Implementation status — server-test preparation, 2026-09-30

## Version and branch

v0.4.1 on `feat/api-free-products-20260929`, based on 1a80166514bcd8222c57483bf3feaebb6684a11e. Not merged or deployed by this preparation. The primary product is an Affiliate Link Bot; Basic remains available. Creators API stays deferred.

## Added in this slice

- `/amazon link url:...`: private DB-configured affiliate link with visible disclosure; no title, channel or API required. Existing reviewed public `/amazon product` flow remains.
- Affiliate-first setup wording, updated guide/status, and conservative automatic handling of already-tagged links (skip them; no attribution takeover).
- `DISCORD_GUILD_ID` can restrict runtime message/interaction handling to the chosen test server.
- Registration separated from startup. `npm run commands:register` requires a test guild, verifies token/application identity and uses a named-command guild POST rather than a bulk overwrite or global registration.
- `npm run doctor`: offline preflight, credential values hidden, minimal-permission invite URL, build/environment/Git checks. It does not verify login, permissions or Amazon access.
- Unit tests for private link output, chat triggers/skips and local setup/registration helpers. Tests use fake credentials and mocked Discord operations.
- CI resolves a lockfile, runs npm ci and all tests, then packages tracked source plus that lockfile as `amazon-server-test`. This is a tested snapshot lockfile, not yet a reviewed permanent lockfile committed to the repository.
- German server walkthrough including the user's two main workflows and a separate, evidence-conscious OneLink test.

## Existing functionality retained

DE/US/UK URL parsing and marketplace-specific IDs; Basic/Affiliate modes; draft setup with review/save/back/cancel; transactional replacement/revision checks; additive SQLite migration; reviewed manual product publication; persistent delivery reservations; same-product/channel 60-second cooldown; unknown delivery states without blind retries; fixed affiliate disclosure; no scraping or Amazon API traffic.

## Validation

The preceding v0.4 implementation passed 35 core and 14 Vitest tests in [run 36629486245](https://github.com/Duy-Phan96/amazon-affiliate-discord-bot/actions/runs/36629486245). These historical results do not validate the new slice.

For v0.4.1, inspect the CI run associated with its implementation commit. The preparation environment still cannot resolve registry.npmjs.org (`npm ping`: EAI_AGAIN), so fresh installed-dependency validation must run in CI or locally on the operator's machine. New tests and packaging are not claimed successful until the associated workflow completes.

No real Discord login, command registration, bot invite, message publication, OneLink click or Amazon account operation has been performed by this preparation. Tokens are neither requested nor configured remotely. Actual live testing belongs to the operator following `docs/SERVER_TEST.md`.

## Remaining before public release

- Complete and record the live Discord walkthrough, including setup cancellation, expired/old controls, permission revocation, double publish, changed configuration, restart and unknown delivery handling.
- Verify actual Amazon account/site/Discord use, account-level disclosure and OneLink behavior. Generated tag syntax does not prove attribution or commission eligibility.
- Review and commit a durable dependency lockfile, dependencies/action maintenance and cross-platform native SQLite installation. The test artifact includes its own resolved lockfile.
- Review delivery retention/reconciliation, global spam limits and multi-process operation. Product drafts still have no in-place editor and expire on restart.

Only DE/US/UK full product URLs are supported. amzn.to/amzn.eu resolution, extra marketplaces, official live titles/images/prices, product search, automatic deals, watches, Creators API, web dashboard and billing are not implemented in the current server-test slice.

## Amazon Programs feature branch

The stacked branch `feat/amazon-programs-foundation` adds the next API-free feature:
- central Amazon Programs catalog;
- Amazon Visa, Amazon Prime and Prime Student for Amazon.de;
- current tracking-ID program-link generation;
- admin-only `/amazon programs` UI;
- safe text-template rendering with `{affiliate_link}` / `{program_name}`;
- persistent program templates;
- preview-before-publish;
- existing delivery reservation/unknown-state behavior reused for program posts.

Commission/bounty values are not runtime constants. OneLink remains optional information only.

Recurring schedules are still deferred. This programs branch must pass CI and live Discord testing before it is merged into the VPS test branch.
