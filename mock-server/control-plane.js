// The control plane (ARCH-GTM-001 P1.4, demo-grade in-repo): tenant catalog,
// per-tenant store provisioning, and migration fan-out — the tax the
// no-RLS/DB-per-customer model charges, paid here first so the mechanics are
// proven before Azure exists.
//
// Demo-grade honesty, stated plainly:
// - At the target each customer gets a dedicated Postgres DATABASE. Here a
//   tenant gets a dedicated SCHEMA in the one configured Postgres (creating
//   databases needs CREATEDB rights and per-DB connections; the catalog /
//   provision / migrate lifecycle — the part worth proving — is identical).
// - Without DATABASE_URL the store is in-memory (dev:all needs zero setup):
//   the same lifecycle runs, the migration ledger is real (versions recorded,
//   table names parsed from the actual SQL), the tables are not.
// - The app's request path does NOT yet read per-tenant data out of these
//   stores — routing the data plane through them is the production step this
//   control plane exists to make possible. Nothing here pretends otherwise.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hasDb, query } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));

// The migration series a tenant store is built from. v1 deliberately IS
// schema.sql — the live-tracking core is the real per-tenant data today, and
// referencing the same file `npm run migrate` applies means zero drift between
// the shared store and tenant stores. At the target this series becomes
// immutable numbered files; demo-grade rides on schema.sql being idempotent.
export const MIGRATIONS = [
  { version: 1, name: 'tenant-store-core', file: 'schema.sql' },
  { version: 2, name: 'decision-ledger', file: 'migrations/002-decision-ledger.sql' },
  { version: 3, name: 'loop-timers', file: 'migrations/003-loop-timers.sql' },
  { version: 4, name: 'ledger-events', file: 'migrations/004-ledger-events.sql' },
];
const LATEST = MIGRATIONS[MIGRATIONS.length - 1].version;

const sqlFor = (m) => readFileSync(join(here, m.file), 'utf8');
const tableNames = (sql) =>
  [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi)].map((x) => x[1].toLowerCase());

// Catalog rows are authoritative in-process (like every other mock-server
// state); in Postgres mode they are ALSO upserted to cp_tenants so a restart
// recovers the catalog, and in memory mode they ride the KV snapshot.
const catalog = new Map(); // id -> row
const memoryStores = new Map(); // id -> { appliedVersions: number[], tables: string[] }

const TENANT_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const schemaNameFor = (id) => `tenant_${id.replace(/-/g, '_')}`;
export const storeMode = () => (hasDb() ? 'postgres-schema' : 'memory');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function ensureCatalogTable() {
  await query(`CREATE TABLE IF NOT EXISTS cp_tenants (
    id             text PRIMARY KEY,
    name           text NOT NULL,
    template       text NOT NULL,
    origin         text NOT NULL DEFAULT 'api',
    status         text NOT NULL,
    schema_name    text,
    migration_version integer NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    provisioned_at timestamptz
  )`);
}

async function saveCatalogRow(row) {
  if (!hasDb()) return;
  await query(
    `INSERT INTO cp_tenants (id, name, template, origin, status, schema_name, migration_version, created_at, provisioned_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET name=$2, template=$3, origin=$4, status=$5, schema_name=$6, migration_version=$7, provisioned_at=$9`,
    [row.id, row.name, row.template, row.origin, row.status, row.schemaName, row.migrationVersion, row.createdAt, row.provisionedAt],
  );
}

