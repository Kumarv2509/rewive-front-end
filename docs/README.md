# Rewive documentation

The `docs/` folder is the source of truth for Rewive's architecture and product
specifications, and doubles as an **Obsidian vault** — open this folder directly
as a vault (`Open folder as vault` → select `docs/`).

Docs version with the code: the ARCH-004 you read at tag `2026.08` is the one
that describes what `2026.08` deploys. Changes go through the same pull-request
review as code.

## The ledger

Documents are numbered by series and never renumbered. A document is superseded
by a new version, not rewritten in place under a new number.

| Doc | Title | Status |
|---|---|---|
| [[BRIEF-001-project-brief\|BRIEF-001]] | **Project brief** — what Rewive is, and what it refuses to be | Draft |
| [[ARCH-001-productization-strategy\|ARCH-001]] | SaaS &amp; on-prem productization strategy | Draft |
| [[ARCH-002-multi-cloud-hosting\|ARCH-002]] | Multi-cloud hosting architecture | Draft |
| [[ARCH-003-azure-hld\|ARCH-003]] | Rewive on Azure — High-Level Design | Superseded in part — region &amp; tenancy |
| [[ARCH-004-azure-lld\|ARCH-004]] | Rewive on Azure — Low-Level Design | Superseded in part — region &amp; tenancy |
| [[PROD-001-access-control\|PROD-001]] | In-product access control | Draft |

### Reading aids

| Doc | Title | Status |
|---|---|---|
| [[DIAGRAMS-visual-walkthrough\|DIAGRAMS]] | Visual walkthrough — every architecture and flow diagram in one read | Derived |

A **derived view** collects material that lives in numbered documents. The
numbered document stays the source of truth: edit there first, then update the
derived view. Derived views are never cited by other documents.

### Series

- **BRIEF** — the founding statement of the product. Every other document
  descends from it; when one contradicts the brief, the brief wins or gets
  amended deliberately. Enforced in day-to-day work by the `rewive-brief`
  skill in `.claude/skills/`.
- **ARCH** — how Rewive is built, hosted, and operated. Infrastructure and
  platform concerns.
- **PROD** — what Rewive does and how it behaves. Product and application
  concerns. Notably, in-tenant access control is a PROD document, not an ARCH
  one: the platform guarantees authentication and tenant isolation, the product
  owns everything above that line.

## Existing notes

These predate the ledger and follow their own conventions:

- [[BLUEPRINT]] — the original product blueprint.
- [[FEATURE_INVENTORY]] — what exists in the app today, screen by screen.
- [[HANDOFF]] — the running implementation log.

## Conventions

- **One file per document**, named `<DOC-ID>-<kebab-slug>.md`.
- **Frontmatter** carries `doc`, `title`, `type`, `status`, `owner`, `updated`,
  and `tags`; Obsidian surfaces these as properties and they drive vault-wide
  search.
- **Cross-references use wikilinks** (`[[ARCH-003-azure-hld|ARCH-003]]`) so the
  graph view shows how the documents depend on each other.
- **Entries are numbered** within a document (Entry 01, Entry 02 …) and are
  stable — other documents cite them (`ARCH-003 Entry 06`), so inserting a new
  section means appending, not renumbering.
- **Diagrams are mermaid** in fenced ```mermaid blocks. Obsidian, GitHub, and
  the published HTML versions all render them; no binary image files.
- **Status** is one of `draft` → `reviewed` → `approved` → `superseded`, plus
  `superseded-in-part` for a document whose structure still stands while
  specific decisions in it have been overtaken by what was built. Such a
  document carries a banner at the top naming exactly which entries no longer
  hold and what replaced them; its entries are **not** rewritten in place,
  because other documents cite them by number. ARCH-003 and ARCH-004 are in
  this state — their region (West Europe) and tenancy model (pooled Postgres
  with row-level security) were never deployed.

`.obsidian/` is gitignored — vault workspace state is per-person and shouldn't
travel with the repo. Everything that matters is the markdown itself.
