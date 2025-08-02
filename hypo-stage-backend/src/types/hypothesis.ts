import { z } from "zod";

export type FiveStarRating = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export type Status = 'Research' | 'In Progress' | 'Validated' | 'Planning' | 'Testing' | 'Completed';

export type Hypothesis = {
  entityRef: string;
  createdAt: Date;
  updatedAt: Date;
  id: string;
  text: string;
  uncertainty: FiveStarRating;
  impact: FiveStarRating;
  status: Status;
  technicalPlanning: string; // TODO associate with backstage docs
};

export interface HypothesisService {
  createHypothesis(input: {
    // Backstage entity reference pattern
    entityRef: string;
    // Hypothesis
    text: string;
    uncertainty: FiveStarRating;
    impact: FiveStarRating;
    technicalPlanning: string;
  }): Promise<Hypothesis>;

  getHypotheses(): Promise<Hypothesis[]>;
}

export const createHypothesisSchema = z.object({
  entityRef: z.string().min(1),
  text: z.string().min(20),
  uncertainty: z.enum(['Very Low', 'Low', 'Medium', 'High', 'Very High']),
  impact: z.enum(['Very Low', 'Low', 'Medium', 'High', 'Very High']),
  technicalPlanning: z.string().url().min(1),
});
