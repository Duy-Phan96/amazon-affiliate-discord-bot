# Coding agent instructions

This is an independent Amazon Affiliate & Deal Discord Bot, not an extension of GamerHQ. Read `README.md` and `IMPLEMENTATION_STATUS.md` before making changes. Do not mistake a roadmap entry or database table for an implemented feature.

## Architecture

- Database/application state is the source of truth. Discord is an adapter/view.
- Keep configuration, persistence, Amazon services/providers, Discord UI and scheduling separate.
- Preserve marketplace separation; never synthesize foreign tags or swap product domains.
- Secrets come from environment/secret management. Guild configuration belongs in the database.
- API support is optional; missing API eligibility must not disable unrelated functionality.
- Prefer small, testable changes. Do not implement the entire roadmap in one task.

## Security and UX

- No real secrets, access tokens, database files or `.env` files in commits, logs or Discord.
- Use fake credentials only in test fixtures. Never dump raw provider exceptions/HTTP payloads.
- Use explicit runtime authorization, least privilege, review/confirmation, idempotency and restart-safe behavior when implementing UI/persistent operations.
- Do not fabricate prices, discounts, availability, API permissions or legal approvals.
- A configured OneLink preference is not evidence of validated OneLink behavior.

## Next task

The agreed next slice is `docs/CODEX_CREATORS_API_TEST.md`: a local Amazon.de Creators API access diagnostic. Do not add a legacy PA-API signing path. Verify current official Amazon documentation before coding exact endpoints, headers, resource names or OAuth parameters. If official documentation cannot be verified, report the blocker rather than guessing.

Do not implement Discord API commands, production integration, monitoring, deal scanning, premium billing or bounty programs as part of this test slice.

## Validation

Run `npm run build` and `npm test` after installing dependencies. Normal tests must not contact Amazon or Discord. Report actual commands and results, including environment blockers. Never label unexecuted tests as passing. Check staged filenames and content for secrets before committing.
