// Simulated Stripe API + a "ticket outbox" for orgs that require manual routing.
// Persists per-account state.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { StripeAccountState } from "../types";
import { shortId, sleep } from "../util";

const RUNTIME_DIR = path.join(process.cwd(), "data", "runtime", "stripe");
const TICKET_FILE = path.join(process.cwd(), "data", "runtime", "stripe-tickets.json");

async function ensureDir() {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

function fileFor(accountId: string) {
  return path.join(RUNTIME_DIR, `${accountId}.json`);
}

export async function loadAccount(accountId: string): Promise<StripeAccountState | null> {
  await ensureDir();
  try {
    const raw = await fs.readFile(fileFor(accountId), "utf8");
    return JSON.parse(raw) as StripeAccountState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveAccount(state: StripeAccountState): Promise<void> {
  await ensureDir();
  await fs.writeFile(fileFor(state.accountId), JSON.stringify(state, null, 2), "utf8");
}

export async function ensureAccount(base: StripeAccountState): Promise<StripeAccountState> {
  const existing = await loadAccount(base.accountId);
  if (existing) return existing;
  await saveAccount(base);
  return base;
}

// -------------- API surface --------------

export interface WebhookAudit {
  requiredEvents: string[];
  presentEvents: string[];
  missingEvents: string[];
  endpointOk: boolean;
}

const REQUIRED_EVENTS = [
  "charge.succeeded",
  "charge.refunded",
  "payment_intent.succeeded",
  "payout.paid",
  "invoice.payment_succeeded",
];

export async function auditWebhooks(accountId: string, targetUrl: string): Promise<WebhookAudit> {
  await sleep(160 + Math.random() * 180);
  const acct = await loadAccount(accountId);
  if (!acct) throw new Error(`Stripe account not found: ${accountId}`);
  const endpoint = acct.webhooks.find((w) => w.url === targetUrl);
  const present = endpoint?.events ?? [];
  const missing = REQUIRED_EVENTS.filter((e) => !present.includes(e));
  return {
    requiredEvents: REQUIRED_EVENTS,
    presentEvents: present,
    missingEvents: missing,
    endpointOk: !!endpoint && endpoint.status === "enabled",
  };
}

export async function upsertWebhook(
  accountId: string,
  url: string,
  events: string[],
): Promise<{ id: string; created: boolean }> {
  await sleep(220 + Math.random() * 260);
  const acct = await loadAccount(accountId);
  if (!acct) throw new Error(`Stripe account not found: ${accountId}`);
  let created = false;
  let hook = acct.webhooks.find((w) => w.url === url);
  if (!hook) {
    hook = { id: `we_${shortId("wh")}`, url, events: [], status: "enabled" };
    acct.webhooks.push(hook);
    created = true;
  }
  const set = new Set([...hook.events, ...events]);
  hook.events = Array.from(set);
  hook.status = "enabled";
  await saveAccount(acct);
  return { id: hook.id, created };
}

export async function auditRates(
  accountId: string,
  targetRates: Array<{ currency: string; percent: number; fixedCents: number }>,
): Promise<{ missing: typeof targetRates; drift: typeof targetRates }> {
  await sleep(120 + Math.random() * 160);
  const acct = await loadAccount(accountId);
  if (!acct) throw new Error(`Stripe account not found: ${accountId}`);
  const missing: typeof targetRates = [];
  const drift: typeof targetRates = [];
  for (const t of targetRates) {
    const existing = acct.rates.find((r) => r.currency === t.currency);
    if (!existing) missing.push(t);
    else if (existing.percent !== t.percent || existing.fixedCents !== t.fixedCents) drift.push(t);
  }
  return { missing, drift };
}

export async function setRates(
  accountId: string,
  rates: Array<{ currency: string; percent: number; fixedCents: number }>,
): Promise<{ applied: string[] }> {
  await sleep(200 + Math.random() * 240);
  const acct = await loadAccount(accountId);
  if (!acct) throw new Error(`Stripe account not found: ${accountId}`);
  const applied: string[] = [];
  for (const r of rates) {
    const idx = acct.rates.findIndex((x) => x.currency === r.currency);
    if (idx >= 0) acct.rates[idx] = r;
    else acct.rates.push(r);
    applied.push(r.currency);
  }
  await saveAccount(acct);
  return { applied };
}

export async function simulatePayment(accountId: string, amountCents: number, currency: string): Promise<{ id: string; status: "succeeded" | "failed" }> {
  await sleep(320 + Math.random() * 300);
  return { id: `pi_${shortId("pi")}`, status: "succeeded" };
}

export async function simulateRefund(accountId: string, paymentId: string): Promise<{ id: string; status: "succeeded" | "failed" }> {
  await sleep(240 + Math.random() * 260);
  return { id: `re_${shortId("re")}`, status: "succeeded" };
}

export async function simulatePayout(accountId: string, amountCents: number, currency: string): Promise<{ id: string; status: "paid" | "pending" }> {
  await sleep(280 + Math.random() * 320);
  const acct = await loadAccount(accountId);
  const id = `po_${shortId("po")}`;
  if (acct) {
    acct.payouts.push({ id, amountCents, currency, status: "paid", createdAt: new Date().toISOString() });
    await saveAccount(acct);
  }
  return { id, status: "paid" };
}

// -------------- Ticket fallback --------------

export interface StripeTicket {
  id: string;
  accountId: string;
  orgId: string;
  createdAt: string;
  requestedBy: string;
  requestedEvents: string[];
  requestedRates: Array<{ currency: string; percent: number; fixedCents: number }>;
  status: "open" | "resolved";
  body: string;
}

async function readTickets(): Promise<StripeTicket[]> {
  try {
    const raw = await fs.readFile(TICKET_FILE, "utf8");
    return JSON.parse(raw) as StripeTicket[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeTickets(items: StripeTicket[]) {
  await ensureDir();
  await fs.mkdir(path.dirname(TICKET_FILE), { recursive: true });
  await fs.writeFile(TICKET_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function createStripeTicket(input: Omit<StripeTicket, "id" | "createdAt" | "status">): Promise<StripeTicket> {
  const ticket: StripeTicket = {
    ...input,
    id: `TICK-${shortId("st").toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  const items = await readTickets();
  items.push(ticket);
  await writeTickets(items);
  return ticket;
}

export async function listTickets(): Promise<StripeTicket[]> {
  return readTickets();
}