/** Apply every pending migration to one tenant's store. Returns {from, to}. */
async function applyMigrations(row) {
  const from = row.migrationVersion;
  if (hasDb()) {
    const schema = row.schemaName;
    await query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await query(`CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
      version int PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const applied = new Set((await query(`SELECT version FROM ${schema}.schema_migrations`)).rows.map((r) => Number(r.version)));
    for (const m of MIGRATIONS) {
      if (applied.has(m.version)) continue;
      // SET LOCAL scopes the search_path to this transaction, so the file's
      // unqualified CREATE TABLEs land in the tenant schema and the shared
      // single-connection pool is never left pointing at it.
      try {
        await query(`BEGIN; SET LOCAL search_path TO ${schema}; ${sqlFor(m)}; COMMIT;`);
      } catch (err) {
        await query('ROLLBACK').catch(() => {});
        throw err;
      }
      await query(`INSERT INTO ${schema}.schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [m.version, m.name]);
    }
  } else {
    const store = memoryStores.get(row.id) ?? { appliedVersions: [], tables: [] };
    for (const m of MIGRATIONS) {
      if (store.appliedVersions.includes(m.version)) continue;
      for (const t of tableNames(sqlFor(m))) if (!store.tables.includes(t)) store.tables.push(t);
      store.appliedVersions.push(m.version);
    }
    memoryStores.set(row.id, store);
  }
  row.migrationVersion = LATEST;
  return { from, to: LATEST };
}

export async function provisionTenant({ id, name, template, origin = 'api' }, { isKnownTemplate }) {
  if (!TENANT_ID_RE.test(id ?? '')) throw httpError(400, 'tenant id must be a lowercase slug (a-z, 0-9, hyphens)');
  if (!name || !String(name).trim()) throw httpError(400, 'name is required');
  if (!isKnownTemplate(template)) throw httpError(400, `unknown template "${template}"`);
  if (catalog.has(id)) throw httpError(409, `tenant "${id}" already exists`);
  const row = {
    id,
    name: String(name).trim(),
    template,
    origin,
    status: 'provisioning',
    storeMode: storeMode(),
    schemaName: hasDb() ? schemaNameFor(id) : null,
    migrationVersion: 0,
    createdAt: new Date().toISOString(),
    provisionedAt: null,
  };
  catalog.set(id, row);
  try {
    await applyMigrations(row);
    row.status = 'ready';
    row.provisionedAt = new Date().toISOString();
  } catch (err) {
    row.status = 'error';
    row.error = err?.message ?? 'provisioning failed';
  }
  await saveCatalogRow(row).catch(() => {});
  if (row.status === 'error') throw httpError(500, `provisioning failed: ${row.error}`);
  return row;
}

export async function deprovisionTenant(id, { allowSeed = false } = {}) {
  const row = catalog.get(id);
  if (!row) throw httpError(404, `tenant "${id}" not found`);
  // The four demo orgs are the product's furniture — deleting one from the
  // control plane would strand the industry pack that still serves it.
  if (row.origin === 'seed' && !allowSeed) throw httpError(400, 'seed tenants cannot be deprovisioned');
  if (hasDb()) {
    if (row.schemaName) await query(`DROP SCHEMA IF EXISTS ${row.schemaName} CASCADE`);
    await query('DELETE FROM cp_tenants WHERE id = $1', [id]).catch(() => {});
  }
  memoryStores.delete(id);
  catalog.delete(id);
  return { ok: true };
}

/** Fan-out: bring every tenant store to the latest migration. The catalog is
 * the worklist — this is the operation that makes DB-per-customer viable. */
export async function migrateAllTenants() {
  const results = [];
  for (const row of catalog.values()) {
    try {
      const { from, to } = await applyMigrations(row);
      row.status = 'ready';
      await saveCatalogRow(row).catch(() => {});
      results.push({ id: row.id, from, to });
    } catch (err) {
      results.push({ id: row.id, from: row.migrationVersion, error: err?.message ?? 'migration failed' });
    }
  }
  return { storeMode: storeMode(), latestVersion: LATEST, results };
}

export function listTenants() {
  return {
    storeMode: storeMode(),
    latestVersion: LATEST,
    tenants: [...catalog.values()],
  };
}

/** Replace-on-recommit for the onboarding factory: one runtime org at a time,
 * so a re-commit swaps the previous onboarded tenant's row and store. */
