# Testing Amazon Creators API Access

This diagnostic is optional. The bot's Basic/Affiliate link features continue to work without Creators API access.

Current official Amazon Creators API documentation was rechecked on 2026-10-01.

Official references:
- https://affiliate-program.amazon.com/creatorsapi/docs/
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/search-items
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/common-request-headers-and-parameters
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/troubleshooting/error-codes-and-messages
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference/germany

## What the test does

For credential version 3.2 (EU), the test:

1. reads `AMAZON_CREATORS_CLIENT_ID` and `AMAZON_CREATORS_CLIENT_SECRET` from the server environment;
2. requests an OAuth 2.0 client-credentials token from Amazon's EU Login with Amazon endpoint;
3. reads the server's current saved Amazon.de tracking ID from SQLite;
4. sends one `SearchItems` request to Amazon.de using:
   - marketplace `www.amazon.de`
   - search index `All`
   - keywords `gaming mouse`
   - up to 3 items
   - title/image/price resources;
5. prints only a safe diagnostic status and a few non-secret product fields.

No Client ID, Client Secret, access token, Authorization header or raw provider response is printed.

## Status values

- `ACCESS_OK` — OAuth and product-data request succeeded.
- `ASSOCIATE_NOT_ELIGIBLE` — credentials may authenticate, but the Associates account currently lacks product API eligibility.
- `AUTHENTICATION_FAILED` — OAuth/client authentication failed.
- `INVALID_PARTNER_TAG` — the target marketplace tracking ID is rejected.
- `INVALID_ASSOCIATE` — Amazon rejected the Associate relationship.
- `RATE_LIMITED` — request throttled.
- `API_ERROR` — another API/network/response error.

Amazon currently documents `AssociateNotEligible` for accounts that do not meet the current eligibility criteria, stated as 10 qualified sales in the trailing 30 days.

## VPS setup

Do not paste credentials into Discord or GitHub.

On the VPS edit only the private environment file:

```bash
nano /opt/amazon-affiliate/.env
```

Add:

```dotenv
AMAZON_CREATORS_CLIENT_ID=
AMAZON_CREATORS_CLIENT_SECRET=
AMAZON_CREATORS_CREDENTIAL_VERSION=3.2
```

Then run the diagnostic inside the existing container:

```bash
cd /opt/amazon-affiliate/app

docker compose --env-file ../.env -f compose.vps.yaml \
  run --rm --no-deps bot npm run amazon:api:test
```

The normal bot does not depend on this test and does not require these credentials.

## Security

- Never commit `.env`.
- Never post credentials in Discord, GitHub issues, screenshots or chat.
- If a secret is exposed, rotate it in Amazon before further testing.
- The product request uses the tracking ID already saved by `/amazon setup`; it does not hardcode a personal tag in source.
