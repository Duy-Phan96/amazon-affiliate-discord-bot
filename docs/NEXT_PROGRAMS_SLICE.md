# Next Slice — Amazon Programs / Bounties

Status: planned next feature after the current API-free affiliate-link server test is stable.

## Product intent

Add a separate Amazon Programs area for promotions such as Amazon Visa, Amazon Prime and Prime Student.

This must remain separate from normal product affiliate links:

- product links use ASIN/product URLs;
- programs use known Amazon landing pages;
- both use the operator's configured marketplace tracking ID;
- bounty/commission amounts must NOT be hardcoded as product truth because Amazon can change them.

The primary admin workflow is:

1. choose an Amazon program;
2. generate its affiliate link from the server's saved tracking ID;
3. optionally write a Discord post in a Markdown-like text editor;
4. preview;
5. publish to a configured channel;
6. optionally save the text as a reusable template;
7. later, optionally schedule the saved template.

## Verified initial DE catalog

Verified against official Amazon PartnerNet pages on 2026-09-30.

### Amazon Visa

Official PartnerNet page:
https://partnernet.amazon.de/promotion/visabounty

Landing-page pattern:
https://www.amazon.de/visabounty?tag=<TRACKING_ID>

### Amazon Prime

Official PartnerNet page:
https://partnernet.amazon.de/promotion/prime

Landing-page pattern currently linked by PartnerNet:
https://www.amazon.de/primegratistesten?tag=<TRACKING_ID>

### Prime Student

Official PartnerNet page:
https://partnernet.amazon.de/promotion/student

Landing-page pattern:
https://www.amazon.de/joinstudent?tag=<TRACKING_ID>

## Important rules

- The catalog stores stable technical metadata, not payout amounts.
- Payouts, qualifications, eligibility text and campaign terms can change and must be treated as current Amazon-side information.
- Never invent a landing page.
- Never transform a product URL into a program URL.
- Program links use the guild's saved tracking ID for that marketplace.
- If DE affiliate mode or a DE tracking ID is missing, program-link generation must fail clearly.
- No Amazon Creators API is required for this module.
- OneLink is not part of program-link generation. In UI it remains an optional guide/information topic.
- Every public affiliate program post keeps a visible affiliate/ad disclosure.
- Program publishing and scheduling are admin/bot-manager actions, not member actions.

## UX target

Command concept:

`/amazon programs`

Private admin panel:

- Amazon Visa
- Amazon Prime
- Prime Student
- more later

After selecting a program:

- program name
- marketplace
- tracking ID status (configured / missing; do not unnecessarily display the full ID)
- generated link status
- official Amazon/PartnerNet guide
- Create Post
- Copy Link / Show Link
- Templates
- Schedule (later)

### Create Post

Open a modal with a user-written template.

Supported placeholders for the first implementation:

- `{affiliate_link}`
- `{program_name}`

Example:

```
💳 **{program_name}**

Du möchtest dir die Amazon Visa ansehen?

👉 {affiliate_link}

#Anzeige
```

The bot replaces placeholders only at preview/publish time.

Do not add arbitrary template execution, HTML, JavaScript or remote content fetching.

## Persistence proposal

Add separate tables instead of mixing this with product watches.

### amazon_program_templates

- id
- guild_id
- name
- program_key
- channel_id nullable
- body
- enabled
- created_by
- created_at
- updated_at

### amazon_program_schedules — later slice

- id
- guild_id
- template_id
- channel_id
- schedule_type
- interval_days nullable
- next_run_at
- last_run_at nullable
- enabled
- created_by
- created_at
- updated_at

Do not persist the final generated affiliate URL in schedules. Resolve the current tracking ID when publishing so a later tracking-ID change applies automatically.

## Scheduling target — later slice

Example:

Amazon Visa
→ every 4 days
→ #amazon-deals
→ saved template
→ affiliate link generated at execution time

Requirements:

- admin-only;
- review before first activation;
- minimum cadence / anti-spam guard;
- one active execution per schedule;
- restart-safe next_run_at;
- persistent delivery reservation before posting;
- safe failure state;
- no silent repeated retry after uncertain delivery;
- enable/disable/edit/delete with confirmation;
- status includes last run and next run.

Do NOT implement scheduling in the catalog-foundation commit.

## Current implemented foundation

The branch `feat/amazon-programs-foundation` adds a pure, Discord-independent catalog and URL builder for the three verified DE programs plus unit tests.

The current VPS test branch should remain stable. Merge this feature only after the live link-flow test is satisfactory.
