// Realistic-looking synthetic data. Enterprise-grade naming for a client demo.

import type { OrgAccount, SalesforceOrgState, StripeAccountState, UpgradeScenario } from "./types";

export const ORGS: OrgAccount[] = [
  {
    id: "org_natl_teachers",
    name: "National Teachers Association",
    region: "NA",
    segment: "Enterprise",
    currentPackageVersion: "2.148",
    targetPackageVersion: "3.02",
    contact: { name: "Priya Ramaswamy", email: "priya.r@nta.example.org", title: "VP, Membership Ops" },
    stripeAccountId: "acct_1NatlTeach",
    members: 184_320,
    annualPaymentVolumeUsd: 42_500_000,
    tags: ["dues-heavy", "chapter-model", "high-refund-rate"],
  },
  {
    id: "org_arc_energy",
    name: "ARC Energy Society",
    region: "NA",
    segment: "MidMarket",
    currentPackageVersion: "2.150",
    targetPackageVersion: "3.02",
    contact: { name: "Michael O'Connor", email: "moconnor@arcenergy.example.org", title: "Director of Systems" },
    stripeAccountId: "acct_1ArcEnergy",
    members: 27_450,
    annualPaymentVolumeUsd: 6_100_000,
    tags: ["events", "sponsorships"],
  },
  {
    id: "org_euro_devs",
    name: "European Developers Guild",
    region: "EU",
    segment: "MidMarket",
    currentPackageVersion: "2.147",
    targetPackageVersion: "3.02",
    contact: { name: "Anke Hoffmann", email: "a.hoffmann@eudev.example.eu", title: "Head of Platform" },
    stripeAccountId: "acct_1EuDevGuild",
    members: 63_990,
    annualPaymentVolumeUsd: 9_200_000,
    tags: ["multi-currency", "gdpr", "ticket-required"],
  },
  {
    id: "org_pacific_med",
    name: "Pacific Medical Council",
    region: "APAC",
    segment: "Enterprise",
    currentPackageVersion: "2.149",
    targetPackageVersion: "3.02",
    contact: { name: "Dr. Rina Tanaka", email: "rina@pacmed.example.jp", title: "CIO" },
    stripeAccountId: "acct_1PacMedCouncil",
    members: 96_780,
    annualPaymentVolumeUsd: 18_900_000,
    tags: ["credentialing", "high-security"],
  },
  {
    id: "org_bright_arts",
    name: "Bright Arts Foundation",
    region: "NA",
    segment: "SMB",
    currentPackageVersion: "2.146",
    targetPackageVersion: "3.02",
    contact: { name: "Jason Reyes", email: "jason@brightarts.example.org", title: "Ops Lead" },
    stripeAccountId: "acct_1BrightArts",
    members: 9_140,
    annualPaymentVolumeUsd: 1_400_000,
    tags: ["donations", "small-team"],
  },
  {
    id: "org_uk_actuaries",
    name: "UK Actuaries Institute",
    region: "EU",
    segment: "Enterprise",
    currentPackageVersion: "2.144",
    targetPackageVersion: "3.02",
    contact: { name: "Emma Fitzgerald", email: "emma.f@ukai.example.uk", title: "Head of Digital Ops" },
    stripeAccountId: "acct_1UKActuaries",
    members: 141_200,
    annualPaymentVolumeUsd: 28_400_000,
    tags: ["professional-body", "gbp", "credentialing"],
  },
  {
    id: "org_latam_farmers",
    name: "LATAM Farmers Cooperative",
    region: "LATAM",
    segment: "MidMarket",
    currentPackageVersion: "2.148",
    targetPackageVersion: "3.02",
    contact: { name: "Sofía Vargas", email: "svargas@latamfarmers.example.mx", title: "IT Director" },
    stripeAccountId: "acct_1LatamFarmers",
    members: 46_780,
    annualPaymentVolumeUsd: 12_100_000,
    tags: ["cooperative", "multi-currency", "peak-season"],
  },
];

export function seedSalesforceState(org: OrgAccount): SalesforceOrgState {
  return {
    orgId: org.id,
    packageVersion: org.currentPackageVersion,
    permissions: {
      fonteva_admin: true,
      payments_api: true,
      metadata_deploy: false,
    },
    scheduledJobs: [
      { name: "FontevaPaymentsSync", cron: "0 */10 * * * ?", active: true, class: "PaymentsSyncJob" },
      { name: "FontevaStripeWebhookRelay", cron: "0 */5 * * * ?", active: false, class: "StripeWebhookRelay" },
      { name: "FontevaPayoutReconciliation", cron: "0 15 2 * * ?", active: false, class: "PayoutReconciliationJob" },
    ],
    pageLayouts: [
      { object: "FontevaCharge__c", layout: "Charge Standard Layout", version: 4, upgraded: false },
      { object: "FontevaCharge__c", layout: "Charge Compact Layout", version: 3, upgraded: false },
      { object: "FontevaPayout__c", layout: "Payout Standard Layout", version: 2, upgraded: false },
      { object: "FontevaPayout__c", layout: "Payout Ops Layout", version: 2, upgraded: false },
    ],
    customMetadata: [
      { type: "PaymentsSettings__mdt", developerName: "Default", values: { RetryLimit: 3, EnablePayouts: true } },
    ],
    permissionSets: [
      { name: "Fonteva Payments User", assigned: Math.max(12, Math.floor(org.members / 500)) },
      { name: "Fonteva Payments Admin", assigned: 4 },
    ],
    connectedApps: [
      { name: "Stripe (Fonteva)", provider: "stripe", status: "connected" },
    ],
  };
}

