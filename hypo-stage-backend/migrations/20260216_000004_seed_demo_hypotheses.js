// @ts-check
/**
 * Seeds demo hypotheses for standalone (Option A).
 * - When the hypothesis table is empty: inserts all hypotheses, plus evolution events and
 *   technical planning for the payment and inventory hypotheses (so the "Evolução da Incerteza
 *   e Impacto" chart and technical planning list have example data).
 * - When the table already has rows (e.g. from an older seed): backfills evolution events and
 *   technical planning for the payment and inventory hypotheses if they have none.
 *
 * down() only removes rows that match the full seed record (statement + other fields), so
 * user-created hypotheses with the same statement text are not deleted.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
const PAYMENT_STATEMENT = 'Moving payment processing to a dedicated service will reduce coupling and allow independent scaling.';
const INVENTORY_STATEMENT = 'Replacing the legacy inventory system with a modern service will improve order fulfilment latency and reliability.';

/** Full seed rows; used by up() to insert and by down() to delete only these exact records. */
const SEED_HYPOTHESES = [
  {
    entityRefs: JSON.stringify(['component:default/payment-service', 'component:default/order-service']),
    status: 'Open',
    statement: 'Moving payment processing to a dedicated service will reduce coupling and allow independent scaling.',
    sourceType: 'Architecture Decision',
    relatedArtefacts: JSON.stringify(['https://wiki.example.com/adr-001-payment-service']),
    qualityAttributes: JSON.stringify(['Modifiability', 'Scalability']),
    uncertainty: 'Low',
    impact: 'Medium',
    notes: 'POC completed; uncertainty reduced after spike.',
  },
  {
    entityRefs: JSON.stringify(['component:default/user-api']),
    status: 'Open',
    statement: 'Consolidating user identity in a single API will simplify auth and reduce duplicate logic across services.',
    sourceType: 'Technical Planning',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Maintainability', 'Security']),
    uncertainty: 'Medium',
    impact: 'High',
    notes: 'Align with Team B roadmap Q2.',
  },
  {
    entityRefs: JSON.stringify(['component:default/legacy-inventory', 'component:default/order-service']),
    status: 'In Progress',
    statement: 'Replacing the legacy inventory system with a modern service will improve order fulfilment latency and reliability.',
    sourceType: 'Architecture Decision',
    relatedArtefacts: JSON.stringify(['https://wiki.example.com/inventory-migration']),
    qualityAttributes: JSON.stringify(['Performance', 'Reliability']),
    uncertainty: 'Medium',
    impact: 'High',
    notes: 'Migration window agreed with operations; design spike reduced uncertainty.',
  },
  {
    entityRefs: JSON.stringify(['component:default/notification-worker']),
    status: 'Open',
    statement: 'Using an event-driven worker for notifications will decouple producers from delivery and improve retry behaviour.',
    sourceType: 'Technical Planning',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Reliability', 'Modifiability']),
    uncertainty: 'Low',
    impact: 'Medium',
    notes: null,
  },
  {
    entityRefs: JSON.stringify(['component:default/example-website']),
    status: 'Closed',
    statement: 'The example-website can stay as a static demo; no need to migrate to the new platform.',
    sourceType: 'Architecture Decision',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Simplicity']),
    uncertainty: 'Very Low',
    impact: 'Very Low',
    notes: 'Closed after review: out of scope.',
  },
  {
    entityRefs: JSON.stringify(['component:default/api-gateway']),
    status: 'Open',
    statement: 'Introducing a shared API gateway may centralise auth and rate limiting but adds a single point of failure.',
    sourceType: 'Architecture Decision',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Security', 'Reliability']),
    uncertainty: 'Very High',
    impact: 'Very High',
    notes: 'Needs attention: high uncertainty and impact. Technical plans in progress.',
  },
  {
    entityRefs: JSON.stringify(['component:default/analytics-service']),
    status: 'Open',
    statement: 'Migrating analytics to a dedicated data lake could improve reporting latency; impact on existing pipelines is low.',
    sourceType: 'Technical Planning',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Performance', 'Modifiability']),
    uncertainty: 'Very High',
    impact: 'Very Low',
    notes: 'Can be postponed; low impact.',
  },
];

function getEvolutionEventsForPayment(insertedId, now, dayMs) {
  return [
    { hypothesisId: insertedId, eventType: 'UPDATE', timestamp: new Date(now - 30 * dayMs), changes: JSON.stringify({ uncertainty: 'Very High', impact: 'Very High' }) },
    { hypothesisId: insertedId, eventType: 'UPDATE', timestamp: new Date(now - 20 * dayMs), changes: JSON.stringify({ uncertainty: 'High', impact: 'High' }) },
    { hypothesisId: insertedId, eventType: 'UPDATE', timestamp: new Date(now - 10 * dayMs), changes: JSON.stringify({ uncertainty: 'Medium', impact: 'High' }) },
  ];
}

