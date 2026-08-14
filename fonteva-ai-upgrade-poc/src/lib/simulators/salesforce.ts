// Simulated Salesforce Metadata API. Persists per-upgrade org state so the demo
// can show "before" & "after" and prove page layouts / jobs / metadata mutated.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { SalesforceOrgState } from "../types";
import { sleep } from "../util";

const RUNTIME_DIR = path.join(process.cwd(), "data", "runtime", "salesforce");

async function ensureDir() {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

function fileFor(orgId: string) {
  return path.join(RUNTIME_DIR, `${orgId}.json`);
}

export async function loadOrg(orgId: string): Promise<SalesforceOrgState | null> {
  await ensureDir();
  try {
    const raw = await fs.readFile(fileFor(orgId), "utf8");
    return JSON.parse(raw) as SalesforceOrgState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveOrg(state: SalesforceOrgState): Promise<void> {
  await ensureDir();
  await fs.writeFile(fileFor(state.orgId), JSON.stringify(state, null, 2), "utf8");
}

export async function ensureOrg(base: SalesforceOrgState): Promise<SalesforceOrgState> {
  const existing = await loadOrg(base.orgId);
  if (existing) return existing;
  await saveOrg(base);
  return base;
}

// ---------- Simulated API surface ----------

export interface ReadinessSnapshot {
  packageOk: boolean;
  currentVersion: string;
  missingPermissions: string[];
  disabledJobs: string[];
  scheduledJobs: Array<{ name: string; cron: string; class: string; active: boolean }>;
  outdatedLayouts: string[];
  pageLayouts: Array<{ object: string; layout: string; version: number; upgraded: boolean }>;
  missingConnectedApps: string[];
  connectedStripeAccount: string | null;
}

export async function inspectReadiness(orgId: string, targetVersion: string): Promise<ReadinessSnapshot> {
  await sleep(180 + Math.random() * 220);
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  const missingPermissions: string[] = [];
  if (!org.permissions.fonteva_admin) missingPermissions.push("FontevaAdmin");
  if (!org.permissions.payments_api) missingPermissions.push("PaymentsAPI");
  if (!org.permissions.metadata_deploy) missingPermissions.push("MetadataDeploy");
  const disabledJobs = org.scheduledJobs.filter((j) => !j.active).map((j) => j.name);
  const outdatedLayouts = org.pageLayouts.filter((l) => !l.upgraded).map((l) => `${l.object}::${l.layout}`);
  const missingConnectedApps = ["stripe"].filter((p) => !org.connectedApps.some((a) => a.provider === p && a.status === "connected"));
  return {
    packageOk: org.packageVersion !== targetVersion,
    currentVersion: org.packageVersion,
    missingPermissions,
    disabledJobs,
    scheduledJobs: org.scheduledJobs.map((j) => ({ name: j.name, cron: j.cron, class: j.class, active: j.active })),
    outdatedLayouts,
    pageLayouts: org.pageLayouts.map((l) => ({ ...l })),
    missingConnectedApps,
    connectedStripeAccount: org.connectedApps.find((a) => a.provider === "stripe")?.status === "connected" ? "acct_connected" : null,
  };
}

export async function upgradePageLayouts(orgId: string, layouts: string[]): Promise<{ upgraded: string[] }> {
  await sleep(240 + Math.random() * 260);
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  const upgraded: string[] = [];
  for (const key of layouts) {
    const [object, layout] = key.split("::");
    const idx = org.pageLayouts.findIndex((l) => l.object === object && l.layout === layout);
    if (idx >= 0) {
      org.pageLayouts[idx].upgraded = true;
      org.pageLayouts[idx].version += 1;
      upgraded.push(key);
    }
  }
  await saveOrg(org);
  return { upgraded };
}

export async function activateScheduledJobs(orgId: string, jobs: string[]): Promise<{ activated: string[] }> {
  await sleep(180 + Math.random() * 200);
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  const activated: string[] = [];
  for (const j of jobs) {
    const idx = org.scheduledJobs.findIndex((x) => x.name === j);
    if (idx >= 0 && !org.scheduledJobs[idx].active) {
      org.scheduledJobs[idx].active = true;
      activated.push(j);
    }
  }
  await saveOrg(org);
  return { activated };
}

export async function grantPermissions(orgId: string, perms: string[]): Promise<{ granted: string[] }> {
  await sleep(140 + Math.random() * 180);
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  const granted: string[] = [];
  for (const p of perms) {
    if (p === "FontevaAdmin" && !org.permissions.fonteva_admin) {
      org.permissions.fonteva_admin = true;
      granted.push(p);
    }
    if (p === "PaymentsAPI" && !org.permissions.payments_api) {
      org.permissions.payments_api = true;
      granted.push(p);
    }
    if (p === "MetadataDeploy" && !org.permissions.metadata_deploy) {
      org.permissions.metadata_deploy = true;
      granted.push(p);
    }
  }
  await saveOrg(org);
  return { granted };
}

export async function upsertCustomMetadata(
  orgId: string,
  records: Array<{ type: string; developerName: string; values: Record<string, string | number | boolean> }>,
): Promise<{ upserted: string[] }> {
  await sleep(200 + Math.random() * 220);
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  const upserted: string[] = [];
  for (const r of records) {
    const idx = org.customMetadata.findIndex((x) => x.type === r.type && x.developerName === r.developerName);
    if (idx >= 0) org.customMetadata[idx] = r;
    else org.customMetadata.push(r);
    upserted.push(`${r.type}.${r.developerName}`);
  }
  await saveOrg(org);
  return { upserted };
}

export async function connectStripeApp(orgId: string): Promise<{ ok: boolean }> {
  await sleep(160 + Math.random() * 180);
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  const idx = org.connectedApps.findIndex((a) => a.provider === "stripe");
  if (idx >= 0) org.connectedApps[idx].status = "connected";
  else org.connectedApps.push({ name: "Stripe (Fonteva)", provider: "stripe", status: "connected" });
  await saveOrg(org);
  return { ok: true };
}

export async function setPackageVersion(orgId: string, version: string): Promise<void> {
  const org = await loadOrg(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);
  org.packageVersion = version;
  await saveOrg(org);
}
