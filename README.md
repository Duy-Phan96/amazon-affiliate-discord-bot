# Amazon Affiliate & Deal Discord Bot

A modular Discord bot for creating, managing and scheduling Amazon affiliate posts.

The project is designed around one simple principle:

> **Amazon product URL in → safe affiliate post out.**

The current version intentionally works **without Amazon Creators API / Product Advertising API access**. Affiliate links, Markdown posts, persistent queues, bulk JSON imports and Amazon program posts all work with marketplace tracking IDs alone. Creators API support is optional and reserved for verified live product data later.

Built with **TypeScript**, **discord.js**, **SQLite** and **Docker**.

---

## Project status

This repository is an actively developed, API-free beta intended for controlled server use and portfolio/review purposes.

Current focus:

- reliable affiliate-link generation
- clear Discord UX for administrators
- restart-safe scheduled posting
- reproducible deployment
- strict separation of secrets, application state and Discord UI
- optional future integration with Amazon Creators API

The project does **not** currently claim production-ready multi-tenant SaaS operation.

---

## Features

### Product posts

- Convert full Amazon product URLs into affiliate links.
- Supports Amazon.de, Amazon.com and Amazon.co.uk.
- Uses the tracking ID configured for the **original source marketplace**.
- Never rewrites an ASIN onto another Amazon marketplace.
- Manual product posting with optional title, text and presentation style.
- English bot copy by default.
- Native Discord Amazon link previews when available.

### Queue Manager

The recommended scheduling workflow is:

`/amazon queue manage`

The private dashboard provides:

- **Add Post**
- **View Queue**
- **Start / Pause**
- **Queue Settings**
- **Post Next**
- **Refresh**

Queued posts are stored in SQLite and survive bot or VPS restarts.

Supported scheduling:

- quick presets: 3h, 6h, 12h, 24h
- custom whole-hour interval: **1–168 hours**
- maximum: **50 pending posts**

If delivery cannot be confirmed, the bot pauses instead of blindly retrying and risking duplicate posts.

### Markdown post editor

Queue posts can contain custom Discord Markdown.

Example:

```md
🖱️ **Wireless Gaming Mouse**
A lightweight option for a clean gaming setup and responsive controls.
👉 {affiliate_link}
```

The placeholder:

`{affiliate_link}`

is resolved at preview/publish time using the current tracking ID for the source marketplace.

The bot also:

- appends the project affiliate disclosure
- neutralizes mass mentions such as `@everyone` and `@here`
- validates message length before sending

### Bulk JSON queue import

Multiple posts can be imported with:

`/amazon queue import`

Example:

```json
{
  "version": 1,
  "interval_hours": 3,
  "posts": [
    {
      "url": "https://www.amazon.com/dp/EXAMPLE001",
      "name": "Gaming Mouse",
      "markdown": "🖱️ **Gaming Mouse**\nA lightweight wireless option for a gaming setup.\n👉 {affiliate_link}"
    },
    {
      "url": "https://www.amazon.com/dp/EXAMPLE002",
      "name": "Gaming Headset",
      "markdown": "🎧 **Gaming Headset**\nComfortable audio for gaming and voice chat.\n👉 {affiliate_link}"
    }
  ]
}
```

This allows a complete API-free workflow:

1. research products
2. prepare English Markdown posts manually or with an AI assistant
3. export them as JSON
4. upload the file to Discord
5. review the queue
6. start scheduled posting

See [API-free Queue Guide](docs/API_FREE_QUEUE_GUIDE.md).

### Amazon Programs

`/amazon programs` supports reusable posts for Amazon PartnerNet programs separately from normal product links.

Current catalog includes:

- Amazon Visa
- Amazon Prime
- Prime Student

Program posts:

- use dedicated Amazon landing pages
- resolve the current configured Amazon.de tracking ID
- support reusable templates
- support preview before publishing
- do not require Creators API access

Program payouts and eligibility are intentionally not hardcoded because Amazon can change them.

### Setup and settings

Main Discord command surface:

- `/amazon post`
- `/amazon queue manage`
- `/amazon queue import`
- `/amazon programs`
- `/amazon settings`
- `/amazon setup`

The public slash-command surface is intentionally small. Older lower-level handlers may remain internally for compatibility, but the normal administrator workflow is dashboard-driven.

---

## Marketplace behavior

Marketplace integrity is deliberate.

A product link always remains on its original Amazon marketplace:

| Input | Output marketplace |
|---|---|
| amazon.de | amazon.de |
| amazon.com | amazon.com |
| amazon.co.uk | amazon.co.uk |

The bot does **not** copy an ASIN between marketplaces because the same ASIN may be unavailable or represent a different listing elsewhere.

For English-first content research, Amazon.com can be used as the preferred source. If a real Amazon.com product link is supplied, it remains Amazon.com and uses the configured US tracking ID.

OneLink is treated as an optional **Amazon-side** feature. The bot does not configure, verify or guarantee OneLink redirection.

---

## Architecture

The application is intentionally split into small, testable layers.

