# Amazon Affiliate & Deal Discord Bot

**Main purpose: product URL in → your affiliate link out.** Generate a link privately or automatically reply to new untagged Amazon product URLs in selected Discord channels. Independent from GamerHQ. TypeScript / discord.js / SQLite. No Amazon product API required.

> **v0.4.1 — prepared for a controlled server test, not a public release.** Creators API / PA-API, live product data and automatic deal discovery are deferred. Start with [SERVER_TEST.md — German walkthrough](docs/SERVER_TEST.md). Runtime changes live on `feat/api-free-products-20260929`, not on `main` until reviewed and merged.

## Main workflows

- `/amazon link url:<full product URL>`: private, copyable affiliate link with disclosure and an Amazon button. No product title, channel selection or API needed. Requires saved Affiliate configuration and Manage Server permission.
- New member message with an untagged Amazon product URL: automatic disclosed reply in configured channels, if BUTTON or REPLY is enabled. Ordinary members need no management permission for this trigger. Their messages are not edited or deleted.
- `/amazon product`: optional title/note → channel → private preview → explicit public Publish.
- `/amazon setup`, `/amazon settings`, `/amazon status`, `/amazon guide`: configuration and help.

Affiliate mode uses your actual tracking ID for the original marketplace. Basic remains selectable for links without affiliate tracking or an Associates account. New unconfigured guilds remain Basic/Off until the operator deliberately configures Affiliate behavior. DE/US/UK are supported; no ID suffix invention or product-domain swaps. Short links (`amzn.to`, `amzn.eu`) must be expanded manually for this test. Product names alone are not a product search.

OneLink is an **optional Amazon-side setup**, not a second bot-generated link format. The UI records the operator's declaration, not verified account approval, redirection or commission. Read the [OneLink test procedure](docs/SERVER_TEST.md#7-onelink-separat-testen) and the [account/setup/disclosure guide](docs/API_FREE_SETUP.md).

## Local start — dedicated Discord application

Use Node.js 22.12 or newer (CI uses Node 22). The CI `amazon-server-test` artifact contains source and the lockfile resolved for that test run. In that artifact use `npm ci`. A Git checkout without a committed lockfile must first run `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, then `npm ci`. Do not confuse the generated bundle lockfile with a reviewed lockfile committed to the repository.

Copy `.env.example` to a local `.env` without overwriting an existing file. Fill Discord bot token, application ID and **DISCORD_GUILD_ID** locally. The latter selects and restricts the test server. Marketplace tracking IDs belong in the setup/database, not source defaults. No Amazon API credentials belong in this version.

```sh
npm ci
npm run test:tooling
npm run test:core
npm run build
npm test
npm run doctor
# Open the invite URL printed by doctor. Enable Message Content Intent in the dedicated bot app.
npm run commands:register
npm start
```

`doctor` is a local check, not a login or permission/OneLink verification. It hides credential values. Registration is now **explicit and guild-only**: it checks token/application correspondence and creates or updates just the named `/amazon` command. It does not bulk-replace other commands and does not register globally. Startup never registers commands. Do not reuse the token of your existing production/GamerHQ bot. With `DISCORD_GUILD_ID` set, message and interaction handling outside that guild are ignored.

Give the bot View Channel, Send Messages, Embed Links and Read Message History in one test channel. No Administrator permission is requested. All management/manual-link commands require Manage Server; automatic replies can be triggered by ordinary members in the selected channel. Keep the terminal running; Ctrl+C stops it. See the walkthrough for obtaining IDs and troubleshooting missing commands/intents.

## Safety and current boundaries

Setup is a private draft with Back/Cancel, review, revision checks and transactional Save. Old unselected marketplaces/channels are disabled. Product posts need preview/Publish. Saved settings survive restarts; unfinished forms expire after 15 minutes or restart. Back up existing SQLite files before any upgrade; `.env.example` uses a separate test database.

Automatic handling makes at most one reply per source message and suppresses repeats of the same product/channel for 60 seconds. It now **skips existing nonempty affiliate tags**, including your own tags, rather than silently replacing another publisher's attribution. An explicit `/amazon link` request is a separate operator action and can generate a new link from an already-tagged input; the original stays unchanged. Discord bots/webhooks are ignored.

Delivery attempts are recorded before sending. Unknown outcomes are not automatically resent; inspect the channel first. This is duplicate suppression, not exactly-once delivery. Reconciliation/retention, broader spam limits and multi-process guarantees remain open. No scraping, live prices, images, discounts or product availability are provided.

Visible affiliate disclosure is included, but operators must separately verify their Amazon account/site/Discord use and provide the required account/site disclosure. A test or OneLink checkbox is not legal approval. The project is not endorsed by Amazon. [Amazon disclosure guidance](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98), [participation agreement](https://partnernet.amazon.de/help/operating/agreement/) and [policies](https://partnernet.amazon.de/help/operating/policies/).

## Validation and documents

The earlier v0.4 implementation passed 35 core plus 14 Vitest tests. Do not use those old results as proof for v0.4.1: inspect the latest PR/CI run. The new suite additionally exercises private affiliate generation, chat replies and local setup tooling with fake data only. A successful run packages tested source with its resolved lockfile; it never connects to a real Discord account or Amazon for these tests.

[Server test](docs/SERVER_TEST.md) · [Beginner guide](docs/API_FREE_SETUP.md) · [Implementation status](IMPLEMENTATION_STATUS.md) · [Architecture](ARCHITECTURE.md) · [Scope](docs/V1_SCOPE.md) · [Security](SECURITY.md) · [Agent instructions](AGENTS.md).

The [Creators API diagnostic brief](docs/CODEX_CREATORS_API_TEST.md) is parked for a later version. Website, paid features, bounties and monitoring remain deferred. Do not deploy publicly until live Discord behavior, dependencies and the actual commercial usage are reviewed.


## Amazon Programs / Bounties

This feature is separate from normal product links.

Normal product links:
- start from an Amazon product URL / ASIN;
- use the matching marketplace tracking ID.

Amazon Programs:
- use dedicated Amazon landing pages;
- currently support Amazon Visa, Amazon Prime and Prime Student for Amazon.de;
- generate the final program URL from the guild's CURRENT saved Amazon.de tracking ID;
- do not require Creators API / PA-API.

Use `/amazon programs` as an administrator to:
- choose a supported program;
- view the current affiliate link privately;
- create a Markdown-style Discord post;
- preview before publishing;
- save reusable templates.

Supported placeholders:
- `{affiliate_link}`
- `{program_name}`

Program payouts, bounty amounts, campaign periods and eligibility are intentionally not hardcoded. Amazon can change them. The bot links to the relevant PartnerNet information page instead.

OneLink is optional and separate. It is not required to generate a program link and does not replace a missing marketplace tracking ID.

Recurring schedules such as “post Amazon Visa every 4 days” are intentionally deferred to the next slice after program posts/templates are live-tested.
