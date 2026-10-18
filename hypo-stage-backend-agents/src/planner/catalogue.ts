/** ArchHypo technical plan catalogue, used in the planner prompt. */
export const ACTION_CATALOGUE = `Technical plan actions (ArchHypo) and the goals they usually serve:
- Experiment: customer surveys, A/B tests, fake door tests to validate requirements or compare alternatives. Goals: accept/refute, reduce uncertainty.
- Analytics: measurements from a running version or previous data (with projections) about a quality attribute. Goals: accept/refute, reduce uncertainty.
- Spike: a small, isolated technical experiment to prove feasibility or evaluate a property of a solution. Goal: reduce uncertainty.
- Tracer Bullet: an architecturally significant feature built end to end inside the real system to exercise the architecture. Goals: accept/refute, reduce uncertainty.
- Modularization: isolate the part affected by the uncertainty (modular structure, anti-corruption layer, aspects, dynamic proxies, interceptors) so it can be refactored or replaced. Goal: reduce impact.
- Trigger: an architectural trigger or agile landing zone, i.e. a condition on a quality attribute (e.g. number of simultaneous users) that tells when the hypothesis must be handled. Goal: define postponement criteria.
- Guideline: a small adjustment to the development process: include people with specific knowledge in an activity, retrieve information before an activity, test/validate after an activity, or constrain how an activity is executed (e.g. check cloud compatibility before adding a library). Goals: reduce uncertainty, reduce impact. It was the most used strategy in the ArchHypo evaluation.
- Other: flexible solutions such as cloud elasticity or self-adaptive architecture. Goal: reduce impact; usually costly.

Goals of a plan action:
- accept_or_refute: remove the uncertainty so the hypothesis can be accepted or refuted.
- reduce_uncertainty: obtain information that lets the team proceed with more confidence.
- reduce_impact: make a later change to another alternative cheaper.
- define_postponement_criteria: define when the hypothesis must be handled, postponing it to the most responsible moment.`;