```text
Discord interactions / messages
            │
            ▼
   Discord controller
            │
            ▼
Domain + application services
  ├─ product URL parsing
  ├─ affiliate link generation
  ├─ Markdown rendering
  ├─ queue scheduling
  ├─ JSON import validation
  └─ Amazon program rendering
            │
            ▼
Repositories
  ├─ configuration
  ├─ queue state
  ├─ templates
  └─ delivery tracking
            │
            ▼
          SQLite
```

Key design decisions:

- **SQLite/application state is the source of truth.**
- Discord messages are a view/integration layer, not configuration storage.
- Persistent changes use explicit review/save flows where practical.
- Queue state survives process restarts.
- Affiliate links are resolved at publication time rather than permanently stored with stale tracking IDs.
- Delivery attempts are persisted before sending to reduce duplicate delivery risk.
- Unknown delivery outcomes are not automatically retried.
- External Amazon product-data access is optional rather than a dependency of core functionality.

More detail: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Repository structure

```text
src/
  discord/        Discord commands, components and interaction flows
  domain/         Core domain types
  persistence/    SQLite database setup and migrations
  programs/       Amazon program catalog
  repositories/   Persistent data access
  services/       Business logic and validation

scripts/
  register-guild.mjs
  doctor.mjs
  test-amazon-creators-api.mjs

tests/            Vitest and core/tooling checks
docs/             Setup, API-free workflow and testing guides

compose.vps.yaml  Hardened VPS runtime
Dockerfile        Multi-stage container build
```

---

## Requirements

For local development:

- Node.js **22.12+**
- npm
- Discord application/bot
- SQLite is embedded through `better-sqlite3`

For the provided VPS deployment:

- Docker
- Docker Compose
- persistent writable data directory
- private environment file outside the repository

---

## Reproducible local setup

### 1. Clone

```sh
git clone <repository-url>
cd amazon-affiliate-discord-bot
```

### 2. Install dependencies

```sh
npm ci
```

If working from a source snapshot that does not contain a lockfile, generate one first:

```sh
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci
```

### 3. Create a Discord application and bot

Before filling the environment file, create a dedicated Discord application for this project in the **Discord Developer Portal**.

Recommended setup:

1. Create a new application.
2. Open the **Bot** section and create/enable the bot user.
3. Copy the bot token into `DISCORD_TOKEN`.
4. Copy the application's **Application ID / Client ID** into `DISCORD_CLIENT_ID`.
5. Enable **Message Content Intent** if automatic product-link detection is required.
6. Invite the bot to the Discord server you want to use.
7. Enable Discord Developer Mode and copy that server's ID into `DISCORD_GUILD_ID`.

Use a dedicated bot application for this repository rather than reusing credentials from an unrelated production bot.

The bot token is a secret. Never paste it into source files, commits, issues, screenshots or documentation. If a token is exposed, rotate it in the Discord Developer Portal.

### 4. Configure environment

Copy the example:

```sh
cp .env.example .env
```

Required test/runtime variables:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DATABASE_PATH=./data/amazon-test.sqlite
```

Where these values come from:

- `DISCORD_TOKEN` — Discord Developer Portal → your application → Bot
- `DISCORD_CLIENT_ID` — Discord Developer Portal → your application → General Information / Application ID
- `DISCORD_GUILD_ID` — the Discord server ID where commands should be registered and runtime access restricted

Amazon Creators API credentials are optional.

Never commit the real `.env`.

### 5. Validate

```sh
npm run test:tooling
npm run test:core
npm run build
npm test
npm run doctor
```

### 6. Register guild commands

```sh
npm run commands:register
```

Command registration is explicit and guild-scoped for controlled testing. Startup does not silently register commands.

### 7. Start

Development:

```sh
npm run dev
```

Compiled runtime:

```sh
npm run build
npm start
```

---

## Discord permissions

The bot does not require Administrator.

Typical target-channel permissions:

- View Channel
- Send Messages
- Embed Links
- Read Message History

Management commands require **Manage Server**.

The Discord application must have **Message Content Intent** enabled if automatic product-link handling is used.

---

## Docker / VPS deployment

The repository includes a hardened Compose configuration.

Expected layout:

```text
/opt/amazon-affiliate/
  .env
  app/      <- repository checkout
  data/     <- persistent SQLite data
  backups/
```

From:

`/opt/amazon-affiliate/app`

build the image:

```sh
docker compose --env-file ../.env -f compose.vps.yaml build bot
```

Register Discord commands when the command schema changes:

```sh
docker compose --env-file ../.env \
  -f compose.vps.yaml \
  run --rm --no-deps bot npm run commands:register
```

Start or recreate the runtime:

```sh
docker compose --env-file ../.env \
  -f compose.vps.yaml up -d --no-build --force-recreate bot
```

Inspect logs:

```sh
docker compose --env-file ../.env \
  -f compose.vps.yaml logs --tail=50 bot
