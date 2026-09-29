# Amazon Affiliate & Deal Discord Bot

Standalone TypeScript / discord.js prototype for Amazon affiliate links, with SQLite configuration and a future optional official product-data provider. Independent from GamerHQ and other bots.

> **Development snapshot: v0.3.0.** This repository contains the available source project, not the completed product roadmap. The Creators API access test is **planned, not implemented**. Installation/build/tests could not be verified during import because the environment could not reach the npm registry. See [implementation status](IMPLEMENTATION_STATUS.md).

## Implemented in this snapshot

- Amazon.de, Amazon.com and Amazon.co.uk URL parsing and ASIN extraction.
- Canonical affiliate URLs using separately configured marketplace tracking IDs.
- SQLite-backed guild, marketplace and channel configuration.
- Initial `/amazon setup` flow: marketplaces, tracking IDs, OneLink preference, channel and link mode.
- `/amazon settings` and `/amazon status`.
- Automatic link replies in configured channels: `BUTTON`, `REPLY` or `OFF`.
- A disclosure string accompanying generated affiliate replies.
- Discord-independent `AmazonAffiliateService` and `ProductProvider` / `LimitedProvider` abstractions.
- Parser, affiliate-link and repository unit tests.

The bot does **not** fetch live prices, product titles, images, discounts or availability. It does not scrape Amazon pages or simulate product data.

## Local development

Use a compatible Node.js environment; the import was prepared on Node.js 22. Install dependencies locally before running the project.

```bash
npm install
```

Create the environment file and database directory. The current database constructor expects its parent directory to exist.

**PowerShell (Windows):**

```powershell
Copy-Item .env.example .env
New-Item -ItemType Directory -Force data | Out-Null
```

**macOS / Linux:**

```bash
cp .env.example .env
mkdir -p data
```

Fill `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in `.env` locally. Optionally set `DISCORD_GUILD_ID` for development command registration. Do not share the file. Configure the Discord application's Message Content Intent before using automatic message-based link detection.

```bash
npm run build
npm test
npm run dev
```

The available scripts are `dev`, `build` and `test`. **`npm run amazon:api:test` does not exist yet.** Its implementation brief is linked below.

No API credentials are needed for the current affiliate-link functionality. No real Amazon or Discord credentials are needed by the unit tests.

## Initial Discord setup

Run `/amazon setup` in a development server. Select DE, US and/or UK, enter the real tracking IDs, indicate your OneLink preference, select a text channel and choose a link mode. Inspect the saved settings with `/amazon settings`.

**Prototype limitations:** setup saves individual steps immediately. Review/Save/Cancel, transactional draft configuration, full permission rechecks and production-grade interaction error handling remain to be implemented. Repeating setup may retain previously configured marketplaces/channels. Do not treat this as a finished setup wizard.

Automatic handling leaves the member's original message untouched and posts its own reply. Restart-safe deduplication, a scheduler, short-link resolution and a complete settings editor are not implemented.

## International marketplaces / OneLink

Every marketplace uses its own explicitly configured tracking ID. Never derive a foreign tracking ID by changing a suffix, and never assume that swapping an Amazon domain produces the same local product.

### Optional OneLink setup

Use Amazon's current instructions to check eligibility, link the required international accounts/stores and configure their tracking IDs:

[Official Amazon OneLink setup guide](https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC)

After completing Amazon's setup, enter each real marketplace tracking ID in the bot and select the OneLink option. **In this version the option only records your declaration in the database.** The bot neither configures nor validates OneLink and cannot prove that a Discord click will be localized or monetized. The UI's existing "Recommended" label is not verification of support for Discord. Before promoting this as the recommended international route, verify Amazon's current supported link/site requirements and the actual deployment.

### Without OneLink

Choose "Use individual IDs" and configure only the marketplaces you use. A single marketplace is supported. The bot generates a tagged URL for that original marketplace; a missing tag does not trigger an invented replacement.

Only DE/US/UK exist in the current code. Additional international markets and separate Store ID, Tracking ID, approval and API-availability fields belong to future work.

## Product modes: target design, not all implemented

| Mode | Goal | Current status |
| --- | --- | --- |
| Basic | Share normal product links without an Associates account or affiliate tracking | Planned; not yet selectable |
| Affiliate | Marketplace-specific affiliate links; optional OneLink configuration | Initial prototype implemented |
| API | Official product information and authorized automation through Creators API | Not implemented |

API access must remain optional. Missing credentials or missing Amazon eligibility must never break Basic/Affiliate functionality once those modes are integrated.

## Next isolated task: Creators API access test

See [the Codex implementation brief](docs/CODEX_CREATORS_API_TEST.md).

The next slice is a **local diagnostic only**: current official authentication, one Amazon.de product query and safe status classification. No Discord commands, DB migration, scheduler, price monitoring, bounty module or legacy PA-API authentication should be added in that slice.

Creating an application or credentials must not be presented as proof of product-data access. An actual product request needs to succeed. Eligibility failures must remain distinct from technical failures. Verify current requirements and exact request formats against official Amazon documentation before implementation.

## Compliance and release readiness

This is a development project, not a legal approval or an Amazon-endorsed product. A disclosure string alone does not establish compliance. Before deployment, verify the current rules for the actual Discord/site usage, advertising disclosures, API content, retention and monitoring. Do not enable price alerts merely because API authentication works.

Official references to consult before release:

- [Amazon PartnerNet operating agreement](https://partnernet.amazon.de/help/operating/agreement/)
- [Amazon PartnerNet policies](https://partnernet.amazon.de/help/operating/policies/)
- [Amazon disclosure guidance](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98)
- [Amazon Creators API documentation](https://affiliate-program.amazon.com/creatorsapi/docs/)

These are reference links, not a claim that this snapshot has been approved or audited against all current requirements. Price watches, automatic deals, website/premium features and programs/bounties remain future work.

## Project documents

- [Architecture and boundaries](ARCHITECTURE.md)
- [Implementation status and known gaps](IMPLEMENTATION_STATUS.md)
- [Security](SECURITY.md)
- [Instructions for coding agents](AGENTS.md)
- [Next Creators API test slice](docs/CODEX_CREATORS_API_TEST.md)

Only source, tests and documentation belong in this repository. Local `.env` files, credentials, databases, dependency directories and compiled output are excluded.
