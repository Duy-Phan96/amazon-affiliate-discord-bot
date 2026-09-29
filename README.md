# Amazon Affiliate & Deal Discord Bot

Standalone TypeScript / discord.js prototype for Amazon product/affiliate links. Independent from GamerHQ and other bots.

> **Current priority: finish API-free V1.** The user deferred Creators API / PA-API to a later version on 2026-09-29. The API diagnostic brief is parked, not the next task. See [V1 scope and acceptance criteria](docs/V1_SCOPE.md).

## Current main-branch snapshot

The source on main is still the imported v0.3.0 prototype: DE/US/UK parsing, marketplace-specific affiliate links, SQLite configuration, initial setup/settings/status, selected-channel link replies and a limited future provider abstraction.

Basic mode for non-Associates, reviewed manual product posts, transactional setup and restart-safe duplicate protection are the priority development work, not already completed main-branch features. See [implementation status](IMPLEMENTATION_STATUS.md) for the imported baseline and [agent instructions](AGENTS.md) for the current development order.

The current setup saves individual steps immediately. It is not yet a complete Review/Save/Cancel wizard. Use a development server only. No live Amazon price, product title, image, discount or availability is retrieved or simulated.

## Local development

Install compatible Node.js (the import used Node 22), then run `npm install`. Copy `.env.example` to `.env` locally and create the database directory (`data/` by default).

PowerShell:

```powershell
Copy-Item .env.example .env
New-Item -ItemType Directory -Force data | Out-Null
```

macOS / Linux:

```bash
cp .env.example .env
mkdir -p data
```

Fill `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`; optionally set `DISCORD_GUILD_ID` for a test server. Never share or commit .env. Enable Message Content Intent for automatic message-based link handling.

```bash
npm run build
npm test
npm run dev
```

Import validation was blocked by npm registry DNS failure. Dependencies, full build and tests were not confirmed to pass. No Amazon credentials are needed for current link functionality.

## API-free V1 first

Basic mode will share ordinary product links without affiliate tracking. Affiliate mode will use actual per-marketplace IDs, visible disclosures and optional OneLink guidance. Manual product recommendations, easy channel selection, preview/confirmation and reliable persistence come before API work.

OneLink must be configured with Amazon, outside the bot. The existing boolean only records the operator's declaration; it does not configure accounts, verify redirection, prove commissions or certify Discord usage. Single-marketplace and individual-ID use without OneLink remain supported paths. Never derive a foreign tracking ID by changing its suffix or change a product domain to pretend it is a local product.

[German OneLink guide](https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC) · [Amazon integration guide](https://affiliate-program.amazon.com/help/node/topic/GKHRXG4YEJBTCAFC) · [Disclosure guidance](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98)

Before public use, verify the actual Amazon/Discord deployment and advertising disclosures. A disclosure string or saved declaration is not a legal approval. [Amazon agreement](https://partnernet.amazon.de/help/operating/agreement/) and [program policies](https://partnernet.amazon.de/help/operating/policies/) are official reference points. This project is not endorsed by Amazon.

## Deferred version

[Creators API diagnostic brief](docs/CODEX_CREATORS_API_TEST.md): retained for later, not an active implementation instruction. Recheck official documentation when API work is explicitly resumed. No `amazon:api:test` command exists. API product data, automatic deal discovery and product/price monitoring are not part of the current implementation task.

Website, premium subscriptions, hosted onboarding, extra marketplaces and programs/bounties also remain separate future slices.

[Architecture](ARCHITECTURE.md) · [Security](SECURITY.md) · [Implementation status](IMPLEMENTATION_STATUS.md) · [Current V1 scope](docs/V1_SCOPE.md)
