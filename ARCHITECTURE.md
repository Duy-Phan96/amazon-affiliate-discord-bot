# Architecture — API-free V1 development

Discord controller → pure product-link/validation/draft services → configuration and delivery repositories → SQLite.

The database is the source of truth for saved configuration. Discord messages are views, not configuration storage. In-progress drafts are transient application state, bound to guild/user and expiring after 15 minutes. Cancellation or restart never commits them. Review/Save atomically replaces the enabled marketplace/channel selection; a revision check rejects stale forms.

`ProductLinkService` chooses Basic canonical links or Affiliate links. There is no Amazon network client. The original `AmazonAffiliateService` remains the affiliate URL utility. Neither mode depends on the existing future-facing `ProductProvider` abstraction.

OneLink is an operator declaration and documentation link only. It never rewrites a domain, synthesizes a tag, verifies a marketplace approval or configures an Amazon account. Actual international redirection and eligibility are outside this version.

Legacy schemas receive additive `product_mode` and `revision` columns; existing guilds retain Affiliate mode. New guilds are explicitly inserted as Basic/Off. Existing watch/deal tables remain unused schema placeholders, not features.

`DeliveryRepository` records an event before sending and marks confirmed/unknown outcomes. Replayed events are not sent again; automatic posts also have a 60-second same-product/channel cooldown. The deliberate trade-off is duplicate suppression over automatic recovery from uncertain sends. Exactly-once delivery is not claimed. Reconciliation, retention and multi-instance operations still need dedicated work.

Only Discord infrastructure secrets and optional Creators API credentials live in environment configuration. Product tags are marketplace-specific database settings. The persistent queue scheduler, custom intervals and JSON import are part of the API-free application layer; live Amazon product data remains optional and deferred until account eligibility is available.

Refer to `IMPLEMENTATION_STATUS.md` for validation and release gaps; source implementation is not equivalent to completed production validation.


## Queue and bulk-import path

The API-free queue is intentionally part of the core application rather than an Amazon API adapter.

```text
JSON upload / Queue Manager
          │
          ▼
validation + Markdown template rendering
          │
          ▼
AmazonPostQueueRepository
          │
          ▼
SQLite pending queue
          │
          ▼
AmazonQueueScheduler
          │
          ▼
ProductLinkService resolves the current source-market tracking ID
          │
          ▼
Discord delivery + DeliveryRepository outcome tracking
```

Queue items store their source product URL and post content. Affiliate links are generated at preview/publication time. This keeps queued content compatible with tracking-ID changes while avoiding cross-marketplace ASIN rewriting.

Custom intervals are whole-hour values from 1 to 168. Delivery uncertainty pauses automatic progression instead of retrying blindly.