function getTechnicalPlanningForPayment(insertedId, now, dayMs) {
  return [
    {
      hypothesisId: insertedId,
      entityRef: 'component:default/payment-service',
      actionType: 'Spike',
      description: 'Spike on idempotency and reconciliation with order-service.',
      expectedOutcome: 'Clear design for payment retries and order consistency.',
      documentations: JSON.stringify(['https://wiki.example.com/adr-001-payment-service', 'https://wiki.example.com/spike-payment-idempotency']),
      targetDate: new Date(now + 14 * dayMs),
    },
    {
      hypothesisId: insertedId,
      entityRef: 'component:default/payment-service',
      actionType: 'Experiment',
      description: 'Run a shadow payment path in parallel to validate latency and failure modes.',
      expectedOutcome: 'Metrics and runbook for production cutover.',
      documentations: JSON.stringify(['https://wiki.example.com/experiment-payment-shadow']),
      targetDate: new Date(now + 28 * dayMs),
    },
    {
      hypothesisId: insertedId,
      entityRef: 'component:default/order-service',
      actionType: 'Modularization',
      description: 'Extract payment orchestration into a dedicated module before moving to new service.',
      expectedOutcome: 'Clear boundary and contract for payment integration.',
      documentations: JSON.stringify(['https://wiki.example.com/order-payment-module']),
      targetDate: new Date(now + 21 * dayMs),
    },
  ];
}

function getEvolutionEventsForInventory(insertedId, now, dayMs) {
  return [
    { hypothesisId: insertedId, eventType: 'UPDATE', timestamp: new Date(now - 14 * dayMs), changes: JSON.stringify({ uncertainty: 'High', impact: 'Very High' }) },
    { hypothesisId: insertedId, eventType: 'UPDATE', timestamp: new Date(now - 7 * dayMs), changes: JSON.stringify({ uncertainty: 'High', impact: 'High' }) },
  ];
}

function getTechnicalPlanningForInventory(insertedId, now, dayMs) {
  return [
    {
      hypothesisId: insertedId,
      entityRef: 'component:default/legacy-inventory',
      actionType: 'Tracer Bullet',
      description: 'Implement read path to new inventory service alongside legacy.',
      expectedOutcome: 'Dual-read validation and latency comparison.',
      documentations: JSON.stringify(['https://wiki.example.com/inventory-migration']),
      targetDate: new Date(now + 7 * dayMs),
    },
    {
      hypothesisId: insertedId,
      entityRef: 'component:default/order-service',
      actionType: 'Trigger',
      description: 'Define migration trigger: switch write path after tracer bullet validation.',
      expectedOutcome: 'Go/no-go criteria and rollback plan.',
      documentations: JSON.stringify(['https://wiki.example.com/inventory-migration']),
      targetDate: new Date(now + 21 * dayMs),
    },
  ];
}

exports.up = async function up(knex) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const count = await knex('hypothesis').count('* as n').first();
  const hasExisting = count && Number(count.n) > 0;

  if (hasExisting) {
    // Backfill: add evolution events and technical planning for seed hypotheses that don't have them yet
    const paymentRow = await knex('hypothesis').where('statement', PAYMENT_STATEMENT).first();
    const inventoryRow = await knex('hypothesis').where('statement', INVENTORY_STATEMENT).first();
    if (paymentRow) {
      const paymentPlanCount = await knex('technicalPlanning').where('hypothesisId', paymentRow.id).count('* as n').first();
      if (Number(paymentPlanCount?.n ?? 0) === 0) {
        await knex('hypothesisEvents').insert(getEvolutionEventsForPayment(paymentRow.id, now, dayMs));
        await knex('technicalPlanning').insert(getTechnicalPlanningForPayment(paymentRow.id, now, dayMs));
      }
    }
    if (inventoryRow) {
      const inventoryPlanCount = await knex('technicalPlanning').where('hypothesisId', inventoryRow.id).count('* as n').first();
      if (Number(inventoryPlanCount?.n ?? 0) === 0) {
        await knex('hypothesisEvents').insert(getEvolutionEventsForInventory(inventoryRow.id, now, dayMs));
        await knex('technicalPlanning').insert(getTechnicalPlanningForInventory(inventoryRow.id, now, dayMs));
      }
    }
    if (hasExisting) return;
  }

  for (const row of SEED_HYPOTHESES) {
    const [inserted] = await knex('hypothesis').insert(row).returning('id');
    if (!inserted?.id) continue;

    await knex('hypothesisEvents').insert({
      hypothesisId: inserted.id,
      eventType: 'CREATE',
      changes: JSON.stringify(row),
    });

    if (row.statement === PAYMENT_STATEMENT) {
      await knex('hypothesisEvents').insert(getEvolutionEventsForPayment(inserted.id, now, dayMs));
      await knex('technicalPlanning').insert(getTechnicalPlanningForPayment(inserted.id, now, dayMs));
    }
    if (row.statement === INVENTORY_STATEMENT) {
      await knex('hypothesisEvents').insert(getEvolutionEventsForInventory(inserted.id, now, dayMs));
      await knex('technicalPlanning').insert(getTechnicalPlanningForInventory(inserted.id, now, dayMs));
    }
  }
};

/**
 * down() removes only rows that match the full seed record (all fields), so user-created
 * hypotheses with the same statement text are not deleted.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  const ids = [];
  for (const row of SEED_HYPOTHESES) {
    const matches = await knex('hypothesis').where(row).select('id');
    ids.push(...matches.map((r) => r.id));
  }
  if (ids.length === 0) return;
  await knex('hypothesisEvents').whereIn('hypothesisId', ids).del();
  await knex('technicalPlanning').whereIn('hypothesisId', ids).del();
  await knex('hypothesis').whereIn('id', ids).del();
};
