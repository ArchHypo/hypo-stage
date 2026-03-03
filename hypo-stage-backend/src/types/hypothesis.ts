import { z } from "zod";
import {
  createHypothesisSchema,
  likertScaleSchema,
  qualityAttributeSchema,
  sourceTypeSchema,
  statusSchema,
  createTechnicalPlanningSchema,
  updateHypothesisSchema,
  actionTypeSchema,
  updateTechnicalPlanningSchema
} from "../schemas/hypothesis";

export type Status = z.infer<typeof statusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type QualityAttribute = z.infer<typeof qualityAttributeSchema>;
export type LikertScale = z.infer<typeof likertScaleSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;

export type CreateHypothesisInput = z.infer<typeof createHypothesisSchema>;
export type UpdateHypothesisInput = z.infer<typeof updateHypothesisSchema>;

export type CreateTechnicalPlanningInput = z.infer<typeof createTechnicalPlanningSchema>;
export type UpdateTechnicalPlanningInput = z.infer<typeof updateTechnicalPlanningSchema>;

export type Hypothesis = {
  createdAt: Date;
  updatedAt: Date;
  id: string;
  entityRefs: string[];
  status: Status;
  statement: string;
  sourceType: SourceType;
  relatedArtefacts: string[];
  qualityAttributes: QualityAttribute[];
  uncertainty: LikertScale;
  impact: LikertScale;
  technicalPlannings: TechnicalPlanning[];
  notes: string | null;
};

export type TechnicalPlanning = {
  createdAt: Date;
  updatedAt: Date;
  id: string;
  entityRef: string;
  actionType: ActionType;
  description: string;
  expectedOutcome: string;
  documentations: string[];
  targetDate: Date;
}

export type BaseHypothesisEvent = {
  timestamp: Date;
  id: string;
  hypothesisId: string;
  technicalPlanningId?: string | null;
};

export type CreateHypothesisEvent = BaseHypothesisEvent & {
  eventType: "CREATE";
  changes: CreateHypothesisInput;
};

export type UpdateHypothesisEvent = BaseHypothesisEvent & {
  eventType: "UPDATE";
  changes: UpdateHypothesisInput;
};

export type TechnicalPlanningCreateEvent = BaseHypothesisEvent & {
  eventType: "TECHNICAL_PLANNING_CREATE";
  changes: { uncertainty?: LikertScale; impact?: LikertScale };
};

export type TechnicalPlanningUpdateEvent = BaseHypothesisEvent & {
  eventType: "TECHNICAL_PLANNING_UPDATE";
  changes: { uncertainty?: LikertScale; impact?: LikertScale };
};

export type HypothesisEvent =
  | CreateHypothesisEvent
  | UpdateHypothesisEvent
  | TechnicalPlanningCreateEvent
  | TechnicalPlanningUpdateEvent;

export interface HypothesisService {
  create(input: CreateHypothesisInput): Promise<Hypothesis>;
  getAll(): Promise<Hypothesis[]>;
  getById(id: string): Promise<Hypothesis>;
  update(id: string, input: UpdateHypothesisInput): Promise<Hypothesis>;
  getEvents(id: string): Promise<HypothesisEvent[]>;
  deleteHypothesis(id: string): Promise<void>;
  createTechnicalPlanning(hypothesisId: string, input: CreateTechnicalPlanningInput): Promise<TechnicalPlanning>;
  updateTechnicalPlanning(hypothesisId: string, input: UpdateTechnicalPlanningInput): Promise<TechnicalPlanning>;
  deleteTechnicalPlanning(id: string): Promise<void>;
}
