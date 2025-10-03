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
 * Quality attribute options
 */
export const QUALITY_ATTRIBUTE_OPTIONS: { value: QualityAttribute; label: string, description?: string }[] = [
  { value: 'Performance', label: 'Performance' },
  { value: 'Reliability', label: 'Reliability' },
  { value: 'Availability', label: 'Availability' },
  { value: 'Scalability', label: 'Scalability' },
  { value: 'Security', label: 'Security' },
  { value: 'Maintainability', label: 'Maintainability' },
  { value: 'Modifiability', label: 'Modifiability' },
  { value: 'Usability', label: 'Usability' },
  { value: 'Testability', label: 'Testability' },
  { value: 'Deployability', label: 'Deployability' },
  { value: 'Configurability', label: 'Configurability' },
  { value: 'Recoverability', label: 'Recoverability' },
  { value: 'Flexibility', label: 'Flexibility' },
  { value: 'Interoperability', label: 'Interoperability' },
  { value: 'Reusability', label: 'Reusability' },
  { value: 'Extensibility', label: 'Extensibility' },
  { value: 'Observability', label: 'Observability' },
  { value: 'Auditability', label: 'Auditability' },
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
