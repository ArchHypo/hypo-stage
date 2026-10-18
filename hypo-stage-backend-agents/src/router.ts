import express from 'express';
import Router from 'express-promise-router';
import type { Knex } from 'knex';
import type { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { AgentsConfig, findRepository } from './config';
import {
  decidePullRequestAction,
  GitHubPullRequestWebhook,
  normalizePullRequestEvent,
  verifyGitHubSignature,
} from './github/webhook';
import { z } from 'zod';
import { QUALITY_ATTRIBUTES, SOURCE_TYPES } from './domain/archhypo';
import { CoachTimeoutError, reviewHypothesis } from './coach/review';
import type { ModelRegistry } from './providers/models';
import {
  designPlan,
  HypothesisNotFoundError,
  HypothesisWithoutComponentsError,
  PlannerTimeoutError,
} from './planner/design';
import type { ComponentInfo } from './planner/prompts';
import { decidePlanAction } from './store/plans';
import type { EnqueueAnalyzePr, EnqueueIssue } from './queue/worker';
import { AUTOMATED_MARKER, GitHubIssueWebhook, routeIssueEvent } from './github/events';
import type { GitHubClient } from './github/client';
import { GitHubRequestError } from './github/client';
import { findLinkByIssue, findLinkByPlanning, listLinksForHypothesis, updateLinkState } from './store/issues';
import { listFindings } from './uncovered/run';
import { buildIssuesReport, reportToMarkdown } from './reports/issues';
import {
  openPlanIssue,
  PlanIssueExistsError,
  PlanningNotFoundError,
  RepositoryRequiredError,
} from './issues/planIssues';
import { getRunDetail, listRuns, listRunsForHypothesis, RUN_STATUSES, RunStatus } from './store/runs';
import {
  AgentSuggestion,
  listSuggestions,
  reviewSuggestion,
  SuggestionStatus,
  supersedePending,
} from './store/suggestions';

export const WEBHOOK_PATH = '/webhooks/github';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_STATUSES: SuggestionStatus[] = ['pending', 'accepted', 'rejected', 'superseded'];

export interface RouterOptions {
  knex: Knex;
  config: AgentsConfig;
  logger: LoggerService;
  httpAuth: HttpAuthService;
  models: ModelRegistry;
  /** Undefined when pg-boss is unavailable (non-Postgres database). */
  enqueueAnalyzePr?: EnqueueAnalyzePr;
  /** Coach reviews allowed per user within the rate limit window. */
  coachRateLimit?: { max: number; windowMs: number };
  /** Plan proposals allowed per user within the rate limit window. */
  plannerRateLimit?: { max: number; windowMs: number };
  describeComponents?: (entityRefs: string[]) => Promise<ComponentInfo[]>;
  /** Undefined when pg-boss is unavailable. */
  enqueueIssue?: EnqueueIssue;
  github?: GitHubClient;
  resolveEntityRepository?: (entityRef: string) => Promise<string | null>;
}

const PlanActionDecisionSchema = z.object({
  decision: z.enum(['added', 'edited', 'dismissed']),
  technicalPlanningId: z.string().regex(UUID_PATTERN).nullable().optional(),
});

const ReviewRequestSchema = z.object({
  statement: z.string().trim().min(20).max(500),
  sourceType: z.enum(SOURCE_TYPES).nullable().optional(),
  qualityAttributes: z.array(z.enum(QUALITY_ATTRIBUTES)).optional(),
  entityRefs: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  hypothesisId: z.string().regex(UUID_PATTERN).nullable().optional(),
  trigger: z.enum(['on_demand', 'save']),
});

/** Fixed-window in-memory limiter; good enough for a single backend instance. */
function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { knex, config, logger, httpAuth, enqueueAnalyzePr, models } = options;
  const router = Router();
  const allowReview = createRateLimiter(
    options.coachRateLimit ?? { max: 20, windowMs: 10 * 60_000 },
  );
  const allowPlan = createRateLimiter(
    options.plannerRateLimit ?? { max: 10, windowMs: 10 * 60_000 },
  );

  /**
   * Accepting a "completes" progress finishes the plan action, so its open plan issue is
   * closed too. Best effort: a GitHub failure never undoes the review. The acceptance is
   * already stored, so the resulting "closed" webhook is recognized as already completed.
   */
  async function closePlanIssueOnCompletion(
    suggestion: AgentSuggestion,
  ): Promise<{ number: number; closed: boolean; error?: string } | null> {
    if (
      suggestion.status !== 'accepted' ||
      suggestion.kind !== 'planning_progress' ||
      suggestion.payload.effect !== 'completes' ||
      !suggestion.technicalPlanningId ||
      !options.github
    ) {
      return null;
    }
    const link = await findLinkByPlanning(knex, suggestion.technicalPlanningId);
    if (!link || link.state !== 'open' || !findRepository(config, link.repository)?.issues.planIssues) {
      return null;
    }
    try {
      await options.github.closeIssue(
        link.repository,
        link.issueNumber,
        `Completed in HypoStage.\n\n${AUTOMATED_MARKER}`,
      );
      await updateLinkState(knex, link.technicalPlanningId, {
        state: 'closed',
        stateReason: 'completed',
        closedAt: new Date(),
      });
      return { number: link.issueNumber, closed: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Could not close plan issue after completion', { issue: link.issueNumber, error: message });
      return { number: link.issueNumber, closed: false, error: message };
    }
  }

  router.get('/agents/health', (_req, res) => {
    res.json({
      status: 'ok',
      enabled: config.enabled,
      queue: Boolean(enqueueAnalyzePr),
      coach: { enabled: config.coach.enabled, checkOnSave: config.coach.checkOnSave },
      planner: { enabled: config.planner.enabled },
      issues: {
        triage: config.repositories.some(r => r.issues.triage),
        planIssues: config.repositories.some(r => r.issues.planIssues),
      },
      coverage: { enabled: config.coverage.enabled },
    });
  });

  router.get('/agents/coverage/findings', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status && !['pending', 'created', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'status must be pending, created or dismissed' });
      return;
    }
    res.json(await listFindings(knex, { status }));
  });

  router.patch('/agents/coverage/findings/:id', express.json(), async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user'] });
    const status = req.body?.status;
    if (!UUID_PATTERN.test(req.params.id) || !['created', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'status must be created or dismissed' });
      return;
    }
    const updated = await knex('agent_coverage_findings')
      .where({ id: req.params.id, status: 'pending' })
      .update({ status });
    if (updated === 0) {
      res.status(404).json({ error: 'Pending finding not found' });
      return;
    }
    res.json({ id: req.params.id, status });
  });

  router.get('/agents/reports/issues', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(to.getTime() - 30 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      res.status(400).json({ error: 'from and to must be valid dates with from <= to' });
      return;
    }
    const repository = typeof req.query.repository === 'string' && req.query.repository ? req.query.repository : undefined;
    const report = await buildIssuesReport(knex, { from, to, repository });
    if (req.query.format === 'markdown') {
      res.type('text/markdown').send(reportToMarkdown(report));
      return;
    }
    res.json(report);
  });

  router.get('/agents/plannings/issues', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    const hypothesisId = String(req.query.hypothesisId ?? '');
    if (!UUID_PATTERN.test(hypothesisId)) {
      res.status(400).json({ error: 'hypothesisId must be a hypothesis id' });
      return;
    }
    res.json(await listLinksForHypothesis(knex, hypothesisId));
  });

  router.post('/agents/plannings/:id/issue', express.json(), async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(400).json({ error: 'Invalid technical planning id' });
      return;
    }
    if (!options.github || !config.repositories.some(r => r.issues.planIssues)) {
      res.status(404).json({ error: 'Opening plans as issues is not enabled' });
      return;
    }
    const repository = typeof req.body?.repository === 'string' ? req.body.repository : undefined;
    try {
      const link = await openPlanIssue(
        {
          knex,
          config,
          github: options.github,
          resolveEntityRepository: options.resolveEntityRepository ?? (async () => null),
        },
        req.params.id,
        credentials.principal.userEntityRef,
        repository,
      );
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof PlanningNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof PlanIssueExistsError) {
        res.status(409).json({ error: error.message, link: error.link });
      } else if (error instanceof RepositoryRequiredError) {
        res.status(422).json({ error: error.message, repositories: error.options });
      } else if (error instanceof GitHubRequestError) {
        res.status(error.status === 403 || error.status === 404 ? 403 : 502).json({
          error:
            error.status === 403 || error.status === 404
              ? 'GitHub refused to create the issue: the token needs issues: write on this repository'
              : error.message,
        });
      } else {
        throw error;
      }
    }
  });

  router.post('/agents/plan-proposals', express.json(), async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    if (!config.planner.enabled) {
      res.status(404).json({ error: 'Technical plan designer is disabled' });
      return;
    }
    const hypothesisId = req.body?.hypothesisId;
    if (typeof hypothesisId !== 'string' || !UUID_PATTERN.test(hypothesisId)) {
      res.status(400).json({ error: 'hypothesisId must be a hypothesis id' });
      return;
    }
    const user = credentials.principal.userEntityRef;
    if (!allowPlan(user)) {
      res.status(429).json({ error: 'Too many plan proposals, try again in a few minutes' });
      return;
    }
    try {
      res.json(
        await designPlan(
          { knex, logger, config, models, describeComponents: options.describeComponents },
          hypothesisId,
          user,
        ),
      );
    } catch (error) {
      if (error instanceof HypothesisNotFoundError) {
        res.status(404).json({ error: 'Hypothesis not found' });
      } else if (error instanceof HypothesisWithoutComponentsError) {
        res.status(422).json({ error: 'Add at least one entity reference to the hypothesis first' });
      } else if (error instanceof PlannerTimeoutError) {
        res.status(504).json({ error: 'The plan designer took too long to answer' });
      } else {
        res.status(502).json({ error: 'The plan designer model failed to answer' });
      }
    }
  });

  router.patch('/agents/plan-proposals/:id/actions/:index', express.json(), async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const index = Number(req.params.index);
    if (!UUID_PATTERN.test(req.params.id) || !Number.isInteger(index)) {
      res.status(400).json({ error: 'Invalid proposal id or action index' });
      return;
    }
    const parsed = PlanActionDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'decision must be added, edited or dismissed' });
      return;
    }
    const result = await decidePlanAction(knex, {
      proposalId: req.params.id,
      index,
      decision: parsed.data.decision,
      technicalPlanningId: parsed.data.technicalPlanningId ?? null,
      decidedBy: credentials.principal.userEntityRef,
    });
    if (result === 'not_found') {
      res.status(404).json({ error: 'Plan proposal action not found' });
      return;
    }
    if (result === 'conflict') {
      res.status(409).json({ error: 'This action already has a decision' });
      return;
    }
    res.json({ proposalId: req.params.id, index, decision: parsed.data.decision });
  });

  router.post('/agents/hypothesis-review', express.json(), async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    if (!config.coach.enabled) {
      res.status(404).json({ error: 'Hypothesis coach is disabled' });
      return;
    }
    const parsed = ReviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
      return;
    }
    const user = credentials.principal.userEntityRef;
    if (!allowReview(user)) {
      res.status(429).json({ error: 'Too many coach reviews, try again in a few minutes' });
      return;
    }
    const { trigger, ...input } = parsed.data;
    try {
      res.json(await reviewHypothesis({ knex, logger, config, models }, input, trigger, user));
    } catch (error) {
      if (error instanceof CoachTimeoutError) {
        res.status(504).json({ error: 'The coach took too long to answer' });
        return;
      }
      res.status(502).json({ error: 'The coach model failed to answer' });
    }
  });

  router.get('/hypotheses/:id/agent-suggestions', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(400).json({ error: 'Invalid hypothesis id' });
      return;
    }
    const status = req.query.status as SuggestionStatus | undefined;
    if (status && !LIST_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of ${LIST_STATUSES.join(', ')}` });
      return;
    }
    res.json(await listSuggestions(knex, req.params.id, status));
  });

  router.get('/hypotheses/:id/agent-runs', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(400).json({ error: 'Invalid hypothesis id' });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    res.json(await listRunsForHypothesis(knex, req.params.id, limit));
  });

  router.get('/agent-runs', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    const status = req.query.status as RunStatus | undefined;
    if (status && !RUN_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of ${RUN_STATUSES.join(', ')}` });
      return;
    }
    const offset = Number(req.query.offset ?? 0);
    if (!Number.isInteger(offset) || offset < 0) {
      res.status(400).json({ error: 'offset must be a non-negative integer' });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const repository = typeof req.query.repository === 'string' && req.query.repository
      ? req.query.repository
      : undefined;
    res.json(await listRuns(knex, { repository, status, limit, offset }));
  });

  router.get('/agent-runs/:id', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user', 'service'] });
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(400).json({ error: 'Invalid run id' });
      return;
    }
    const run = await getRunDetail(knex, req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Agent run not found' });
      return;
    }
    res.json(run);
  });

  // Only records the review; the frontend applies accepted suggestions through the
  // hypo-stage backend API so validation and hypothesis events stay consistent.
  router.patch('/agent-suggestions/:id', express.json(), async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(400).json({ error: 'Invalid suggestion id' });
      return;
    }
    const status = req.body?.status;
    if (status !== 'accepted' && status !== 'rejected') {
      res.status(400).json({ error: 'status must be accepted or rejected' });
      return;
    }
    const result = await reviewSuggestion(
      knex,
      req.params.id,
      status,
      credentials.principal.userEntityRef,
    );
    if (result === null) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }
    if (result === 'conflict') {
      res.status(409).json({ error: 'Suggestion is no longer pending' });
      return;
    }
    res.json({ ...result, issueClose: await closePlanIssueOnCompletion(result) });
  });

  // Unauthenticated (see the auth policy in plugin.ts); protected by the HMAC signature.
  router.post(WEBHOOK_PATH, express.raw({ type: '*/*', limit: '5mb' }), async (req, res) => {
    const secret = config.github.webhookSecret;
    if (!secret) {
      res.status(500).json({ error: 'hypoStage.github.webhookSecret is not configured' });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      logger.error('GitHub webhook body was parsed before signature verification');
      res.status(500).json({ error: 'Webhook body unavailable for signature verification' });
      return;
    }
    if (!verifyGitHubSignature(req.body, req.header('x-hub-signature-256'), secret)) {
      res.status(401).json({ error: 'Invalid GitHub webhook signature' });
      return;
    }

    const eventType = req.header('x-github-event') ?? 'unknown';
    if (eventType === 'ping') {
      res.status(200).json({ received: true, event: 'ping' });
      return;
    }
    if (eventType === 'issues' || eventType === 'issue_comment') {
      let issuePayload: GitHubIssueWebhook;
      try {
        issuePayload = JSON.parse(req.body.toString('utf8'));
      } catch {
        res.status(400).json({ error: 'Webhook payload must be JSON (content type application/json)' });
        return;
      }
      const routed = await routeIssueEvent({
        eventName: eventType,
        payload: issuePayload,
        deliveryId: req.header('x-github-delivery') ?? null,
        config,
        findPlanningForIssue: async (repository, number) =>
          (await findLinkByIssue(knex, repository, number))?.technicalPlanningId ?? null,
      });
      if (routed.route === 'ignore') {
        res.status(202).json({ received: true, queued: false, reason: routed.reason });
        return;
      }
      if (!options.enqueueIssue) {
        res.status(503).json({ error: 'HypoStage agents require a PostgreSQL database (pg-boss)' });
        return;
      }
      const issueJobId = await options.enqueueIssue(
        routed.route === 'issue_triage'
          ? { handler: 'issue_triage', issue: routed.issue }
          : { handler: routed.route, issue: routed.issue, planningId: routed.planningId },
      );
      logger.info('Queued issue event', { route: routed.route, artifactRef: routed.issue.artifactRef, jobId: issueJobId });
      res.status(202).json({ received: true, queued: issueJobId !== null, route: routed.route, jobId: issueJobId });
      return;
    }
    if (eventType !== 'pull_request') {
      res.status(202).json({ received: true, queued: false, reason: `ignored event '${eventType}'` });
      return;
    }

    let payload: GitHubPullRequestWebhook;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch {
      res.status(400).json({ error: 'Webhook payload must be JSON (content type application/json)' });
      return;
    }

    const event = normalizePullRequestEvent(payload, req.header('x-github-delivery') ?? null);
    if (!event) {
      res.status(400).json({ error: 'Pull request payload is missing repository, number or url' });
      return;
    }

    if (!config.enabled || !findRepository(config, event.repository)) {
      res.status(202).json({
        received: true,
        queued: false,
        reason: config.enabled ? 'repository not configured' : 'agents disabled',
      });
      return;
    }

    const decision = decidePullRequestAction(payload);
    if (decision.kind === 'supersede') {
      const superseded = await supersedePending(knex, event.artifactRef);
      res.status(202).json({ received: true, queued: false, superseded });
      return;
    }
    if (decision.kind === 'ignore') {
      res.status(202).json({ received: true, queued: false, reason: decision.reason });
      return;
    }

    if (!enqueueAnalyzePr) {
      res.status(503).json({ error: 'HypoStage agents require a PostgreSQL database (pg-boss)' });
      return;
    }

    const jobId = await enqueueAnalyzePr({ event });
    logger.info('Queued pull request analysis', {
      artifactRef: event.artifactRef,
      action: event.action,
      jobId,
    });
    res.status(202).json({
      received: true,
      queued: jobId !== null,
      jobId,
      ...(jobId === null ? { reason: 'an analysis for this commit is already queued' } : {}),
    });
  });

  return router;
}
