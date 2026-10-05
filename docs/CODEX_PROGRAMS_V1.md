# Codex Prompt — Amazon Programs V1 (Admin Posts + Templates, No Scheduler Yet)

Continue the Amazon Affiliate & Deal Discord Bot from the current API-free architecture.

IMPORTANT:
- Read README.md, AGENTS.md, IMPLEMENTATION_STATUS.md, docs/V1_SCOPE.md and docs/NEXT_PROGRAMS_SLICE.md first.
- Creators API / PA-API remains deferred.
- Do not implement price monitoring, deal discovery, Amazon scraping, product data lookup, premium billing or website work.
- Do not redesign unrelated affiliate-link behavior.
- Database/application state remains the source of truth.
- Discord is an adapter/view.
- Preserve the existing VPS test path and current affiliate-link functionality.

GOAL

Implement the first usable Amazon Programs / Bounties feature for admins.

This feature is separate from normal Amazon product links.

Initial supported programs:
- Amazon Visa
- Amazon Prime
- Prime Student

Use the existing pure catalog foundation in:
src/programs/AmazonProgramCatalog.ts

Do not hardcode current bounty/commission amounts into runtime program definitions or Discord copy.
Amazon can change payouts and conditions.

PROGRAM URL GENERATION

A program link must:
1. load the program definition from the central catalog;
2. determine its marketplace;
3. load the guild's current saved tracking ID for that marketplace;
4. fail clearly if Affiliate mode / marketplace / tracking ID is missing;
5. generate the program URL using the catalog's official landing-page pattern;
6. never use OneLink to invent or substitute a tracking ID;
7. never store the generated final URL as long-lived schedule/template state.

Keep program URL generation in an application/service layer independent from Discord.

ADMIN AUTHORIZATION

Program management is an admin action.

For this slice:
- require ManageGuild / Manage Server for /amazon programs;
- do not allow normal members to create, edit, publish or save program templates;
- preserve normal-member automatic product-link handling in configured channels.

Design authorization so a configurable Bot Manager role can be added later without rewriting the module.

DISCORD UX

Add:
/amazon programs

It opens a private admin panel.

Show available programs as components/select menus:
- Amazon Visa
- Amazon Prime
- Prime Student

Selecting a program should show:
- program name
- marketplace
- tracking-ID status (Configured / Missing)
- do NOT unnecessarily display the full tracking ID
- official PartnerNet guide button
- Create Post
- Show/Copy Link where practical
- Back

OneLink should not be a required step and should not be presented as program activation.
If mentioned, it is only an informational link to international setup.

CREATE POST FLOW

Create Post opens a modal.

Fields:
1. Template/Post text — required, multiline
2. Optional template name

Support placeholders:
- {affiliate_link}
- {program_name}

Example body:

💳 **{program_name}**

Du möchtest dir die Amazon Visa ansehen?

👉 {affiliate_link}

#Anzeige

Requirements:
- limit length safely for Discord;
- reject unknown placeholders rather than silently executing them;
- no HTML/JS/template code execution;
- no remote fetch;
- escape/control mentions so templates cannot ping @everyone/@here/roles/users unexpectedly;
- automatically ensure a visible affiliate/ad disclosure is present in the final public post;
- user-provided text is not treated as official Amazon copy.

After modal:
1. choose one of the guild's configured text channels;
2. validate bot and admin permissions at runtime;
3. render private preview;
4. show Publish / Save Template / Back / Cancel;
5. nothing public before explicit Publish;
6. stale config revisions invalidate the preview;
7. double click / repeated publish must not create duplicates.

PUBLISHING

At publish time:
- reload current guild config / marketplace tag;
- regenerate the affiliate link;
- render placeholders then;
- do not trust a link generated earlier in the draft;
- reserve delivery before sending using existing duplicate/delivery infrastructure;
- on uncertain Discord send, mark unknown and do not blindly retry;
- store no raw Discord token or sensitive credentials.

TEMPLATES

Implement persistent saved templates in a new table:

amazon_program_templates:
- id INTEGER PRIMARY KEY AUTOINCREMENT
- guild_id TEXT NOT NULL
- name TEXT NOT NULL
- program_key TEXT NOT NULL
- channel_id TEXT NULL
- body TEXT NOT NULL
- enabled INTEGER NOT NULL DEFAULT 1
- created_by TEXT NOT NULL
- created_at TEXT NOT NULL
- updated_at TEXT NOT NULL

Add appropriate uniqueness/indexing only where justified.

Use additive/idempotent migrations.
Do not break existing SQLite installations.

Template operations:
- list
- save
- use
- edit
- disable
- delete with confirmation

For this slice, scheduling is NOT implemented.

Do not create amazon_program_schedules yet unless required only as documentation.
Do not add a fake scheduler UI.

PROGRAM CATALOG

Keep the central catalog independent from Discord and database persistence.

Initial definitions are sourced from current official PartnerNet guidance:

Amazon Visa:
landing page: https://www.amazon.de/visabounty
official info: https://partnernet.amazon.de/promotion/visabounty

Amazon Prime:
landing page: https://www.amazon.de/primegratistesten
official info: https://partnernet.amazon.de/promotion/prime

Prime Student:
landing page: https://www.amazon.de/joinstudent
official info: https://partnernet.amazon.de/promotion/student

Do not hardcode payout values.
Add comments/doc references that landing pages must be reverified before public releases.

SETTINGS / STATUS

Extend /amazon status or settings minimally to include:
- Program templates: N active
- Programs: available for configured DE affiliate tracking ID / unavailable if missing

Do not clutter the normal product-link setup.

TESTS

Add automated tests for at least:
- catalog contains the three supported DE programs
- URL builder inserts exactly one current configured tag
- malformed tracking ID rejected
- no bounty amount stored in catalog
- missing DE marketplace/tag causes program-link failure
- Basic mode cannot generate affiliate program links
- template placeholder rendering
- unknown placeholder rejection
- mentions neutralized
- final output contains disclosure
- template CRUD persistence
- additive migration on existing DB
- stale config invalidates preview
- publish duplicate protection
- normal members cannot invoke program admin flow

Normal tests must not contact Amazon or Discord.

BUILD / VALIDATION

Run:
npm run test:tooling
npm run test:core
npm run build
npm test

Do not claim success for anything not actually executed.

DOCUMENTATION

Update README / docs to explain:
- product affiliate links vs Amazon Programs
- initial supported programs
- programs use saved tracking IDs
- no Creators API needed
- payouts/conditions are not hardcoded and should be checked in PartnerNet
- OneLink is optional guidance, not required for program links
- templates are supported
- scheduling is a later slice

SCOPE BOUNDARY

Explicitly do NOT implement yet:
- recurring scheduling
- automatic every-X-days posting
- hosted dashboard
- premium billing
- Creators API
- product prices/images/search
- extra Amazon programs whose official landing page has not been verified

At the end report:
- files created
- files changed
- migrations
- commands/tests run and exact results
- known limitations
- next recommended slice: restart-safe program scheduling