export function seedStripeState(org: OrgAccount): StripeAccountState {
  return {
    accountId: org.stripeAccountId,
    displayName: `${org.name} — Stripe`,
    livemode: true,
    webhooks: [
      {
        id: "we_existing_" + org.id,
        url: `https://payments.fonteva.example/${org.id}/webhook`,
        events: ["charge.succeeded", "invoice.payment_succeeded"],
        status: "enabled",
      },
    ],
    rates: [
      { currency: "USD", percent: 2.9, fixedCents: 30 },
    ],
    payouts: [
      { id: "po_hist_1", amountCents: 4_250_000, currency: "USD", status: "paid", createdAt: new Date(Date.now() - 86_400_000 * 3).toISOString() },
      { id: "po_hist_2", amountCents: 3_980_000, currency: "USD", status: "paid", createdAt: new Date(Date.now() - 86_400_000 * 10).toISOString() },
    ],
  };
}

export const SCENARIOS: UpgradeScenario[] = [
  {
    id: "scn_clean",
    title: "Clean upgrade — happy path",
    summary: "Well-configured Enterprise org. Agents auto-plan config and draft the Stripe email.",
    orgId: "org_natl_teachers",
    seed: {
      outdatedLayouts: ["FontevaCharge__c::Charge Standard Layout", "FontevaPayout__c::Payout Standard Layout"],
      disableJobs: ["FontevaStripeWebhookRelay", "FontevaPayoutReconciliation"],
      stripeMissingWebhookEvents: ["charge.refunded", "payment_intent.succeeded", "payout.paid"],
      stripeMissingRates: ["EUR"],
    },
    expectedOutcome: "clean_upgrade",
  },
  {
    id: "scn_missing_perms",
    title: "Missing prerequisites — HITL required",
    summary: "MetadataDeploy permission missing on a mid-market org. Agent requests engineer approval before continuing.",
    orgId: "org_arc_energy",
    seed: {
      outdatedLayouts: ["FontevaCharge__c::Charge Standard Layout", "FontevaCharge__c::Charge Compact Layout", "FontevaPayout__c::Payout Ops Layout"],
      disableJobs: ["FontevaStripeWebhookRelay"],
      missingPermissions: ["MetadataDeploy"],
      stripeMissingWebhookEvents: ["charge.refunded", "payout.paid"],
    },
    expectedOutcome: "requires_hitl_config_change",
  },
  {
    id: "scn_ticket_required",
    title: "EU tenant — Stripe email required",
    summary: "Direct Stripe API access is not available. Agent drafts a fully-populated email for the Stripe team.",
    orgId: "org_euro_devs",
    seed: {
      outdatedLayouts: ["FontevaCharge__c::Charge Standard Layout", "FontevaPayout__c::Payout Standard Layout", "FontevaPayout__c::Payout Ops Layout"],
      disableJobs: ["FontevaStripeWebhookRelay", "FontevaPayoutReconciliation"],
      stripeMissingWebhookEvents: ["charge.refunded", "payment_intent.succeeded", "payout.paid", "invoice.payment_succeeded"],
      stripeMissingRates: ["EUR", "GBP"],
    },
    expectedOutcome: "requires_hitl_email",
  },
  {
    id: "scn_small_org",
    title: "SMB org — fast path",
    summary: "Small foundation, minimal config drift. Agents complete in under 10 minutes with high confidence.",
    orgId: "org_bright_arts",
    seed: {
      outdatedLayouts: ["FontevaCharge__c::Charge Standard Layout"],
      disableJobs: ["FontevaStripeWebhookRelay"],
      stripeMissingWebhookEvents: ["charge.refunded", "payout.paid"],
    },
    expectedOutcome: "clean_upgrade",
  },
  {
    id: "scn_pacific_med",
    title: "APAC medical — multi-region rollout",
    summary: "Enterprise APAC org with typical drift. Draft Stripe email covers webhooks and USD/EUR rate alignment.",
    orgId: "org_pacific_med",
    seed: {
      outdatedLayouts: ["FontevaCharge__c::Charge Standard Layout", "FontevaCharge__c::Charge Compact Layout", "FontevaPayout__c::Payout Standard Layout"],
      disableJobs: ["FontevaStripeWebhookRelay", "FontevaPayoutReconciliation"],
      stripeMissingWebhookEvents: ["charge.refunded", "payout.paid"],
    },
    expectedOutcome: "clean_upgrade",
  },
  {
    id: "scn_multi_currency",
    title: "Multi-currency EU rollout",
    summary: "Enterprise EU org with GBP + EUR rates missing. Agents draft an email requesting rate alignment and webhook coverage.",
    orgId: "org_uk_actuaries",
    seed: {
      outdatedLayouts: [
        "FontevaCharge__c::Charge Standard Layout",
        "FontevaCharge__c::Charge Compact Layout",
        "FontevaPayout__c::Payout Standard Layout",
        "FontevaPayout__c::Payout Ops Layout",
      ],
      disableJobs: ["FontevaStripeWebhookRelay", "FontevaPayoutReconciliation"],
      stripeMissingWebhookEvents: ["charge.refunded", "payout.paid", "payment_intent.succeeded"],
      stripeMissingRates: ["EUR", "GBP"],
    },
    expectedOutcome: "clean_upgrade",
  },
  {
    id: "scn_deep_drift",
    title: "Aggressive drift — many stale layouts",
    summary: "LATAM cooperative that hasn't upgraded in 18 months. Everything drifted. Agents propose a large plan requiring HITL.",
    orgId: "org_latam_farmers",
    seed: {
      outdatedLayouts: [
        "FontevaCharge__c::Charge Standard Layout",
        "FontevaCharge__c::Charge Compact Layout",
        "FontevaPayout__c::Payout Standard Layout",
        "FontevaPayout__c::Payout Ops Layout",
      ],
      disableJobs: ["FontevaStripeWebhookRelay", "FontevaPayoutReconciliation", "FontevaPaymentsSync"],
      missingPermissions: ["MetadataDeploy"],
      stripeMissingWebhookEvents: ["charge.refunded", "payout.paid", "payment_intent.succeeded", "invoice.payment_succeeded"],
      stripeMissingRates: ["EUR"],
    },
    expectedOutcome: "requires_hitl_config_change",
  },
];

