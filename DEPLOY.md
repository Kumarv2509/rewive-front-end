# Deploying this frontend

The container build in this repo (`Dockerfile` + `nginx.conf`) is **complete and
verified**. What is *not* complete is this app's fit with the production API —
read "Before this can actually serve Americana" below before deploying anything.

## Build

```bash
# Azure target — the FastAPI app is mounted at /api, with no version segment
docker build --build-arg VITE_API_BASE_URL=/api -t rewive-frontend:<tag> .

# Mock-server target (the repo default; the arg can be omitted)
docker build --build-arg VITE_API_BASE_URL=/api/v1 -t rewive-frontend:local .
```

`VITE_API_BASE_URL` is **baked in at build time** — Vite inlines `VITE_*` during
compilation, so it cannot be changed with a container environment variable
afterwards. One image per target.

`npm run build` runs `tsc -b && vite build`, so a type error fails the image
build rather than shipping a broken bundle.

## The container contract

| | |
|---|---|
| Listens on | **80** (`ingress.targetPort` on the container app) |
| Serves | `/usr/share/nginx/html`, the Vite `dist/` output |
| SPA fallback | every unknown path → `index.html` |
| `/api` | returns **404** — see below |
| `/healthz` | returns `200 ok`, for a probe if one is ever added |

`/api` deliberately does **not** fall through to `index.html`. Front Door routes
`/api/*` to the API container app, so nginx should never see it; if that routing
misfires, a 404 says so plainly instead of serving HTML where the client expects
JSON.

Fingerprinted assets under `/assets/` are served `immutable` with a one-year
expiry; `index.html` is `no-store`, so a deploy can never leave a browser on an
old bundle referencing assets that no longer exist.

## Never build over the live tag

The frontend container app runs in **Single revision mode with 100% traffic to
latest**. Overwriting the tag that is currently serving destroys the rollback
path. Push a new tag and switch to it:

```bash
az acr login -n rewivefpa
docker build --build-arg VITE_API_BASE_URL=/api \
  -t rewivefpa.azurecr.io/rewive-frontend:<new-tag> .
docker push rewivefpa.azurecr.io/rewive-frontend:<new-tag>

az containerapp update -n ca-frontend-americana-prod \
  -g rg-rewive-dedicated-americana \
  --image rewivefpa.azurecr.io/rewive-frontend:<new-tag>
```

A manual `containerapp update` is **reverted by the next `terraform apply`**,
because the tag is the `frontend_image_tag` variable in
`rewive-infra/environments/americana`. Update it there too, or the next infra
apply silently rolls the frontend back.

## Before this can actually serve Americana

The image builds and nginx serves it. The app will still not work against the
production API, for three reasons — none of which the container build can fix.

**1. The auth model is different.** Production `POST /api/auth/login` takes
`{email, password}`, sets a **session cookie**, and returns `{user}` — there is
no token in the response body. This app posts `{email, tenantId, industry,
seat}`, expects `{token}`, and sends `Authorization: Bearer`. Needs
`withCredentials: true`, the Bearer interceptor removed, and `src/api/auth.ts`
rewritten.

**2. The claims seam depends on a readable token.** `getAuthClaims()` decodes
the JWT to derive tenant and industry, and `getActiveTenant()` is claims-first.
With an HTTP-only cookie there is no token to decode, so that path has to move
to `GET /api/auth/me`. This reaches `client.ts`, `tenants.ts`, `RequireTenant`
and `useSetIndustry`.

**3. Most of the API surface is not there.** Of 52 top-level paths this UI
calls, **18 exist in production and 34 do not**. Present: Findings, Operating
Picture (`kpi-brain`), Agents (`shadow-org`), Closure KPIs, Notifications,
Tasks, Solutions, Agent specs, P&L, Audit log, Leaderboard, Org profile.
Absent: **Decisions** (the ledger), **Execution** (runs/outcomes),
**Connectors** (tracking-configs, ingest-keys, datasets, sweeps, metrics),
**Performance** (people), the **onboarding factory**, and the **tenant front
door** (`/tenants/resolve`).

Deploying as-is gives a shell where roughly a third of the screens work and the
rest 404. Restricting the build to Americana only (one tenant in
`src/tenants.ts`, industry `fmcg`, no organization switcher) is a fourth,
smaller task on top of those three.

See `docs/HANDOFF.md` for the contract-suite measurement these numbers come from.