export async function provisionOnboardedTenant({ id, name, template }, deps) {
  const existing = [...catalog.values()].find((r) => r.origin === 'onboarding');
  if (existing) await deprovisionTenant(existing.id).catch(() => {});
  if (catalog.has(id)) await deprovisionTenant(id, { allowSeed: false }).catch(() => {});
  return provisionTenant({ id, name, template, origin: 'onboarding' }, deps);
}

/** Boot registration of the demo orgs — idempotent, mirrors src/tenants.ts. */
const SEED_TENANTS = [
  { id: 'americana', name: 'Americana Foods', template: 'fmcg' },
  { id: 'medcare-uae', name: 'Medcare UAE (demo)', template: 'healthcare' },
  { id: 'gulfmart', name: 'GulfMart Hypermarkets (demo)', template: 'hypermarket' },
  { id: 'gulf-precision', name: 'Gulf Precision Industries', template: 'manufacturing' },
];

export async function initControlPlane({ isKnownTemplate }) {
  if (hasDb()) {
    await ensureCatalogTable();
    const { rows } = await query('SELECT * FROM cp_tenants');
    for (const r of rows) {
      if (!catalog.has(r.id)) {
        catalog.set(r.id, {
          id: r.id, name: r.name, template: r.template, origin: r.origin,
          status: r.status, storeMode: 'postgres-schema', schemaName: r.schema_name,
          migrationVersion: Number(r.migration_version),
          createdAt: r.created_at?.toISOString?.() ?? String(r.created_at),
          provisionedAt: r.provisioned_at?.toISOString?.() ?? (r.provisioned_at ? String(r.provisioned_at) : null),
        });
      }
    }
  }
  let provisioned = 0;
  for (const seed of SEED_TENANTS) {
    if (catalog.has(seed.id)) continue;
    await provisionTenant({ ...seed, origin: 'seed' }, { isKnownTemplate });
    provisioned += 1;
  }
  return provisioned;
}

// KV snapshot round-trip (memory mode; in pg mode cp_tenants is the ledger).
export function exportControlPlane() {
  return {
    catalog: Object.fromEntries(catalog),
    memoryStores: Object.fromEntries(memoryStores),
  };
}

export function importControlPlane(blob) {
  if (!blob) return;
  catalog.clear();
  memoryStores.clear();
  for (const [k, v] of Object.entries(blob.catalog ?? {})) catalog.set(k, v);
  for (const [k, v] of Object.entries(blob.memoryStores ?? {})) memoryStores.set(k, v);
}

export function registerControlPlaneRoutes(app, { isKnownTemplate, logAudit }) {
  const send = (res, err) => res.status(err.status ?? 500).json({ message: err.message });

  app.get('/api/v1/control-plane/tenants', (_req, res) => res.json(listTenants()));

  app.get('/api/v1/control-plane/migrations', (_req, res) => {
    res.json(MIGRATIONS.map((m) => ({ version: m.version, name: m.name, tables: tableNames(sqlFor(m)) })));
  });

  app.post('/api/v1/control-plane/tenants', async (req, res) => {
    try {
      const { id, name, template } = req.body ?? {};
      const row = await provisionTenant({ id, name, template }, { isKnownTemplate });
      logAudit('org', row.id, `control plane provisioned tenant "${row.name}" (${row.storeMode}, v${row.migrationVersion})`);
      res.status(201).json(row);
    } catch (err) { send(res, err); }
  });

  app.post('/api/v1/control-plane/migrate', async (_req, res) => {
    const out = await migrateAllTenants();
    logAudit('org', 'control-plane', `migration fan-out → v${out.latestVersion} across ${out.results.length} tenant stores`);
    res.json(out);
  });

  app.delete('/api/v1/control-plane/tenants/:id', async (req, res) => {
    try {
      const out = await deprovisionTenant(req.params.id);
      logAudit('org', req.params.id, 'control plane deprovisioned tenant');
      res.json(out);
    } catch (err) { send(res, err); }
  });
}
