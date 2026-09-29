# Codex brief: minimal Amazon Creators API access test

**Status: implementation task, not executable code.** The repository does not currently expose `npm run amazon:api:test`.

## Goal

Inspect the existing TypeScript project and implement only a safe local diagnostic that determines whether newly generated EU credential-version 3.2 credentials can retrieve real Amazon.de product data. Credentials exist locally with the operator; do not request or embed them. Do not reuse a previously disclosed credential.

## 1. Verify the current official contract

Before writing authentication or API requests, read the current official Amazon Creators API documentation and cite the pages used in your completion report:

- https://affiliate-program.amazon.com/creatorsapi/docs/
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/search-items
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/troubleshooting/error-codes-and-messages
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference/germany

Confirm the OAuth token endpoint/encoding/scope for the credential version, API operation URL, authorization syntax including any required version metadata, marketplace headers/body fields, partner tag, resource casing and error payloads. Do not copy an unverified earlier chat snippet. Do not implement parallel legacy PA-API 5.0 / AWS Signature V4 authentication. If the current contract cannot be verified, stop before making up a request format.

Distinguish credential version from API version. A credential/version change must not be assumed to preserve endpoints or authorization format.

## 2. Small scope

Implement an auth client, product-query client, access-result classifier and a local CLI, reusing existing abstractions where appropriate. Suggested locations:

```text
src/amazon/creators-api/types.ts
src/amazon/creators-api/CreatorsApiAuthClient.ts
src/amazon/creators-api/CreatorsApiClient.ts
src/amazon/creators-api/CreatorsApiAccessTester.ts
scripts/test-amazon-creators-api.ts
tests/creators-api.test.ts
```

Add `npm run amazon:api:test` using the existing TypeScript tooling. Keep the module independent from Discord; do not import `src/index.ts`, start the bot or require a Discord token for the diagnostic. Include any necessary typechecking for the CLI.

Do not add DB migrations, Discord commands, a scheduler, deal discovery, price monitoring, bounties or a full production provider in this slice.

## 3. Local configuration and secrets

Read these from environment variables / local `.env` only:

```dotenv
AMAZON_CREATORS_CLIENT_ID=
AMAZON_CREATORS_CLIENT_SECRET=
AMAZON_CREATORS_CREDENTIAL_VERSION=3.2
AMAZON_CREATORS_MARKETPLACE=www.amazon.de
AMAZON_CREATORS_PARTNER_TAG=
```

The real tag is provided by the operator locally. No actual personal tracking ID should be hardcoded. For this diagnostic only, marketplace/tag may come from env; long-term per-guild configuration remains DB/application state.

Validate configuration before any HTTP request. `.env.example` remains safe to commit. Never log client ID, client secret, tokens, authorization headers, raw token/API responses or arbitrary exception objects. Use an allowlist of diagnostic fields. Redact secret canaries from unexpected string values before display.

Use fixed officially verified HTTPS endpoints; do not permit secret-bearing requests to arbitrary configurable hosts. Disable unexpected redirects for credential-bearing requests. Add timeouts and safe error handling. Avoid retry storms; honor rate limiting and do not retry eligibility/authentication failures as transient errors. Reuse valid tokens with an expiry safety margin; do not fetch one per product request.

## 4. Real access check

Prefer one `SearchItems` request for Amazon.de with a generic query such as `gaming mouse` and a small result count. Request the minimum supported title resource, optionally price/currency if confirmed in the official reference. Use the actual current body/header names and resource casing; do not guess based on PA-API tutorials.

A token response alone is not proof of product-data access. `ACCESS_OK` requires successfully parsed product records. A successful but empty or malformed response must not be reported as a proven product-data success; classify it separately or as a safe inconclusive API error.

## 5. Statuses

Support at least:

```text
ACCESS_OK
ASSOCIATE_NOT_ELIGIBLE
AUTHENTICATION_FAILED
INVALID_PARTNER_TAG
INVALID_ASSOCIATE
RATE_LIMITED
API_ERROR
```

A separate `CONFIGURATION_ERROR` is recommended. Map verified Amazon error codes/reasons, not just HTTP status. In particular, not every 403 is `AssociateNotEligible`. Keep authentication progress distinct from account/product-access eligibility. Do not infer that a partner tag is valid merely because OAuth succeeded.

`AssociateNotEligible` is an Amazon eligibility result, not a bot crash or a condition the bot can bypass. Explain applicable requirements and possible credential-propagation delay only after verifying current official documentation. Separate "credentials created", "token acquired" and "product data retrieved" in the output.

Use defined CLI exit codes; never mark unsuccessful or inconclusive access as success. No persistent access status in the DB is needed for this diagnostic.

## 6. Safe output

Print marketplace, authentication state, product-access state and classified status. On success show at most three safe product records: ASIN, title, price/currency only when actually returned. Missing offer data is allowed. Never print fabricated example prices as live results.

Do not dump entire requests, responses or stack traces that could contain credentials. Apply redaction to the final formatted output as well as intermediate error handling.

## 7. Tests and completion

Normal `npm test` must use fake credentials and mocked HTTP only. Cover success with real-shaped records, eligibility error, invalid client/token, invalid tag, invalid associate, throttling, timeout/network failure, missing config, malformed/empty data and a generic unexpected provider error.

Include leak-prevention tests with canary values for client ID, secret and token. Ensure canaries do not appear even when an unexpected response echoes them. Test token reuse/expiry and verify no real network call occurs in the normal suite.

Run build and tests, document setup and status meanings, and report files changed plus actual command outcomes. The real diagnostic is operator-triggered only; do not run it in CI or request credentials in chat.

The Basic/Affiliate bot must continue to function without any Creators API variables. Creating credentials must never automatically mark product access as enabled.
