# Security

## Credentials

- Keep Discord tokens and future Amazon client IDs/secrets in local environment variables or a deployment secret manager, never source code or Discord messages.
- `.env.example` contains empty credential placeholders only. `.env` and `.env.*` are ignored, with `.env.example` as the explicit exception.
- Never attach environment files, token responses, credential downloads or full HTTP headers to issues, pull requests or chat messages.
- Do not log credentials, bearer tokens, authorization headers or unfiltered request/response objects.
- Revoke and replace any credential that was accidentally shared. Deleting it from a file is not a substitute for revocation.
- A private repository is not a secret store. Do not commit secrets even to a private branch.

## Repository hygiene

Local databases, runtime data, logs, dependency directories, compiled output, credential folders and common private-key files are ignored. A `.gitignore` rule does not remove already tracked data: review `git status` and staged changes before every commit.

The import included a text-pattern/filename check and manual source inspection. This is not a comprehensive security audit. Future logging and error handling need regression tests that prove fake credential canaries never appear in diagnostic output.

## Development status

The current Discord controller is a prototype. In particular, runtime permission rechecks, setup ownership/concurrency, safe error handling and transactional setup need hardening before deployment. Do not run it as a public multi-tenant paid service yet.

New API code must use fixed official HTTPS endpoints, timeouts, redacted diagnostics and injected/mock HTTP transport in tests. Never send real credentials to a user-configurable endpoint. Do not use old disclosed credentials for testing.

Do not submit a public vulnerability report containing a real credential. Share a minimal reproduction using fake values and keep sensitive reports private.
