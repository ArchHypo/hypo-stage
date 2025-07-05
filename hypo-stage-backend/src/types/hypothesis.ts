import { z } from "zod";

export type FiveStarRating = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export type Status = 'Research' | 'In Progress' | 'Validated' | 'Planning' | 'Testing' | 'Completed';

export type TechnicalPlanning = 'Architectural Spike' | 'Tracer Bullet' | 'Software Analytics';

export type Hypothesis = {
  createdAt: Date;
  updatedAt: Date;
  id: string;
  title: string;
  description: string;
  uncertainty: FiveStarRating;
  impact: FiveStarRating;
  technicalPlanning: TechnicalPlanning;
  status: Status;
  owner: string; // TODO associate with backstage entities
};

export interface HypothesisService {
  createHypothesis(input: {
    // Backstage entity reference pattern
    entityRef?: string;
    // Hypothesis
    title: string;
    description: string;
    uncertainty: FiveStarRating;
    impact: FiveStarRating;
    technicalPlanning: TechnicalPlanning;
  }): Promise<Hypothesis>;

  getHypotheses(): Promise<Hypothesis[]>;
  getHypothesis(id: string): Promise<Hypothesis>;
}

export const createHypothesisSchema = z.object({
  title: z.string(),
  description: z.string(),
  uncertainty: z.enum(['Very Low', 'Low', 'Medium', 'High', 'Very High']),
  impact: z.enum(['Very Low', 'Low', 'Medium', 'High', 'Very High']),
  technicalPlanning: z.enum(['Architectural Spike', 'Tracer Bullet', 'Software Analytics']),
});