// Applies the scenario overrides on top of the base seed to produce the starting state.
export function applyScenarioSeed(base: SalesforceOrgState, sc: UpgradeScenario): SalesforceOrgState {
  const next: SalesforceOrgState = JSON.parse(JSON.stringify(base));
  if (sc.seed.packageVersionOverride) next.packageVersion = sc.seed.packageVersionOverride;
  if (sc.seed.missingPermissions) {
    for (const p of sc.seed.missingPermissions) {
      if (p === "FontevaAdmin") next.permissions.fonteva_admin = false;
      if (p === "PaymentsAPI") next.permissions.payments_api = false;
      if (p === "MetadataDeploy") next.permissions.metadata_deploy = false;
    }
  }
  if (sc.seed.disableJobs) {
    for (const j of sc.seed.disableJobs) {
      const idx = next.scheduledJobs.findIndex((x) => x.name === j);
      if (idx >= 0) next.scheduledJobs[idx].active = false;
    }
  }
  if (sc.seed.outdatedLayouts) {
    for (const k of sc.seed.outdatedLayouts) {
      const [obj, lay] = k.split("::");
      const idx = next.pageLayouts.findIndex((l) => l.object === obj && l.layout === lay);
      if (idx >= 0) next.pageLayouts[idx].upgraded = false;
    }
    for (const l of next.pageLayouts) {
      if (!sc.seed.outdatedLayouts.includes(`${l.object}::${l.layout}`)) l.upgraded = true;
    }
  }
  if (sc.seed.missingConnectedApps) {
    for (const p of sc.seed.missingConnectedApps) {
      const idx = next.connectedApps.findIndex((a) => a.provider === p);
      if (idx >= 0) next.connectedApps[idx].status = "disconnected";
    }
  }
  return next;
}

export function applyScenarioStripeSeed(base: StripeAccountState, sc: UpgradeScenario): StripeAccountState {
  const next: StripeAccountState = JSON.parse(JSON.stringify(base));
  if (sc.seed.stripeMissingWebhookEvents) {
    for (const wh of next.webhooks) {
      wh.events = wh.events.filter((e) => !sc.seed.stripeMissingWebhookEvents!.includes(e));
    }
  }
  if (sc.seed.stripeMissingRates) {
    next.rates = next.rates.filter((r) => !sc.seed.stripeMissingRates!.includes(r.currency));
  }
  return next;
}

export function orgById(id: string): OrgAccount | undefined {
  return ORGS.find((o) => o.id === id);
}
export function scenarioById(id: string): UpgradeScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
