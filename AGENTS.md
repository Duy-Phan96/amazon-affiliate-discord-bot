# Coding agent instructions

This is an independent Amazon Affiliate & Deal Discord Bot, not an extension of GamerHQ. Read `README.md`, `IMPLEMENTATION_STATUS.md` and `docs/V1_SCOPE.md` first. Do not mistake a roadmap entry or a database table for an implemented feature.

## Current priority — API-free V1

The user explicitly deferred Creators API / PA-API to a later version on 2026-09-29. Finish and validate Basic/Affiliate product links, optional OneLink guidance, setup UX, manual product posts, persistence and duplicate protection first.

`docs/CODEX_CREATORS_API_TEST.md` is a parked future brief, NOT the next task. Do not implement its diagnostic, OAuth, any product API request, a parallel legacy PA-API integration, deal scanning or price monitoring unless the user explicitly reopens that version.

## Architecture

- Database/application state is the source of truth. Discord is an adapter/view.
- Keep configuration, persistence, product link services/providers and Discord UI separate.
- Preserve marketplace separation; never synthesize foreign tracking IDs or swap product domains.
- Secrets come from environment/secret management; guild configuration belongs in the database.
- Basic mode uses no affiliate tag. Affiliate mode uses the operator's actual marketplace tag. Neither mode may depend on API access.
- API support remains an optional future provider; never allow missing eligibility to break the baseline.
- Prefer small, testable changes. Do not implement the whole roadmap in one task.

## Security and UX

- No real secrets, access tokens, database files or .env files in commits, logs or Discord.
- Recheck runtime authorization and target-channel permissions. Require a preview/save confirmation for setup and manual public posts.
- Cancelled/expired drafts must not alter saved configuration. Prevent stale forms from overwriting newer settings.
- Never dump raw SDK exceptions or request payloads. Tests use fake data only.
- Do not fabricate prices, availability, product data, API eligibility or legal approvals.
- OneLink is optional. A saved declaration is not evidence of validated redirection or accepted Discord usage.
- Keep link-level affiliate disclosure and explain the separate account/site disclosure requirement using official sources.

## Validation and release gates

Run `npm run test:core`, `npm run build` and `npm test` after installing dependencies. Normal tests must not contact Amazon or Discord. Report actual results and environment blockers. Core tests alone are not a complete Discord/SQLite integration test.

Before merging a feature branch, complete the build, persistence tests and a development-server walkthrough. Check staged filenames/content for secrets. Do not mark V1 production-ready merely because source code exists.
