---
doc: DIAGRAMS
title: Visual walkthrough — every architecture and flow diagram
type: derived view
status: draft
owner: Praveen
updated: 2026-07-30
tags: [diagrams, overview, onboarding]
---

# Visual walkthrough — every architecture and flow diagram

Every diagram from the architecture and product documents, in one place, ordered
as a narrative rather than by document number: what the system *is*, how a
request moves through it, who is allowed to see what, how it lands on Azure, and
what changes on the other clouds.

> [!important] This is a derived view
> Every diagram here is copied from a numbered document, which remains the
> source of truth. **Edit the diagram in its source document, then update it
> here** — never the other way round. Each section names its source.

## Contents

| # | Diagram | Source |
|---|---|---|
| 0 | How to read these diagrams | — |
| 1 | The system in one picture | [[ARCH-002-multi-cloud-hosting\|ARCH-002]] Entry 02 |
| 2 | How a request flows | [[ARCH-001-productization-strategy\|ARCH-001]] Entry 03 |
| 3 | Who is allowed to see what | [[PROD-001-access-control\|PROD-001]] Entry 05 |
| 4 | Azure — context | [[ARCH-003-azure-hld\|ARCH-003]] Entry 02 |
| 5 | Azure — components | [[ARCH-003-azure-hld\|ARCH-003]] Entry 04 |
| 6 | Azure — network and traffic | [[ARCH-004-azure-lld\|ARCH-004]] Entry 02 |
| 7 | AWS | [[ARCH-002-multi-cloud-hosting\|ARCH-002]] Entry 03 |
| 8 | Google Cloud | [[ARCH-002-multi-cloud-hosting\|ARCH-002]] Entry 05 |
| 9 | Huawei Cloud | [[ARCH-002-multi-cloud-hosting\|ARCH-002]] Entry 06 |

---

## 0 · How to read these diagrams

The same shapes mean the same things throughout:

| Shape | Meaning | Example |
|---|---|---|
| `([ rounded ])` | A person or external actor | Tenant browser |
| `[ rectangle ]` | A running service or component | API service, worker |
| `[( cylinder )]` | A datastore | PostgreSQL, object storage |
| `{{ hexagon }}` | An internal module, not a deployed service | LLM gateway, policy module |
| `subgraph box` | A trust or network boundary | VPC, VNet, private subnets |
| Dotted arrow | An out-of-band or verification path | Token verification |

Two things recur in every topology and are worth watching for, because they are
the load-bearing decisions:

- **The worker is always separate from the API.** It owns SLA clocks and
  escalations. Rewive's promise — *nothing drifts unanswered* — is only as
  reliable as this component.
- **The queue lives inside PostgreSQL**, not in a separate broker. That is why
  the database restore point is also the escalation-state restore point.

---

## 1 · The system in one picture

*Source: ARCH-002 Entry 02 — the portable reference architecture.*

Cloud-agnostic. Every provider mapping later in this document is this diagram
with vendor names substituted.

```mermaid
flowchart LR
  U([Tenant browser<br/>acme.rewive.app]) --> DNS[DNS]
  DNS --> CDN[CDN + WAF<br/>TLS, wildcard cert]
  CDN -->|static| SPA[(SPA bundle<br/>object storage)]
  CDN -->|/api| LB[Load balancer]
  subgraph VNET [Private network]
    LB --> API[API service ×N<br/>stateless containers]
    WRK[Worker ×N<br/>SLA clocks · escalations]
    API --> PG[(PostgreSQL<br/>RLS pooled tenancy)]
    WRK --> PG
    API --> RD[(Redis<br/>cache · rate limits)]
    API --> OBJ[(Object storage<br/>attachments · exports)]
    API --> SEC[Secrets manager]
  end
  API --> IDP[OIDC identity provider]
  API --> LLMG{{LLM gateway module}}
  WRK --> LLMG
  LLMG --> CL[Claude<br/>per-cloud provider]
```

**What to notice:** only four things are stateful — Postgres, Redis, object
storage, and the secrets manager. Everything else is a replaceable container.
That is the entire reason a fifth cloud is a two-week exercise.

---

## 2 · How a request flows

*Source: ARCH-001 Entry 03.*

The path from browser to database, and where tenant isolation is established.