```

The runtime container:

- runs as a configured non-root UID/GID
- uses a read-only root filesystem
- drops Linux capabilities
- enables `no-new-privileges`
- persists only the SQLite data directory
- uses bounded CPU, memory, PID and log settings
- restarts unless explicitly stopped

---

## Persistent data and backups

Default VPS database location:

```text
/data/amazon.sqlite
```

mapped from:

```text
/opt/amazon-affiliate/data/amazon.sqlite
```

The database contains configuration, queue state, program templates and delivery records.

Before schema/deployment changes, create a SQLite backup while the bot is stopped or use an SQLite-safe backup procedure.

Secrets belong in environment configuration, **not** in SQLite source defaults or Git.

---

## Testing

The project uses several validation layers:

```sh
npm run test:tooling
npm run test:core
npm run build
npm test
```

Tests cover areas including:

- Amazon URL parsing
- marketplace-specific affiliate tags
- API-free setup behavior
- delivery deduplication
- queue persistence
- custom queue intervals
- JSON queue imports
- Markdown rendering
- Discord command registration
- product presentation
- Amazon program templates
- Creators API diagnostic behavior with mocked/fake data

GitHub Actions runs the validation pipeline for repository changes.

A green CI run proves the tested code path passed automated checks; it does not replace live Discord or Amazon account validation.

---

## Optional Creators API diagnostic

Core bot functionality does **not** require Amazon Creators API access.

When credentials are available:

```sh
npm run amazon:api:test
```

The diagnostic separates authentication from product-data eligibility and can report conditions such as:

- access available
- credentials invalid
- invalid tracking/associate configuration
- account not currently eligible
- rate limiting
- API error

Secrets are read from the private environment and are not intentionally printed.

See [Creators API Test Guide](docs/CREATORS_API_TEST.md).

---

## API-free limitations

Without verified Amazon product-data access, the bot intentionally does **not** invent or scrape live facts.

Automatic copy should not claim:

- current price
- discount percentage
- stock availability
- lowest-ever price
- current ratings/review counts
- unverified live product specifications

Safe wording instead points users to Amazon for current details.

This keeps the API-free mode useful without pretending to have live data.

---

## Affiliate disclosure

Public affiliate posts use the short disclosure:

`#ad · Affiliate link`

The operator should also keep the required Amazon Associate statement clearly associated with the relevant site/server/account:

`As an Amazon Associate I earn from qualifying purchases.`

The bot intentionally avoids language such as “use this link to support the server”.

Operators are responsible for verifying that their own Amazon Associates account, traffic source and Discord usage comply with the applicable program terms.

Useful references:

- [Amazon disclosure guidance](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98)
- [Amazon Associates agreement](https://partnernet.amazon.de/help/operating/agreement/)
- [Amazon Associates policies](https://partnernet.amazon.de/help/operating/policies/)

This project is not endorsed by Amazon.

---

## Security

Security principles used by the project:

- no secrets committed to Git
- dedicated environment configuration
- dedicated Discord application recommended
- marketplace IDs stored as application configuration, not source defaults
- no automatic replacement of another publisher's existing affiliate tag
- no blind retry after uncertain message delivery
- least-privilege Discord permissions
- non-root hardened Docker runtime
- input validation for URLs, templates and JSON imports
- mass-mention neutralization

See [SECURITY.md](SECURITY.md).

---

## Current boundaries

The project is intentionally conservative.

Not currently provided:

- automatic Amazon product search
- verified live pricing
- verified discount detection
- live availability
- API-backed images/specifications
- automatic cross-marketplace ASIN rewriting
- public multi-tenant billing/SaaS
- exactly-once distributed delivery guarantees

These boundaries are features of the current design rather than hidden assumptions.

---

## Roadmap

### Current API-free phase

- affiliate-link generation
- setup/settings UX
- manual product posts
- persistent queue
- Markdown editor
- bulk JSON queue import
- custom scheduling
- Amazon program posts/templates
- safe Creators API eligibility diagnostic

### After Creators API access

Planned additions:

- verified product titles
- current prices
- images
- availability
- offer/deal data
- API-backed product search
- richer queue previews
- optional automatic deal discovery

The API-backed layer should remain optional so the existing API-free workflow continues to work.

### Longer term

Possible future directions:

- web dashboard
- multi-server management
- premium/self-hosted packaging
- reusable integration/skill architecture
- additional affiliate providers

---

## Documentation

- [API-free Setup Guide](docs/API_FREE_SETUP.md)
- [API-free JSON Queue Guide](docs/API_FREE_QUEUE_GUIDE.md)
- [Server Test Guide](docs/SERVER_TEST.md)
- [Creators API Test Guide](docs/CREATORS_API_TEST.md)
- [Architecture](ARCHITECTURE.md)
- [Security](SECURITY.md)
- [Implementation Status](IMPLEMENTATION_STATUS.md)
- [V1 Scope](docs/V1_SCOPE.md)

---

## Design goals

This project is intentionally developed as more than a one-off Discord script.

The repository aims to demonstrate:

- maintainable TypeScript structure
- explicit state ownership
- defensive external integration design
- safe secret handling
- restart-safe persistence
- clear administrator UX
- testable business logic
- backward-compatible migrations
- automated regression checks
- reproducible deployment

The goal is a codebase that can be understood, tested and operated by someone other than its original author.
