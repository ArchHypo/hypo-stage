/**
 * Demo seed data for standalone/mocked build (e.g. GitHub Pages).
 * Matches the backend seed migration so the UI looks the same as with a real backend.
 */
import type { Hypothesis, HypothesisEvent, TechnicalPlanning } from '@internal/plugin-hypo-stage-backend';

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const toDate = (ms: number) => new Date(ms);

function techPlan(
  id: string,
  entityRef: string,
  actionType: string,
  description: string,
  expectedOutcome: string,
  documentations: string[],
  targetDate: Date,
): TechnicalPlanning {
  return {
    id,
    entityRef,
    actionType: actionType as TechnicalPlanning['actionType'],
    description,
    expectedOutcome,
    documentations,
    targetDate,
    createdAt: now,
    updatedAt: now,
  };
}

export const seedHypotheses: Hypothesis[] = [
  {
    id: 'seed-payment',
    entityRefs: ['component:default/payment-service', 'component:default/order-service'],
    status: 'Open',
    statement: 'Moving payment processing to a dedicated service will reduce coupling and allow independent scaling.',
    sourceType: 'Other',
    relatedArtefacts: ['https://wiki.example.com/adr-001-payment-service'],
    qualityAttributes: ['Modifiability', 'Scalability'],
    uncertainty: 'Low',
    impact: 'Medium',
    notes: 'POC completed; uncertainty reduced after spike.',
    technicalPlannings: [
      techPlan('tp-payment-1', 'component:default/payment-service', 'Spike', 'Spike on idempotency and reconciliation with order-service.', 'Clear design for payment retries and order consistency.', ['https://wiki.example.com/adr-001-payment-service', 'https://wiki.example.com/spike-payment-idempotency'], toDate(now.getTime() + 14 * dayMs)),
      techPlan('tp-payment-2', 'component:default/payment-service', 'Experiment', 'Run a shadow payment path in parallel to validate latency and failure modes.', 'Metrics and runbook for production cutover.', ['https://wiki.example.com/experiment-payment-shadow'], toDate(now.getTime() + 28 * dayMs)),
      techPlan('tp-payment-3', 'component:default/order-service', 'Modularization', 'Extract payment orchestration into a dedicated module before moving to new service.', 'Clear boundary and contract for payment integration.', ['https://wiki.example.com/order-payment-module'], toDate(now.getTime() + 21 * dayMs)),
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-user',
    entityRefs: ['component:default/user-api'],
    status: 'Open',
    statement: 'Consolidating user identity in a single API will simplify auth and reduce duplicate logic across services.',
    sourceType: 'Other',
    relatedArtefacts: [],
    qualityAttributes: ['Maintainability', 'Security'],
    uncertainty: 'Medium',
    impact: 'High',
    notes: 'Align with Team B roadmap Q2.',
    technicalPlannings: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-inventory',
    entityRefs: ['component:default/legacy-inventory', 'component:default/order-service'],
    status: 'In Review',
    statement: 'Replacing the legacy inventory system with a modern service will improve order fulfilment latency and reliability.',
    sourceType: 'Other',
    relatedArtefacts: ['https://wiki.example.com/inventory-migration'],
    qualityAttributes: ['Performance', 'Reliability'],
    uncertainty: 'Medium',
    impact: 'High',
    notes: 'Migration window agreed with operations; design spike reduced uncertainty.',
    technicalPlannings: [
      techPlan('tp-inv-1', 'component:default/legacy-inventory', 'Tracer Bullet', 'Implement read path to new inventory service alongside legacy.', 'Dual-read validation and latency comparison.', ['https://wiki.example.com/inventory-migration'], toDate(now.getTime() + 7 * dayMs)),
      techPlan('tp-inv-2', 'component:default/order-service', 'Trigger', 'Define migration trigger: switch write path after tracer bullet validation.', 'Go/no-go criteria and rollback plan.', ['https://wiki.example.com/inventory-migration'], toDate(now.getTime() + 21 * dayMs)),
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-notification',
    entityRefs: ['component:default/notification-worker'],
    status: 'Open',
    statement: 'Using an event-driven worker for notifications will decouple producers from delivery and improve retry behaviour.',
    sourceType: 'Other',
    relatedArtefacts: [],
    qualityAttributes: ['Reliability', 'Modifiability'],
    uncertainty: 'Low',
    impact: 'Medium',
    notes: null,
    technicalPlannings: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-example-website',
    entityRefs: ['component:default/example-website'],
    status: 'Validated',
    statement: 'The example-website can stay as a static demo; no need to migrate to the new platform.',
    sourceType: 'Other',
    relatedArtefacts: [],
    qualityAttributes: ['Maintainability'],
    uncertainty: 'Very Low',
    impact: 'Very Low',
    notes: 'Closed after review: out of scope.',
    technicalPlannings: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-api-gateway',
    entityRefs: ['component:default/api-gateway'],
    status: 'Open',
    statement: 'Introducing a shared API gateway may centralise auth and rate limiting but adds a single point of failure.',
    sourceType: 'Other',
    relatedArtefacts: [],
    qualityAttributes: ['Security', 'Reliability'],
    uncertainty: 'Very High',
    impact: 'Very High',
    notes: 'Needs attention: high uncertainty and impact. Technical plans in progress.',
    technicalPlannings: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-analytics',
    entityRefs: ['component:default/analytics-service'],
    status: 'Open',
    statement: 'Migrating analytics to a dedicated data lake could improve reporting latency; impact on existing pipelines is low.',
    sourceType: 'Other',
    relatedArtefacts: [],
    qualityAttributes: ['Performance', 'Modifiability'],
    uncertainty: 'Very High',
    impact: 'Very Low',
    notes: 'Can be postponed; low impact.',
    technicalPlannings: [],
    createdAt: now,
    updatedAt: now,
  },
];

/** Evolution events for payment hypothesis (for chart). */
function paymentEvents(): HypothesisEvent[] {
  const base = now.getTime();
  return [
    { id: 'ev-p-1', hypothesisId: 'seed-payment', eventType: 'CREATE', timestamp: toDate(base - 60 * dayMs), changes: {} as any },
    { id: 'ev-p-2', hypothesisId: 'seed-payment', eventType: 'UPDATE', timestamp: toDate(base - 30 * dayMs), changes: { uncertainty: 'Very High', impact: 'Very High' } as any },
    { id: 'ev-p-3', hypothesisId: 'seed-payment', eventType: 'UPDATE', timestamp: toDate(base - 20 * dayMs), changes: { uncertainty: 'High', impact: 'High' } as any },
    { id: 'ev-p-4', hypothesisId: 'seed-payment', eventType: 'UPDATE', timestamp: toDate(base - 10 * dayMs), changes: { uncertainty: 'Medium', impact: 'High' } as any },
  ];
}

/** Evolution events for inventory hypothesis (for chart). */
function inventoryEvents(): HypothesisEvent[] {
  const base = now.getTime();
  return [
    { id: 'ev-i-1', hypothesisId: 'seed-inventory', eventType: 'CREATE', timestamp: toDate(base - 30 * dayMs), changes: {} as any },
    { id: 'ev-i-2', hypothesisId: 'seed-inventory', eventType: 'UPDATE', timestamp: toDate(base - 14 * dayMs), changes: { uncertainty: 'High', impact: 'Very High' } as any },
    { id: 'ev-i-3', hypothesisId: 'seed-inventory', eventType: 'UPDATE', timestamp: toDate(base - 7 * dayMs), changes: { uncertainty: 'High', impact: 'High' } as any },
  ];
}

const eventsByHypothesisId: Record<string, HypothesisEvent[]> = {
  'seed-payment': paymentEvents(),
  'seed-inventory': inventoryEvents(),
};

export function getSeedEvents(hypothesisId: string): HypothesisEvent[] {
  return eventsByHypothesisId[hypothesisId] ?? [];
}