```mermaid
flowchart LR
  B([Browser]) --> CDN[CDN · static SPA]
  CDN --> API[API gateway]
  API --> AUTH[OIDC — JWT carries tenant + role]
  AUTH --> SVC[API service<br/>resolves tenant · sets RLS context]
  SVC --> PG[(Postgres · RLS)]
  SVC --> RD[(Redis · cache, rate limits)]
  SVC --> OBJ[(Object storage)]
  WRK[Worker<br/>SLA clocks · escalations · digests] --> PG
  SVC --> LLM{{LLM gateway}}
  WRK --> LLM
```

**What to notice:** the tenant is established *once*, early, by middleware that
sets `app.tenant_id` on the transaction. Everything downstream is filtered by
row-level security in the database. No application query names another tenant's
rows, so isolation does not depend on any developer remembering to add a
`WHERE` clause.

---

## 3 · Who is allowed to see what

*Source: PROD-001 Entry 05 — authorization evaluation.*

Tenant isolation (above) answers *which company's data exists for you*. This
answers *what you may do inside it* — a separate, application-layer concern.

```mermaid
flowchart LR
  REQ([Request<br/>JWT + Host]) --> MW[Tenant middleware<br/>resolve tenant · SET LOCAL app.tenant_id]
  MW --> CTX[Actor context<br/>role · teams · owned ids · grants]
  CTX -->|cache hit| POL{{can-actor-action-resource}}
  CTX -.miss: 1 query, then cache.-> DB[(Postgres)]
  POL -->|allow| H[Handler]
  POL -->|deny| D[403 + audit counter]
  H --> SCOPE[List queries compiled<br/>with visibility predicates]
  SCOPE --> DB
```

**What to notice:** two distinct outputs from one policy module. Point decisions
("may this actor close this finding?") return allow or deny. List queries get
compiled into SQL predicates instead — filtering after the query would corrupt
pagination and counts, and the Today queue's numbers have to be honest.

---

## 4 · Azure — context

*Source: ARCH-003 Entry 02.*

The same reference architecture, with Azure services named.

```mermaid
flowchart LR
  U([Tenant user<br/>acme.rewive.app]) --> AFD[Azure Front Door Premium<br/>TLS · WAF · CDN]
  AFD -->|static| SPA[(Blob Storage<br/>SPA bundle)]
  AFD -->|/api via Private Link| ACA[Container Apps<br/>API + worker]
  ACA --> PG[(PostgreSQL<br/>Flexible Server)]
  ACA --> RD[(Managed Redis)]
  ACA --> BL[(Blob Storage<br/>attachments)]
  ACA --> KV[Key Vault]
  ACA --> FND[Microsoft Foundry<br/>Claude]
  U -.OIDC sign-in.-> IDP[Entra ID / WorkOS]
  ACA -.tokens verified.-> IDP
```

**What to notice:** the user authenticates directly against the identity
provider; the API only ever *verifies* the resulting token. Rewive never handles
a password.

---

## 5 · Azure — components

*Source: ARCH-003 Entry 04.*

Production detail: replica counts, the private-endpoint layer, and the
deployment-time migration job.

```mermaid
flowchart TB
  subgraph EDGE [Global edge]
    DNS[Azure DNS<br/>rewive.app zone] --> AFD[Front Door Premium<br/>WAF policy · rules engine]
  end
  AFD -->|/*| SPAO[(Storage static site<br/>SPA origin)]
  AFD -->|/api/* Private Link| ILB[ACA internal ingress]
  subgraph VNET [VNet 10.20.0.0/22 · West Europe]
    subgraph ACAENV [Container Apps environment · internal]
      ILB --> API[ca-api<br/>2–10 replicas]
      WRK[ca-worker<br/>1–3 replicas]
      MIG[job-migrate<br/>on deploy]
    end
    subgraph PE [Private endpoints subnet]
      PEP[PE: Postgres] & PER[PE: Redis] & PEB[PE: Blob] & PEK[PE: Key Vault]
    end
    API --> PEP; WRK --> PEP; MIG --> PEP
    API --> PER; API --> PEB; WRK --> PEB
    API --> PEK; WRK --> PEK
  end
  PEP --> PGF[(PostgreSQL Flexible<br/>zone-redundant HA)]
  PER --> AMR[(Azure Managed Redis)]
  PEB --> ST[(Storage account<br/>attachments · exports)]
  PEK --> KV[Key Vault]
  API --> FND[Microsoft Foundry · Claude]
  WRK --> FND
  API & WRK --> MON[Log Analytics ·<br/>Application Insights]
```

