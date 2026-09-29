# Architecture review

- Database/application state is authoritative; Discord is only an adapter/view.
- Marketplace is explicit on every Amazon-facing entity; no cross-market domain swapping.
- Amazon URL parsing, affiliate generation, and ProductProvider are Discord-independent.
- Setup/schema operations are designed to be idempotent and restart-safe.
- Live prices, discounts, availability and deal discovery are capability-gated behind ProductProvider.
- Short links should be resolved by a dedicated HTTP resolver with allowlisted redirect targets, timeouts and redirect limits before parsing.
- Production should move persistence to PostgreSQL behind repositories; SQLite is appropriate for local/self-hosted V1.
- Discord permissions should be minimal: View/Send/Embed/Read History plus application commands; no Administrator permission.
- Destructive watch deletion requires confirmation in the UI implementation.
