// @ts-check
/**
 * One pending plan suggestion and one completed agent run for the public demo.
 * Provider is "fixture": nothing here calls a model. Accepting the suggestion
 * still goes through the normal technical-planning API.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
const STATEMENT =
  'The new api-gateway can process at least 1000 requests per second while maintaining a latency under 200 milliseconds.';
const FIXTURE_SHA = 'demo-fixture';
const ARTIFACT_URL = 'https://github.com/ArchHypo/hypo-stage/pull/40';

exports.up = async function up(knex) {
  // Unit tests migrate a fresh database and assert on the rows they insert.
  if (process.env.NODE_ENV === 'test') return;

  const hypothesis = await knex('hypothesis').where('statement', STATEMENT).first('id');
  if (!hypothesis) return;
  const existing = await knex('agent_suggestions').where('head_sha', FIXTURE_SHA).first('id');
  if (existing) return;

  const [run] = await knex('agent_runs')
    .insert({
      repository: 'ArchHypo/hypo-stage',
      pr_number: 40,
      head_sha: FIXTURE_SHA,
      pr_url: ARTIFACT_URL,
      trigger_action: 'seed',
      model_key: 'demo',
      provider: 'fixture',
      status: 'completed',
      trace: JSON.stringify({
        steps: [{ step: 'fixture', durationMs: 0, details: { note: 'Sample data, not a model call' } }],
        suggestions: 1,
      }),
      started_at: knex.fn.now(),
      completed_at: knex.fn.now(),
      artifact_kind: 'pull_request',
      handler: 'pr_analysis',
      origin: 'human',
    })
    .returning('id');
  if (!run?.id) return;

  await knex('agent_suggestions').insert({
    run_id: run.id,
    hypothesis_id: hypothesis.id,
    kind: 'new_planning',
    payload: JSON.stringify({
      actionType: 'Spike',
      entityRef: 'component:default/api-gateway',
      description:
        'Load test the api-gateway at 1000 requests per second and confirm latency stays under 200 milliseconds.',
      expectedOutcome: 'A load-test report showing whether 1000 rps stays under 200 ms.',
      targetDate: '2026-12-15',
    }),
    rationale:
      'Sample suggestion for the public demo. Accepting it creates the spike through the normal technical-planning API. No model was called.',
    evidence: JSON.stringify([]),
    confidence: 0.9,
    artifact_ref: 'ArchHypo/hypo-stage#pull/40',
    artifact_url: ARTIFACT_URL,
    head_sha: FIXTURE_SHA,
    sources: JSON.stringify([{ artifactRef: 'ArchHypo/hypo-stage#pull/40', url: ARTIFACT_URL, kind: 'pull_request' }]),
    status: 'pending',
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex('agent_suggestions').where('head_sha', FIXTURE_SHA).del();
  await knex('agent_runs').where('head_sha', FIXTURE_SHA).del();
};