**What to notice:** `job-migrate` reaches Postgres but nothing else, and runs
under its own identity with a database role that can `ALTER`. The API's role
cannot. Schema changes and request handling are separated by credential, not by
convention.

---

## 6 · Azure — network and traffic

*Source: ARCH-004 Entry 02.*

The security-review diagram: every route in and out.

```mermaid
flowchart LR
  NET([Internet]) --> AFD[Front Door Premium<br/>WAF · rules]
  AFD -->|Private Link| SPA[(strewiveprodspa<br/>static site)]
  AFD -->|Private Link| ILB[cae internal LB]
  subgraph VNET [vnet-rewive-prod-weu 10.20.0.0/22]
    subgraph SACA [snet-aca /23]
      ILB --> API[ca-api-prod]
      WRK[ca-worker-prod]
    end
    subgraph SPE [snet-pe /24]
      P1[PE postgres] & P2[PE redis] & P3[PE blob] & P4[PE keyvault] & P5[PE acr]
    end
    API --> P1 & P2 & P3 & P4
    WRK --> P1 & P3 & P4
  end
  API -->|egress allowlist| EXT[Foundry · WorkOS · ACS]
```

**What to notice:** there is exactly one arrow from the internet into the
system, and it terminates at Front Door. The Container Apps environment is
internal-only; Postgres, Redis, Blob, Key Vault, and ACR have public network
access disabled entirely. Egress is an allowlist, not a default-open route.

---

## 7 · AWS

*Source: ARCH-002 Entry 03. The recommended pooled-SaaS home cloud.*

```mermaid
flowchart LR
  R53[Route 53] --> CF[CloudFront + WAF]
  CF -->|static| S3S[(S3 · SPA)]
  CF -->|/api| ALB[ALB]
  subgraph VPC [VPC · private subnets ×2 AZ]
    ALB --> ECS[ECS Fargate<br/>API + worker]
    ECS --> AUR[(Aurora PostgreSQL<br/>Multi-AZ)]
    ECS --> EC[(ElastiCache)]
    ECS --> VPCE[VPC endpoints<br/>S3 · Secrets · Bedrock]
  end
  VPCE --> BR[Bedrock · Claude]
  VPCE --> S3D[(S3 · attachments)]
```

**What to notice:** Claude is reached through a VPC endpoint, so inference
traffic never traverses the public internet. This is the strongest version of
the LLM story in a security review, and the main reason AWS is the default
recommendation.

---

## 8 · Google Cloud

*Source: ARCH-002 Entry 05. The leanest serverless expression.*

```mermaid
flowchart LR
  CDNS[Cloud DNS] --> GLB[Global HTTPS LB<br/>Cloud CDN + Cloud Armor]
  GLB -->|static| GCS[(Cloud Storage · SPA)]
  GLB -->|/api| CR[Cloud Run · API]
  subgraph VPC [VPC · private access]
    CR --> SQL[(Cloud SQL<br/>PostgreSQL, regional HA)]
    CRW[Cloud Run · worker<br/>min-instances 1] --> SQL
    CR --> MS[(Memorystore)]
    CR --> SM[Secret Manager]
  end
  CR --> VAI[Vertex AI · Claude]
  CRW --> VAI
  CR --> GCSD[(Cloud Storage · attachments)]
```

**What to notice:** the worker is pinned to `min-instances 1`. Cloud Run
throttles CPU on idle instances, which would silently stall SLA clocks — the one
place where a serverless default actively breaks the product promise.

---

## 9 · Huawei Cloud

*Source: ARCH-002 Entry 06. Dedicated deployments only, never a pooled-SaaS home.*

```mermaid
flowchart LR
  HDNS[Cloud DNS] --> HCDN[CDN + WAF]
  HCDN -->|static| OBS1[(OBS · SPA)]
  HCDN -->|/api| ELB[ELB]
  subgraph VPC [VPC · private subnets]
    ELB --> CCE[CCE cluster<br/>Helm: API + worker + Keycloak]
    CCE --> HRDS[(RDS for PostgreSQL)]
    CCE --> DCS[(DCS Redis)]
  end
  CCE --> OBS2[(OBS · attachments)]
  CCE -->|NAT egress<br/>intl. regions only| ANT[Anthropic API]
```

**What to notice:** two differences from every other mapping. Keycloak ships
*inside* the cluster, because there is no managed customer-IdP equivalent. And
the Anthropic arrow is conditional — it exists in international regions only.
In mainland-China regions LLM features are flagged off entirely, and the
deterministic SLA and escalation core is what gets sold.
