# Amazon Affiliate & Deal Discord Bot

Independent TypeScript / discord.js bot for sharing Amazon product links. **The current priority is API-free V1. Creators API / PA-API is deferred to a later version.** No Amazon API credentials or product API eligibility are required by this version.

> **v0.4.0 development branch, not a production release.** New source includes Basic/Affiliate setup and reviewed product posts. The dependency-free core check passes; the full Discord/SQLite build and Vitest suite remain unverified because npm dependency installation failed. See [implementation status](IMPLEMENTATION_STATUS.md) before deployment.

## What this branch contains

| Feature | API-free behavior |
| --- | --- |
| Basic mode | Canonical product links without affiliate tags or a required Associates account |
| Affiliate mode | Operator-owned tracking IDs, separated by DE/US/UK marketplace |
| OneLink | Optional operator declaration plus official setup/disclosure links; not automatic account configuration or verified redirection |
| Setup | Private draft, Back/Cancel, review and transactional Save; conflict detection for stale settings |
| Manual products | URL, optional original title/note, configured channel, preview and explicit Publish |
| Automatic links | BUTTON / REPLY / OFF, selected channels only, one response per message |
| Duplicates | Persistent event reservations and a 60-second same-product/channel cooldown for automatic replies |
| Status | Mode, channels, marketplace configuration, OneLink declaration and unresolved delivery attempts |

No Amazon pages are fetched. No live price, image, product title, discount, availability, search or deal feed is generated. Manually written content is clearly identified as community-written rather than API-verified. The original user message is never edited; Basic removes tags only from the bot's new link.

## Start locally

Use Node.js 22.12 or newer. This is self-hosted development software; fully hosted, nontechnical onboarding is future work.

```bash
npm install
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` on macOS/Linux). Fill only Discord credentials locally. Optionally set `DISCORD_GUILD_ID` for development command registration. The database's parent directory is created automatically.

```bash
npm run test:core
npm run build
npm test
npm run dev
# after a successful build:
npm start
```

`test:core` uses the TypeScript compiler and Node's built-in test runner; it does not require Discord, SQLite, Vitest, credentials or external services. `npm test` runs the separate Vitest tests, including persistence. No lockfile has been fabricated; generate, review and commit one after a successful installation before a reproducible release.

Create a dedicated Discord application. Enable Message Content Intent to use message-based automatic link handling. Invite it with `bot` and `applications.commands`, and grant only View Channel, Send Messages, Embed Links and Read Message History in the selected text channels. Administrator permission is not required. All `/amazon` management/product commands require **Manage Server**, with runtime checks as well as command defaults.

## Configure and share

Run `/amazon setup`. Choose Basic or Affiliate, marketplaces, tracking IDs for Affiliate, optional OneLink declaration, 1–5 text channels and automatic behavior. Review the final summary and save. Unselected old marketplaces/channels are disabled in one transaction, not left active accidentally. No Discord channel or member message is deleted.

Basic skips the tracking-ID and OneLink steps. Changing to Basic stops the bot from adding affiliate tracking. Cancel/expiry/restart discards an unfinished draft; saved settings remain unchanged. Another administrator's intervening save invalidates the old form.

Use `/amazon product` to compose a recommendation. Enter a full supported product URL, your own title and optional note/disclosure. Choose one of the configured channels, inspect the preview and click **Publish product**. Automatic link handling can remain Off. Do not use text fields to misrepresent unverified live offers; there are no price or image inputs.

`/amazon settings`, `/amazon status` and `/amazon guide` show configuration, delivery issues and contextual help. This release supports DE, US and UK, not all international accounts you might already have linked with Amazon.

## Beginner guides and OneLink

Read the [step-by-step Basic / Affiliate / OneLink guide](docs/API_FREE_SETUP.md). It covers individual IDs and a single marketplace as fully supported alternatives, as well as why disclosures matter.

OneLink is configured with Amazon, outside the bot. A saved boolean is **only an operator declaration**. It does not establish approval of Discord usage, verify commissions or prove that a particular click is redirected. The bot keeps the source marketplace and never derives an ID by changing its suffix. Amazon documents different OneLink setup routes; see the [official integration guide](https://affiliate-program.amazon.com/help/node/topic/GKHRXG4YEJBTCAFC) and the [German portal entry](https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC).

Affiliate posts always include a visible link-level disclosure plus an Associate statement. The bot's extra text does not replace the operator's account/site disclosure or a check of whether the actual use is permitted. Amazon explains both obligations in its [disclosure guidance](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98). Basic mode does not mean every commercial promotion is exempt from advertising rules.

## Persistence, safety and remaining limits

Existing installations retain Affiliate mode during the additive migration. New guilds default to Basic and automatic handling Off. Back up SQLite before upgrades. Configuration lives in SQLite; unfinished forms expire after 15 minutes and are not persisted.

Delivery records contain guild/channel/source IDs, a canonical product key, attempt state and optional Discord message ID, not message bodies. A source event is reserved before sending. On a crash or uncertain response it is not automatically resent; check the channel before making a new manual post. This is duplicate suppression, **not an exactly-once delivery guarantee**. Unresolved records are counted by `/amazon status`; reconciliation/retention tooling is still a release follow-up.

Short URLs such as `amzn.to` are not resolved by this release. Open them yourself and provide the full product URL. No HTTP request is made to a user-provided URL. Single-process self-hosting is the target; multi-instance/multi-tenant operation is not release-ready.

## Version boundary

The parked [Creators API test brief](docs/CODEX_CREATORS_API_TEST.md) is for a later version and must be rechecked against current official documentation when work resumes. There is no `amazon:api:test` command. No API credentials belong in this version's setup.

See [V1 acceptance criteria](docs/V1_SCOPE.md), [architecture](ARCHITECTURE.md), [security](SECURITY.md), [agent instructions](AGENTS.md) and [validation/known gaps](IMPLEMENTATION_STATUS.md). Do not deploy publicly until full build/tests, the Discord walkthrough and the actual Amazon/advertising usage review are complete. This project is not endorsed or approved by Amazon.
