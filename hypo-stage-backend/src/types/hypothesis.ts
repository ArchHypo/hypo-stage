import { z } from "zod";
import {
  createHypothesisSchema,
  likertScaleSchema,
  qualityAttributeSchema,
  sourceTypeSchema,
  statusSchema,
  technicalPlanningSchema,
  updateHypothesisSchema,
  actionTypeSchema
} from "../schemas/hypothesis";

export type Status = z.infer<typeof statusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type QualityAttribute = z.infer<typeof qualityAttributeSchema>;
export type LikertScale = z.infer<typeof likertScaleSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type TechnicalPlanning = z.infer<typeof technicalPlanningSchema>;

export type CreateHypothesisInput = z.infer<typeof createHypothesisSchema>;
export type UpdateHypothesisInput = z.infer<typeof updateHypothesisSchema>;

export type Hypothesis = {
  createdAt: Date;
  updatedAt: Date;
  id: string;
  status: Status;
  statement: string;
  sourceType: SourceType;
  relatedArtefacts: string[];
  qualityAttributes: QualityAttribute[];
  uncertainty: LikertScale;
  impact: LikertScale;
  technicalPlanning: TechnicalPlanning;
  notes: string | null;
};

export type CreateHypothesisEvent = {
  timestamp: Date;
  id: string;
  hypothesisId: string;
  eventType: "CREATE";
  changes: CreateHypothesisInput;
};

export type UpdateHypothesisEvent = {
  timestamp: Date;
  id: string;
  hypothesisId: string;
  eventType: "UPDATE";
  changes: UpdateHypothesisInput;
};

export type HypothesisEvent = CreateHypothesisEvent | UpdateHypothesisEvent;

export interface HypothesisService {
  create(input: CreateHypothesisInput): Promise<Hypothesis>;
  getAll(): Promise<Hypothesis[]>;
  update(id: string, input: UpdateHypothesisInput): Promise<Hypothesis>;
  getEvents(id: string): Promise<HypothesisEvent[]>;
}
