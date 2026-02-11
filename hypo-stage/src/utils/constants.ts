import { SourceType, QualityAttribute, ActionType, Status } from '@internal/plugin-hypo-stage-backend';

/**
 * Source type options
 */
export const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string, description?: string }[] = [
  { value: 'Requirements', label: 'Requirements', description: 'Requirements from the customer or the team' },
  { value: 'Solution', label: 'Solution', description: 'Solution from the team' },
  { value: 'Quality Attribute', label: 'Quality Attribute', description: 'Quality Attribute from the team' },
  { value: 'Other', label: 'Other', description: 'Other' },
];

/**
 * Quality attribute options: concept explanation plus examples in parentheses
 */
export const QUALITY_ATTRIBUTE_OPTIONS: { value: QualityAttribute; label: string; description?: string }[] = [
  { value: 'Performance', label: 'Performance (how fast and efficient the system is; e.g. response time, throughput, latency)' },
  { value: 'Reliability', label: 'Reliability (how consistently the system behaves correctly; e.g. correctness, fault tolerance)' },
  { value: 'Availability', label: 'Availability (how often the system is up and usable; e.g. uptime, fault recovery)' },
  { value: 'Scalability', label: 'Scalability (how well the system handles growth in load or data; e.g. horizontal/vertical scaling)' },
  { value: 'Security', label: 'Security (how well the system protects data and access; e.g. confidentiality, integrity, authentication)' },
  { value: 'Maintainability', label: 'Maintainability (how easy it is to change and fix the system over time; e.g. code clarity, ease of changes)' },
  { value: 'Modifiability', label: 'Modifiability (how easily the system can be changed with minimal side effects; e.g. change with minimal impact)' },
  { value: 'Usability', label: 'Usability (how easy and pleasant the system is for end users; e.g. ease of use, learnability)' },
  { value: 'Testability', label: 'Testability (how easy it is to verify behavior and find defects; e.g. verification, observability)' },
  { value: 'Deployability', label: 'Deployability (how easily and safely changes reach production; e.g. release frequency, rollback)' },
  { value: 'Configurability', label: 'Configurability (how much behavior can be changed without code changes; e.g. runtime/config)' },
  { value: 'Recoverability', label: 'Recoverability (how well the system restores after failure or data loss; e.g. restore after failure)' },
  { value: 'Flexibility', label: 'Flexibility (how well the system adapts to new scenarios or requirements; e.g. adaptability)' },
  { value: 'Interoperability', label: 'Interoperability (how well the system works with other systems and formats; e.g. integration)' },
  { value: 'Reusability', label: 'Reusability (how well parts of the system can be used in multiple contexts; e.g. reuse across features)' },
  { value: 'Extensibility', label: 'Extensibility (how easily new behavior can be added without breaking existing; e.g. add features)' },
  { value: 'Observability', label: 'Observability (how well internal state and behavior can be inferred from outside; e.g. monitoring, logging, tracing)' },
  { value: 'Auditability', label: 'Auditability (how well actions and data can be traced for compliance or review; e.g. audit trail)' },
];

/**
 * Action type options
 */
export const ACTION_TYPE_OPTIONS: { value: ActionType; label: string, description?: string }[] = [
  { value: 'Experiment', label: 'Experiment' },
  { value: 'Analytics', label: 'Analytics' },
  { value: 'Spike', label: 'Spike' },
  { value: 'Tracer Bullet', label: 'Tracer Bullet' },
  { value: 'Modularization', label: 'Modularization' },
  { value: 'Trigger', label: 'Trigger' },
  { value: 'Guideline', label: 'Guideline' },
  { value: 'Other', label: 'Other' },
];

/**
 * Status options
 */
export const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'Open', label: 'Open' },
  { value: 'In Review', label: 'In Review' },
  { value: 'Validated', label: 'Validated' },
  { value: 'Discarded', label: 'Discarded' },
  { value: 'Trigger-Fired', label: 'Trigger-Fired' },
  { value: 'Other', label: 'Other' },
];

/**
 * Likert scale options
 */
export const LIKERT_SCALE_OPTIONS = [
  { value: 1, label: 'Very Low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Very High' },
];
